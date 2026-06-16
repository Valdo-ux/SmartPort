'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await axios.post(`${API_URL}/login`, formData)
      
      if (res.data.success) {
        // Simpan data user di localStorage
        localStorage.setItem('user', JSON.stringify(res.data.user))
        
        // Cek apakah admin atau user biasa
        const userEmail = res.data.user.email
        if (userEmail === 'admin@smartport.com') {
          // Admin → redirect ke dashboard admin
          router.push('/admin/dashboard')
        } else {
          // User biasa → redirect ke homepage (nanti ke dashboard user)
          router.push('/')
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal, coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Back Button */}
      <button
        onClick={handleBackToHome}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.3)'
        }}
        onMouseOut={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.2)'
        }}
      >
        ← Kembali
      </button>

      {/* Login Card */}
      <div style={{
        background: '#fff',
        padding: '48px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '450px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '36px'
          }}>
            🚢
          </div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#0c4a6e',
            marginBottom: '8px'
          }}>
            Selamat Datang Kembali
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#64748b'
          }}>
            Masuk ke akun Pelabuhan Pintar Anda
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#475569',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="contoh@email.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0c4a6e',
                background: '#f8fafc',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0284c7'
                e.target.style.background = '#fff'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.background = '#f8fafc'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#475569',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Masukkan password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0c4a6e',
                background: '#f8fafc',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0284c7'
                e.target.style.background = '#fff'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0'
                e.target.style.background = '#f8fafc'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#94a3b8' : '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: '20px'
            }}
            onMouseOver={(e) => {
              if (!loading) e.target.style.background = '#0369a1'
            }}
            onMouseOut={(e) => {
              if (!loading) e.target.style.background = '#0284c7'
            }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Register Link */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0
          }}>
            Belum punya akun?{' '}
            <a
              href="/register"
              style={{
                color: '#0284c7',
                fontWeight: '600',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => {
                e.target.style.textDecoration = 'underline'
              }}
              onMouseOut={(e) => {
                e.target.style.textDecoration = 'none'
              }}
            >
              Daftar di sini
            </a>
          </p>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bae6fd'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#0c4a6e',
            margin: 0,
            lineHeight: '1.6'
          }}>
            <strong>💡 Info:</strong><br />
            Admin: admin@smartport.com<br />
            User: user biasa dengan email terdaftar
          </p>
        </div>
      </div>
    </div>
  )
}