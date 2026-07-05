'use client'
import { useState, useRef, useEffect } from 'react'
import Tesseract from 'tesseract.js'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function GateScannerPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const streamRef = useRef(null)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [rawText, setRawText] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [ocrProgress, setOcrProgress] = useState('')
  const [previewSrc, setPreviewSrc] = useState(null)

  // State untuk Bounding Box
  const [isDrawing, setIsDrawing] = useState(false)
  const [box, setBox] = useState(null)
  const [tempBox, setTempBox] = useState(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      setCameraError('')
      if (streamRef.current) stopCamera()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      console.error('Gagal akses kamera:', err)
      setCameraError('Gagal mengakses kamera: ' + err.message)
      setIsCameraOn(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOn(false)
    setBox(null)
  }

  // --- LOGIKA BOUNDING BOX ---
  const handleMouseDown = (e) => {
    if (!isCameraOn) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setIsDrawing(true)
    setTempBox({ x1: x, y1: y, x2: x, y2: y })
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setTempBox(prev => ({ ...prev, x2: x, y2: y }))
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const rect = containerRef.current.getBoundingClientRect()
    const video = videoRef.current

    const scaleX = video.videoWidth / rect.width
    const scaleY = video.videoHeight / rect.height

    const x1 = Math.min(tempBox.x1, tempBox.x2) * scaleX
    const y1 = Math.min(tempBox.y1, tempBox.y2) * scaleY
    const x2 = Math.max(tempBox.x1, tempBox.x2) * scaleX
    const y2 = Math.max(tempBox.y1, tempBox.y2) * scaleY

    if (Math.abs(x2 - x1) > 20 && Math.abs(y2 - y1) > 10) {
      setBox({ x1, y1, x2, y2 })
    }
    setTempBox(null)
  }

  const clearBox = () => setBox(null)

  // --- PREPROCESSING YANG DIPERBAIKI ---
  const upscaleCanvas = (srcCanvas, scale = 3) => {
    const dst = document.createElement('canvas')
    dst.width = srcCanvas.width * scale
    dst.height = srcCanvas.height * scale
    const ctx = dst.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(srcCanvas, 0, 0, dst.width, dst.height)
    return dst
  }

  const toGrayscale = (imageData) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = lum
      data[i + 1] = lum
      data[i + 2] = lum
    }
    return imageData
  }

  const adaptiveThreshold = (imageData) => {
    const data = imageData.data
    let totalBrightness = 0
    const pixelCount = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += data[i]
    }
    const avgBrightness = totalBrightness / pixelCount
    const threshold = avgBrightness * 0.85

    console.log(`Avg brightness: ${avgBrightness.toFixed(1)}, Threshold: ${threshold.toFixed(1)}`)

    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] > threshold ? 255 : 0
      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
    }
    return imageData
  }

  const enhanceContrast = (imageData, factor = 1.5) => {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128))
      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
    }
    return imageData
  }

  const preprocessImage = (canvas) => {
    const ctx = canvas.getContext('2d')
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    imageData = toGrayscale(imageData)
    imageData = enhanceContrast(imageData, 1.8)
    imageData = adaptiveThreshold(imageData)

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  // --- FUNGSI VALIDASI & CLEANING OCR ---
  
  /**
   * Validasi format plat nomor Indonesia
   * Format: 1-2 huruf + 1-4 angka + 1-3 huruf
   * Contoh: B 1234 AB, BP 2112 BE, D 123 ABC
   */
  const isValidIndonesianPlate = (plate) => {
    const pattern = /^[A-Z]{1,2}\d{1,4}[A-Z]{1,3}$/
    return pattern.test(plate)
  }

  /**
   * Membersihkan hasil OCR dari Tesseract
   * - Hapus karakter berulang di akhir (common error)
   * - Hapus karakter yang mencurigakan
   */
  const cleanOCRResult = (text) => {
    // Hapus semua yang bukan huruf/angka, jadi uppercase
    let cleaned = text.replace(/[^A-Z0-9]/g, '').trim().toUpperCase()
    
    console.log('Before cleaning:', cleaned)
    
    // 1. Hapus karakter berulang di akhir (common Tesseract error)
    // Contoh: BP2112BEB → BP2112BE
    while (cleaned.length > 4) {
      const lastChar = cleaned[cleaned.length - 1]
      const secondLastChar = cleaned[cleaned.length - 2]
      
      // Jika 2 karakter terakhir sama, hapus yang terakhir
      if (lastChar === secondLastChar) {
        cleaned = cleaned.slice(0, -1)
        console.log('Removed duplicate:', cleaned)
      } else {
        break
      }
    }
    
    // 2. Hapus karakter yang tidak masuk akal di akhir
    // Contoh: jika diakhiri dengan angka setelah huruf (BP2112BE5 → BP2112BE)
    if (cleaned.length > 4) {
      const lastChar = cleaned[cleaned.length - 1]
      const secondLastChar = cleaned[cleaned.length - 2]
      
      // Jika huruf diikuti angka di akhir, hapus angka
      if (/[A-Z]/.test(secondLastChar) && /\d/.test(lastChar)) {
        cleaned = cleaned.slice(0, -1)
        console.log('Removed trailing number:', cleaned)
      }
    }
    
    // 3. Validasi panjang - plat nomor Indonesia biasanya 5-9 karakter
    if (cleaned.length < 5 || cleaned.length > 9) {
      console.log('Warning: Unusual plate length:', cleaned.length)
    }
    
    console.log('After cleaning:', cleaned)
    return cleaned
  }

  // --- LOGIKA SCAN & OCR ---
  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('Kamera tidak aktif!')
      return
    }
    if (!box) {
      alert('Silakan buat kotak (drag mouse) di area plat nomor terlebih dahulu!')
      return
    }

    setScanning(true)
    setResult(null)
    setRawText('')
    setOcrProgress('Mengambil frame kamera...')
    setPreviewSrc(null)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      // 1. Ambil frame penuh dari video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 2. Crop area bounding box
      const cropWidth = box.x2 - box.x1
      const cropHeight = box.y2 - box.y1
      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = cropWidth
      cropCanvas.height = cropHeight
      const cropCtx = cropCanvas.getContext('2d')
      cropCtx.drawImage(canvas, box.x1, box.y1, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

      // 3. Upscale 3x sebelum preprocessing
      setOcrProgress('Upscaling gambar...')
      const upscaledCanvas = upscaleCanvas(cropCanvas, 3)

      // 4. Preprocessing
      setOcrProgress('Memproses gambar...')
      preprocessImage(upscaledCanvas)

      // 5. Simpan preview
      setPreviewSrc(upscaledCanvas.toDataURL('image/png'))

      // 6. Jalankan Tesseract OCR
      setOcrProgress('Menjalankan OCR...')
      const { data: { text, confidence } } = await Tesseract.recognize(
        upscaledCanvas,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(`OCR: ${Math.round(m.progress * 100)}%`)
            }
          },
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          tessedit_pageseg_mode: '8',
          tessedit_ocr_engine_mode: '1',
        }
      )

      // 7. Bersihkan dan validasi hasil OCR
      const rawOCRText = text
      const cleanedPlate = cleanOCRResult(rawOCRText)
      setRawText(cleanedPlate)
      setOcrProgress('')

      console.log('=== OCR RESULTS ===')
      console.log('Raw text:', rawOCRText)
      console.log('Cleaned plate:', cleanedPlate)
      console.log('Confidence:', confidence)
      console.log('Is valid:', isValidIndonesianPlate(cleanedPlate))
      console.log('===================')

      // 8. Validasi hasil
      if (cleanedPlate.length < 4) {
        setResult({
          allowed: false,
          message: `Teks terlalu pendek: "${cleanedPlate || 'kosong'}". Pastikan plat nomor terlihat jelas dan kotak cukup besar.`
        })
        return
      }

      // Validasi format plat nomor Indonesia
      if (!isValidIndonesianPlate(cleanedPlate)) {
        setResult({
          allowed: false,
          message: `Format tidak valid: "${cleanedPlate}". Pastikan format plat Indonesia (contoh: B 1234 AB atau BP 2112 BE). Hasil mentah OCR: "${rawOCRText.trim()}"`
        })
        return
      }

      // Cek confidence
      if (confidence < 40) {
        setResult({
          allowed: false,
          message: `Confidence rendah (${Math.round(confidence)}%). Hasil: "${cleanedPlate}". Coba perbaiki pencahayaan atau scan ulang.`
        })
        return
      }

      // 9. Kirim ke backend
      setOcrProgress('Memverifikasi ke server...')
      const res = await axios.post(`${API_URL}/gate/verify`, { plate_number: cleanedPlate })

      if (res.data.success) {
        setResult({
          allowed: res.data.allowed,
          message: res.data.message,
          ticket_info: res.data.ticket_info
        })
      }

    } catch (err) {
      console.error('Error scanning:', err)
      setResult({
        allowed: false,
        message: `Gagal memproses: ${err.message}`
      })
    } finally {
      setScanning(false)
      setOcrProgress('')
    }
  }

  const handleReset = () => {
    setResult(null)
    setRawText('')
    setPreviewSrc(null)
    setOcrProgress('')
  }

  // --- RENDER UI ---
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e', marginBottom: '8px' }}>
          🚦 Gate Scanner (Simulasi IoT)
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Arahkan kamera ke plat nomor. <strong>Klik dan drag mouse</strong> pada area plat untuk membuat kotak scan.
        </p>
      </div>

      {cameraError && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
          ⚠️ {cameraError}
          <button onClick={startCamera} style={{ marginLeft: '10px', padding: '6px 12px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

        {/* Kiri: Kamera & Bounding Box */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>Live Camera</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', background: isCameraOn ? '#dcfce7' : '#fee2e2', color: isCameraOn ? '#166534' : '#b91c1c' }}>
                {isCameraOn ? '● ON' : '○ OFF'}
              </span>
              <button onClick={isCameraOn ? stopCamera : startCamera} style={{ padding: '4px 12px', background: isCameraOn ? '#ef4444' : '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                {isCameraOn ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: 'relative',
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '4/3',
              cursor: isCameraOn ? 'crosshair' : 'not-allowed',
              userSelect: 'none'
            }}
          >
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {tempBox && isDrawing && containerRef.current && (
              <div style={{
                position: 'absolute',
                left: `${(Math.min(tempBox.x1, tempBox.x2) / containerRef.current.getBoundingClientRect().width) * 100}%`,
                top: `${(Math.min(tempBox.y1, tempBox.y2) / containerRef.current.getBoundingClientRect().height) * 100}%`,
                width: `${(Math.abs(tempBox.x2 - tempBox.x1) / containerRef.current.getBoundingClientRect().width) * 100}%`,
                height: `${(Math.abs(tempBox.y2 - tempBox.y1) / containerRef.current.getBoundingClientRect().height) * 100}%`,
                border: '2px dashed #0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.2)',
                pointerEvents: 'none'
              }} />
            )}

            {box && !isDrawing && videoRef.current && containerRef.current && (
              <div style={{
                position: 'absolute',
                left: `${(box.x1 / videoRef.current.videoWidth) * 100}%`,
                top: `${(box.y1 / videoRef.current.videoHeight) * 100}%`,
                width: `${((box.x2 - box.x1) / videoRef.current.videoWidth) * 100}%`,
                height: `${((box.y2 - box.y1) / videoRef.current.videoHeight) * 100}%`,
                border: '2px solid #22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                pointerEvents: 'none'
              }} />
            )}

            {!isCameraOn && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '14px' }}>
                Kamera mati. Klik "Start" untuk nyalakan.
              </div>
            )}

            {scanning && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '14px', gap: '8px' }}>
                <div style={{ fontSize: '28px' }}>⏳</div>
                <p style={{ margin: 0, fontWeight: '600' }}>{ocrProgress || 'Memproses...'}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleScan}
              disabled={scanning || !isCameraOn || !box}
              style={{ flex: 1, padding: '12px', background: (scanning || !isCameraOn || !box) ? '#94a3b8' : '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: (scanning || !isCameraOn || !box) ? 'not-allowed' : 'pointer' }}
            >
              {scanning ? `⏳ ${ocrProgress || 'Memproses...'}` : '📸 Scan Plat Nomor'}
            </button>
            <button
              onClick={clearBox}
              disabled={!box}
              style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: !box ? 'not-allowed' : 'pointer' }}
            >
              Hapus Kotak
            </button>
            <button
              onClick={handleReset}
              style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>

          {previewSrc && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>🔍 Preview gambar yang diproses OCR:</p>
              <img
                src={previewSrc}
                alt="OCR Preview"
                style={{ width: '100%', borderRadius: '6px', border: '1px solid #e2e8f0', imageRendering: 'pixelated' }}
              />
            </div>
          )}
        </div>

        {/* Kanan: Hasil */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e', marginBottom: '16px' }}>Hasil Verifikasi</h3>

          {!result ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
              <p>Belum ada hasil scan</p>
              {ocrProgress && !scanning && (
                <p style={{ fontSize: '13px', color: '#64748b' }}>{ocrProgress}</p>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                padding: '20px',
                borderRadius: '10px',
                textAlign: 'center',
                marginBottom: '16px',
                background: result.allowed ? '#dcfce7' : '#fee2e2',
                border: `2px solid ${result.allowed ? '#22c55e' : '#ef4444'}`
              }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {result.allowed ? '✅' : '❌'}
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: '700', color: result.allowed ? '#166534' : '#991b1b', margin: '0 0 8px 0' }}>
                  {result.allowed ? 'PALANG TERBUKA' : 'AKSES DITOLAK'}
                </h4>
                <p style={{ fontSize: '14px', color: result.allowed ? '#166534' : '#991b1b', margin: 0 }}>
                  {result.message}
                </p>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Plat Terbaca OCR:</strong> {rawText || '-'}</p>
                {result.ticket_info && (
                  <>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Kapal:</strong> {result.ticket_info.kapal}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Rute:</strong> {result.ticket_info.rute}</p>
                    <p style={{ margin: 0 }}><strong>Waktu Berangkat:</strong> {result.ticket_info.waktu_berangkat}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}