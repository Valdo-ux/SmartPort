'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import axios from 'axios'
import './user.css'

const API_URL = 'http://localhost:4000/api'

export default function UserLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [userData, setUserData] = useState({
    user_id: null,
    username: '',
    email: '',
    no_whatsapp: ''
  })
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    no_whatsapp: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const parsed = JSON.parse(user)
        setUserData(parsed)
        setFormData({
          username: parsed.username || '',
          email: parsed.email || '',
          no_whatsapp: parsed.no_whatsapp || ''
        })
      } catch (e) {
        console.error('Error parsing user data', e)
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const handleInputChangeField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEdit = () => {
    setEditMode(true)
  }

  const handleCancel = () => {
    setEditMode(false)
    setFormData({
      username: userData.username || '',
      email: userData.email || '',
      no_whatsapp: userData.no_whatsapp || ''
    })
  }

  const handleSave = async () => {
    if (!formData.username || !formData.email) {
      alert('Username dan email wajib diisi!')
      return
    }

    setSaving(true)
    try {
      const res = await axios.put(`${API_URL}/user/${userData.user_id}`, formData)
      
      if (res.data.success) {
        const updatedUser = {
          ...userData,
          ...formData
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUserData(updatedUser)
        setEditMode(false)
        alert('Profil berhasil diperbarui!')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('Gagal memperbarui profil: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    if (confirm('Yakin mau logout?')) {
      localStorage.removeItem('user')
      router.push('/')
    }
  }

  const getInitial = (name) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="user-layout">
      {/* NAVBAR */}
      <nav className="user-navbar">
        {/* Brand */}
        <Link href="/user/jadwal" className="user-navbar-brand">
          <div className="user-navbar-logo">
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
              <path d="M10 30h28l-5-10H15L10 30z" fill="#fff"/>
              <path d="M6 33h36" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="user-navbar-title">Pelabuhan Pintar</h1>
            <p className="user-navbar-subtitle">Telaga Punggur</p>
          </div>
        </Link>

        {/* Menu */}
        <div className="user-navbar-menu">
          <Link 
            href="/user/jadwal" 
            className={`user-nav-link ${pathname === '/user/jadwal' ? 'active' : ''}`}
          >
            <svg className="user-nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h8"/>
            </svg>
            <span>Jadwal Kapal</span>
          </Link>

          <Link 
            href="/user/pemesanan" 
            className={`user-nav-link ${pathname === '/user/pemesanan' ? 'active' : ''}`}
          >
            <svg className="user-nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2"/>
              <path d="M7 7h6M7 10h6M7 13h4"/>
            </svg>
            <span>Pemesanan Tiket</span>
          </Link>

          <Link 
            href="/user/riwayat" 
            className={`user-nav-link ${pathname === '/user/riwayat' ? 'active' : ''}`}
          >
            <svg className="user-nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3v14h14"/>
              <path d="M7 14l4-4 3 3 4-5"/>
            </svg>
            <span>Riwayat Tiket</span>
          </Link>
        </div>

        {/* Right Side */}
        <div className="user-navbar-right">
          <div className="user-greeting">
            Halo, <strong>{userData.username || 'User'}</strong>!
          </div>
          <div 
            className="user-avatar" 
            onClick={() => setProfileOpen(true)}
            title="Profil Saya"
          >
            {getInitial(userData.username)}
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="user-content">
        {children}
      </div>

      {/* PROFILE MODAL */}
      {profileOpen && (
        <div 
          className="profile-modal-backdrop show" 
          onClick={() => {
            setProfileOpen(false)
            setEditMode(false)
          }}
        >
          <div 
            className="profile-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-modal-header">
              <div className="profile-avatar-large">
                {getInitial(userData.username)}
              </div>
              <div>
                <h3 className="profile-modal-title">{userData.username || 'User'}</h3>
                <p className="profile-modal-subtitle">{userData.email || '-'}</p>
              </div>
            </div>

            <div className="profile-form-group">
              <label className="profile-label">Username</label>
              {editMode ? (
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={(e) => handleInputChangeField('username', e.target.value)}
                  className="profile-input"
                  placeholder="Masukkan username"
                />
              ) : (
                <div className="profile-value">{userData.username || '-'}</div>
              )}
            </div>

            <div className="profile-form-group">
              <label className="profile-label">Email</label>
              {editMode ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChangeField('email', e.target.value)}
                  className="profile-input"
                  placeholder="Masukkan email"
                />
              ) : (
                <div className="profile-value">{userData.email || '-'}</div>
              )}
            </div>

            <div className="profile-form-group">
              <label className="profile-label">No. WhatsApp</label>
              {editMode ? (
                <input
                  type="text"
                  name="no_whatsapp"
                  value={formData.no_whatsapp}
                  onChange={(e) => handleInputChangeField('no_whatsapp', e.target.value)}
                  className="profile-input"
                  placeholder="081234567890"
                />
              ) : (
                <div className="profile-value">{userData.no_whatsapp || '-'}</div>
              )}
            </div>

            <div className="profile-modal-footer">
              <div className="profile-footer-left">
                {editMode ? (
                  <>
                    <button className="profile-btn-cancel" onClick={handleCancel}>
                      Batal
                    </button>
                    <button 
                      className="profile-btn-save" 
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </>
                ) : (
                  <button className="profile-btn-edit" onClick={handleEdit}>
                    ✏️ Edit
                  </button>
                )}
              </div>
              <div className="profile-footer-right">
                <button className="profile-btn-logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}