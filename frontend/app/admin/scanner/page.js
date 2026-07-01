'use client'
import { useState, useRef, useEffect } from 'react'
import Tesseract from 'tesseract.js'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function GateScannerPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null) 
  const [rawText, setRawText] = useState('') 

  // Nyalakan webcam saat halaman dibuka
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      console.error('Gagal akses kamera:', err)
      alert('Gagal mengakses kamera. Pastikan izin kamera diberikan!')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      setIsCameraOn(false)
    }
  }

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setScanning(true)
    setResult(null)
    setRawText('')

    try {
      // 1. Ambil frame dari video ke canvas
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 2. Proses OCR dengan Tesseract
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
        logger: m => console.log(m) 
      })

      // 3. Bersihkan teks (Hanya ambil huruf & angka, jadi uppercase)
      const cleanPlate = text.replace(/[^A-Z0-9]/g, '').trim().toUpperCase()
      setRawText(cleanPlate)

      if (cleanPlate.length < 4) {
        setResult({ allowed: false, message: 'Plat nomor tidak terbaca jelas. Pastikan pencahayaan terang dan plat tidak blur.' })
        return
      }

      // 4. Kirim ke Backend untuk verifikasi (Aturan 2 Jam)
      const res = await axios.post(`${API_URL}/gate/verify`, { plate_number: cleanPlate })
      
      if (res.data.success) {
        setResult({
          allowed: res.data.allowed,
          message: res.data.message,
          ticket_info: res.data.ticket_info
        })
      }

    } catch (err) {
      console.error('Error scanning:', err)
      setResult({ allowed: false, message: 'Gagal memproses gambar atau server error.' })
    } finally {
      setScanning(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setRawText('')
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e', marginBottom: '8px' }}>
          🚦 Gate Scanner (Simulasi IoT)
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Arahkan kamera ke plat nomor kendaraan miniatur untuk verifikasi tiket otomatis.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Kiri: Kamera */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e', marginBottom: '16px' }}>Live Camera</h3>
          
          <div style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden', aspectRatio: '4/3' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Overlay Garis Scan */}
            {!scanning && !result && (
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '70%', height: '25%',
                border: '2px dashed rgba(255,255,255,0.8)',
                borderRadius: '8px',
                pointerEvents: 'none'
              }}></div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button 
              onClick={handleScan} 
              disabled={scanning || !isCameraOn}
              style={{
                flex: 1,
                padding: '12px',
                background: scanning ? '#94a3b8' : '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: scanning ? 'not-allowed' : 'pointer'
              }}
            >
              {scanning ? '⏳ Memproses OCR...' : '📸 Scan Plat Nomor'}
            </button>
            <button 
              onClick={handleReset}
              style={{
                padding: '12px 20px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Kanan: Hasil */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e', marginBottom: '16px' }}>Hasil Verifikasi</h3>
          
          {!result ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}></div>
              <p>Belum ada hasil scan</p>
            </div>
          ) : (
            <div>
              {/* Status Box */}
              <div style={{
                padding: '20px',
                borderRadius: '10px',
                textAlign: 'center',
                marginBottom: '16px',
                background: result.allowed ? '#dcfce7' : '#fee2e2',
                border: `2px solid ${result.allowed ? '#22c55e' : '#ef4444'}`
              }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {result.allowed ? '✅' : '🚫'}
                </div>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: result.allowed ? '#166534' : '#991b1b',
                  margin: '0 0 8px 0'
                }}>
                  {result.allowed ? 'PALANG TERBUKA' : 'AKSES DITOLAK'}
                </h4>
                <p style={{ fontSize: '14px', color: result.allowed ? '#166534' : '#991b1b', margin: 0 }}>
                  {result.message}
                </p>
              </div>

              {/* Detail Info */}
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