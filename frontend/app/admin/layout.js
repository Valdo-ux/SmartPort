'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import './admin.css'

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-circle">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30h28l-5-10H15L10 30z" fill="#0f2744"/>
              <rect x="19" y="15" width="10" height="8" rx="1.5" fill="#1e6fb5"/>
              <rect x="23" y="11" width="2" height="5" rx="1" fill="#1e6fb5"/>
              <path d="M6 33h36" stroke="#0f2744" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="15" cy="37" r="2.5" fill="#1e6fb5"/>
              <circle cx="24" cy="37" r="2.5" fill="#1e6fb5"/>
              <circle cx="33" cy="37" r="2.5" fill="#1e6fb5"/>
            </svg>
          </div>
          <div className="sidebar-title">Pelabuhan Pintar</div>
        </div>

        <Link 
          href="/admin/dashboard" 
          className={`nav-item ${pathname === '/admin/dashboard' ? 'active' : ''}`}
        >
          <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <rect x="2" y="2" width="7" height="7" rx="1.5"/>
            <rect x="11" y="2" width="7" height="7" rx="1.5" opacity="0.6"/>
            <rect x="2" y="11" width="7" height="7" rx="1.5" opacity="0.6"/>
            <rect x="11" y="11" width="7" height="7" rx="1.5" opacity="0.6"/>
          </svg>
          <span>Dashboard</span>
        </Link>

        <Link 
          href="/admin/jadwal" 
          className={`nav-item ${pathname === '/admin/jadwal' ? 'active' : ''}`}
        >
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h8"/>
          </svg>
          <span>Jadwal Keberangkatan</span>
        </Link>

        <Link 
          href="/admin/pemesanan" 
          className={`nav-item ${pathname === '/admin/pemesanan' ? 'active' : ''}`}
        >
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="14" height="14" rx="2"/>
            <path d="M7 7h6M7 10h6M7 13h4"/>
          </svg>
          <span>Pemesanan</span>
        </Link>

        {/* LOGOUT BUTTON */}
        <div 
          className="nav-item logout-item" 
          onClick={() => setLogoutOpen(true)}
          style={{ marginTop: 'auto', cursor: 'pointer' }}
        >
          <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v14h14" opacity="0.6"/>
            <path d="M9 16l6-6-6-6M15 10H3"/>
          </svg>
          <span>Logout</span>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main">
        {children}
      </div>

      {/* MODAL LOGOUT */}
      {logoutOpen && (
        <div className="modal-backdrop show" onClick={() => setLogoutOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon logout-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 17 21 12 16 7" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="#1e6fb5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="confirm-title">Logout dari Akun?</div>
            <div className="confirm-desc">Anda akan keluar dari sesi admin. Pastikan semua perubahan sudah disimpan.</div>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={() => setLogoutOpen(false)}>Batal</button>
              <button className="btn-logout" onClick={handleLogout}>Ya, Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}