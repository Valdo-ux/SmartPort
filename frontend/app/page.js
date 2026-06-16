'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function HomePage() {
  const router = useRouter()
  const [todaySchedule, setTodaySchedule] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  
  const [searchRoute, setSearchRoute] = useState('')
  const [searchDate, setSearchDate] = useState('')

  useEffect(() => {
    fetchTodaySchedule()
    
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        setIsLoggedIn(true)
        setUserName(userData.nama || userData.username || 'User')
      } catch (e) {
        console.error('Error parsing user data', e)
      }
    }
  }, [])

  const fetchTodaySchedule = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/jadwal`)
      if (res.data.success) {
        const formattedData = res.data.data.map((item) => ({
          id: item.schedule_id,
          tanggal: item.departure_date,
          waktu: item.departure_time ? item.departure_time.substring(0, 5) : '00:00',
          kapal: item.ship_name || '-',
          rute: item.route || '-',
          harga: Number(item.price) || 0,
          tersedia: Number(item.remaining_slot) || 0,
          status: item.departure_status || 'Terjadwal'
        }))
        setTodaySchedule(formattedData)
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchRoute && !searchDate) {
      alert('Pilih minimal rute atau tanggal untuk mencari jadwal')
      return
    }
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchRoute) params.append('rute', searchRoute)
      if (searchDate) params.append('tanggal', searchDate)
      
      const res = await axios.get(`${API_URL}/jadwal?${params.toString()}`)
      if (res.data.success) {
        const formattedData = res.data.data.map((item) => ({
          id: item.schedule_id,
          tanggal: item.departure_date,
          waktu: item.departure_time ? item.departure_time.substring(0, 5) : '00:00',
          kapal: item.ship_name || '-',
          rute: item.route || '-',
          harga: Number(item.price) || 0,
          tersedia: Number(item.remaining_slot) || 0,
          status: item.departure_status || 'Terjadwal'
        }))
        
        setSearchResults(formattedData)
        
        setTimeout(() => {
          document.getElementById('jadwal-section')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }, 100)
      }
    } catch (error) {
      console.error('Error searching schedule:', error)
      alert('Gagal mencari jadwal')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSearch = () => {
    setSearchRoute('')
    setSearchDate('')
    setSearchResults(null)
    // Scroll back to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = () => {
    router.push('/login')
  }


  const handleLogout = () => {
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    setUserName('')
    window.location.reload()
  }

  // Fungsi Format Tanggal (Sangat aman untuk format MySQL YYYY-MM-DD)
  const formatTanggal = (dateStr) => {
    if (!dateStr) return '-'
    // Ambil bagian tanggal saja (jika ada waktu T...)
    const cleanDate = dateStr.split('T')[0]
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}` // DD/MM/YYYY
    }
    return cleanDate
  }

  // Fungsi Format Harga
  const formatHarga = (harga) => {
    const num = Number(harga)
    if (isNaN(num)) return 'Rp 0'
    return `Rp ${num.toLocaleString('id-ID')}`
  }

  const displayData = searchResults !== null ? searchResults : todaySchedule
  const sectionTitle = searchResults !== null 
    ? `Hasil Pencarian${searchRoute ? ` - ${searchRoute}` : ''}`
    : 'Jadwal Keberangkatan Hari Ini'

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
{/* NAVBAR */}
<nav style={{
  background: '#fff',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  padding: '16px 0',
  position: 'sticky',
  top: 0,
  zIndex: 100
}}>
  <div style={{
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
        Pelabuhan Pintar
      </h1>
      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
        Pelabuhan Telaga Punggur
      </p>
    </div>

    <div style={{ display: 'flex', gap: '12px' }}>
      {isLoggedIn ? (
        <>
          <span style={{ padding: '10px 16px', color: '#0284c7', fontWeight: '600' }}>
            Halo, {userName}!
          </span>
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: '#fff',
              color: '#dc2626',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <button 
          onClick={handleLogin}
          style={{
            padding: '10px 24px',
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Log in
        </button>
      )}
    </div>
  </div>
</nav>

      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
        color: '#fff',
        padding: '80px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '16px' }}>
            Selamat Datang di Sistem Pelabuhan Pintar
          </h2>
          <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '40px' }}>
            Monitoring Arus Kendaraan Secara Real-Time
          </p>
        </div>
      </section>

      {/* SEARCH FORM */}
      <section style={{
        maxWidth: '1200px',
        margin: '-60px auto 0',
        padding: '0 24px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          padding: '32px',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0c4a6e', marginBottom: '24px', textAlign: 'center' }}>
            Cari Jadwal Kapal
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Pelabuhan Tujuan
              </label>
              <select 
                value={searchRoute}
                onChange={(e) => setSearchRoute(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0c4a6e', background: '#f8fafc', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <option value="">Pilih Tujuan</option>
                <option value="Karimun">Karimun</option>
                <option value="Tj. Uban">Tj. Uban</option>
                <option value="Marina">Marina</option>
                <option value="Paradise">Paradise</option>
                <option value="Surga">Surga</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                Tanggal Berangkat
              </label>
              <input 
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0c4a6e', background: '#f8fafc', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              onClick={handleSearch}
              style={{ padding: '12px 32px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', height: '46px' }}
            >
              🔍 Cari Jadwal
            </button>
          </div>
        </div>
      </section>

      {/* JADWAL SECTION */}
      <section id="jadwal-section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0c4a6e', marginBottom: '12px' }}>
            {sectionTitle}
          </h3>
          <p style={{ color: '#64748b' }}>
            {searchResults !== null 
              ? `Menampilkan ${searchResults.length} jadwal`
              : 'Lihat jadwal kapal yang tersedia untuk hari ini'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', color: '#64748b' }}>Memuat jadwal...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#0c4a6e', color: '#fff' }}>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Tanggal</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Waktu</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Kapal</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Rute</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Harga</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Tersedia</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          Tidak ada jadwal tersedia
                        </td>
                      </tr>
                    ) : (
                      displayData.map((jadwal, index) => (
                        <tr 
                          key={jadwal.id || index}
                          style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}
                        >
                          <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '600' }}>
                            {formatTanggal(jadwal.tanggal)}
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0c4a6e' }}>
                            {jadwal.waktu}
                          </td>
                          <td style={{ padding: '16px 20px', color: '#334155' }}>
                            {jadwal.kapal}
                          </td>
                          <td style={{ padding: '16px 20px', color: '#334155' }}>
                            {jadwal.rute}
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0c4a6e' }}>
                            {formatHarga(jadwal.harga)}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: jadwal.tersedia > 50 ? '#dcfce7' : jadwal.tersedia > 20 ? '#fef9c3' : '#fee2e2',
                              color: jadwal.tersedia > 50 ? '#166534' : jadwal.tersedia > 20 ? '#854d0e' : '#b91c1c'
                            }}>
                              {jadwal.tersedia} slot
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: jadwal.status === 'Berangkat' ? '#dbeafe' : '#f1f5f9',
                              color: jadwal.status === 'Berangkat' ? '#1d4ed8' : '#475569'
                            }}>
                              {jadwal.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {searchResults !== null && (
              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <button 
                  onClick={handleResetSearch}
                  style={{ padding: '14px 32px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
                >
                  ← Kembali ke Jadwal Hari Ini
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* FEATURES */}
      <section style={{ background: '#f1f5f9', padding: '80px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0c4a6e', marginBottom: '12px' }}>
              Mengapa Memilih Kami?
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>⚡</div>
              <h4 style={{ fontSize: '20px', fontWeight: '600', color: '#0c4a6e', marginBottom: '12px' }}>Cepat & Mudah</h4>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>Pemesanan tiket hanya dalam beberapa klik, tanpa antri panjang</p>
            </div>

            <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>🛡️</div>
              <h4 style={{ fontSize: '20px', fontWeight: '600', color: '#0c4a6e', marginBottom: '12px' }}>Aman & Terpercaya</h4>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>Sistem terintegrasi dengan monitoring real-time</p>
            </div>

            <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#f3e8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>💰</div>
              <h4 style={{ fontSize: '20px', fontWeight: '600', color: '#0c4a6e', marginBottom: '12px' }}>Harga Terbaik</h4>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>Harga kompetitif dengan pelayanan terbaik</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0c4a6e', color: '#fff', padding: '32px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            &copy; 2026 Pelabuhan Pintar - Telaga Punggur. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}