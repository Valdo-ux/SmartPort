'use client'
import { useState, useEffect } from 'react'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalTiket: 0,
    totalPendapatan: 0,
    totalPengguna: 0
  })
  const [loading, setLoading] = useState(true)
  const [camOnline, setCamOnline] = useState(false)

  const PI_STREAM_URL = 'http://192.168.1.11:8080/video_feed'

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/admin/statistics')
      const data = await res.json()
      
      if (data.success) {
        setStats({
          totalTiket: data.data.totalTiket || 0,
          totalPendapatan: data.data.totalPendapatan || 0,
          totalPengguna: data.data.totalUsers || 0
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* TOPBAR */}
      <header className="topbar">
        <h1 className="topbar-title">Dashboard</h1>
      </header>

      {/* CONTENT */}
      <main className="content">
        {/* STAT CARDS */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#1e6fb5" strokeWidth="1.5"/>
                <path d="M8 5v14M16 5v14" stroke="#1e6fb5" strokeWidth="1.5"/>
                <path d="M3 10h18" stroke="#1e6fb5" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div className="stat-label">Total Tiket</div>
              <div className="stat-value">
                {loading ? 'Loading...' : stats.totalTiket.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#1e6fb5" strokeWidth="1.5"/>
                <path d="M12 7v1m0 8v1" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 10a3 3 0 116 0c0 2-3 2.5-3 4" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-label">Total Pendapatan</div>
              <div className="stat-value">
                {loading ? 'Loading...' : `Rp ${stats.totalPendapatan.toLocaleString('id-ID')}`}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3" stroke="#1e6fb5" strokeWidth="1.5"/>
                <circle cx="16" cy="9" r="2.5" stroke="#1e6fb5" strokeWidth="1.5"/>
                <path d="M2 19c0-3.314 3.134-5 7-5s7 1.686 7 5" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M16 14c2.5 0 5 1 5 5" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-label">Total Pengguna</div>
              <div className="stat-value">
                {loading ? 'Loading...' : stats.totalPengguna.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* LIVE MONITOR - KAMERA RASPBERRY PI */}
        <div className="camera-section">
          <div className="camera-header">
            <h2 className="camera-title">📹 Live Monitor Pelabuhan</h2>
            <div className="camera-status">
              <span className={`status-indicator ${camOnline ? 'live' : ''}`}></span>
              <span>{camOnline ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className="camera-container">
            {/* Stream selalu dicoba dimuat; disembunyikan kalau gagal/offline */}
            <img
              key={PI_STREAM_URL}
              src={PI_STREAM_URL}
              alt="Live Camera Feed"
              className="camera-feed"
              style={{ display: camOnline ? 'block' : 'none' }}
              onLoad={() => setCamOnline(true)}
              onError={() => setCamOnline(false)}
            />

            {!camOnline && (
              <div className="camera-offline">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <p>Kamera sedang offline</p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>IoT device belum terkoneksi</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}