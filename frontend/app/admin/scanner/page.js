'use client'
import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

// IP Raspberry Pi kamu (hasil `hostname -I` di Pi)
const PI_STREAM_URL = 'http://smartport.local:5000'

export default function GateScannerPage() {
  const imgRef = useRef(null)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [rawText, setRawText] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [ocrProgress, setOcrProgress] = useState('')

  // Kotak hasil deteksi YOLO, buat visual feedback di atas video
  const [detectedBox, setDetectedBox] = useState(null)

  // Trik biar <img> stream bisa di-"restart" (misal kalau mau reconnect)
  const [streamKey, setStreamKey] = useState(Date.now())

  useEffect(() => {
    startCamera()
  }, [])

  const startCamera = () => {
    setCameraError('')
    setStreamKey(Date.now())
    setIsCameraOn(true)
  }

  const stopCamera = () => {
    setIsCameraOn(false)
    setDetectedBox(null)
  }

  const handleStreamError = () => {
    setCameraError(
      `Gagal konek ke stream Pi di ${PI_STREAM_URL}/video_feed. Pastikan stream.py sudah jalan di Pi dan IP-nya benar.`
    )
    setIsCameraOn(false)
  }

  const handleStreamLoad = () => {
    setCameraError('')
  }

  const isValidIndonesianPlate = (plate) => {
    const pattern = /^[A-Z]{1,2}\d{1,4}[A-Z]{1,3}$/
    return pattern.test(plate)
  }

  // --- LOGIKA SCAN: sekarang cukup panggil /detect_plate di Pi (YOLO + OCR   ---
  // --- jalan di Python/server, browser tinggal terima hasilnya).            ---
  const handleScan = async () => {
    if (!isCameraOn) {
      alert('Stream kamera Pi belum aktif!')
      return
    }

    setScanning(true)
    setResult(null)
    setRawText('')
    setDetectedBox(null)
    setOcrProgress('Mendeteksi plat via YOLO di Raspberry Pi...')

    try {
      const { data } = await axios.get(`${PI_STREAM_URL}/detect_plate`, { timeout: 15000 })

      if (!data.success) {
        setResult({ allowed: false, message: data.message || 'Gagal menghubungi kamera Pi.' })
        return
      }

      if (data.box) {
        setDetectedBox({
          x1: data.box.x1, y1: data.box.y1, x2: data.box.x2, y2: data.box.y2,
          frameWidth: data.frame_width, frameHeight: data.frame_height,
        })
      }

      const plate = data.plate

      if (!plate) {
        setResult({
          allowed: false,
          message: data.message || 'Plat nomor tidak terdeteksi. Pastikan plat terlihat jelas di kamera.'
        })
        return
      }

      setRawText(plate)

      if (!isValidIndonesianPlate(plate)) {
        setResult({
          allowed: false,
          message: `Format tidak valid: "${plate}". Pastikan format plat Indonesia (contoh: B 1234 AB).`
        })
        return
      }

      setOcrProgress('Memverifikasi ke server...')
      const res = await axios.post(`${API_URL}/gate/verify`, { plate_number: plate })

      if (res.data.success) {
  setResult({
    allowed: res.data.allowed,
    message: res.data.message,
    ticket_info: res.data.ticket_info
  })

  // Kalau valid, suruh Pi buka palang
  if (res.data.allowed) {
    axios.post(`${PI_STREAM_URL}/gate/open`).catch(err => {
      console.error('Gagal buka palang:', err)
    })
  }
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
    setOcrProgress('')
    setDetectedBox(null)
  }

  // --- RENDER UI ---
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e', marginBottom: '8px' }}>
          🚦 Pemindai Gerbang (Live dari Raspberry Pi)
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Stream langsung dari kamera Pi. <strong>Klik "Pindai Otomatis"</strong> — deteksi & pembacaan
          plat dilakukan oleh YOLO + OCR langsung di Raspberry Pi, browser tinggal menampilkan hasilnya.
        </p>
      </div>

      {cameraError && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
          ⚠️ {cameraError}
          <button onClick={startCamera} style={{ marginLeft: '10px', padding: '6px 12px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

        {/* Kiri: Kamera */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>Kamera Langsung (Pi)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', background: isCameraOn ? '#dcfce7' : '#fee2e2', color: isCameraOn ? '#166534' : '#b91c1c' }}>
                {isCameraOn ? '● AKTIF' : '○ MATI'}
              </span>
              <button onClick={isCameraOn ? stopCamera : startCamera} style={{ padding: '4px 12px', background: isCameraOn ? '#ef4444' : '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                {isCameraOn ? 'Berhenti' : 'Mulai'}
              </button>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '4/3',
            }}
          >
            {isCameraOn && (
              <img
                key={streamKey}
                ref={imgRef}
                src={`${PI_STREAM_URL}/video_feed`}
                onError={handleStreamError}
                onLoad={handleStreamLoad}
                alt="Live stream Pi"
                style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              />
            )}

            {detectedBox && (
              <div style={{
                position: 'absolute',
                left: `${(detectedBox.x1 / detectedBox.frameWidth) * 100}%`,
                top: `${(detectedBox.y1 / detectedBox.frameHeight) * 100}%`,
                width: `${((detectedBox.x2 - detectedBox.x1) / detectedBox.frameWidth) * 100}%`,
                height: `${((detectedBox.y2 - detectedBox.y1) / detectedBox.frameHeight) * 100}%`,
                border: '2px solid #22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                pointerEvents: 'none'
              }} />
            )}

            {!isCameraOn && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '14px' }}>
                Stream mati. Klik "Mulai" untuk nyalakan.
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
              disabled={scanning || !isCameraOn}
              style={{ flex: 1, padding: '12px', background: (scanning || !isCameraOn) ? '#94a3b8' : '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: (scanning || !isCameraOn) ? 'not-allowed' : 'pointer' }}
            >
              {scanning ? `⏳ ${ocrProgress || 'Memproses...'}` : '🤖 Pindai Otomatis'}
            </button>
            <button
              onClick={handleReset}
              style={{ padding: '12px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              Atur ulang
            </button>
          </div>
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