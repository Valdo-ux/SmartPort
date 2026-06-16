'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function PemesananPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tanggal, setTanggal] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Fetch data dan set tanggal hari ini
  useEffect(() => {
    // Set tanggal hari ini format YYYY-MM-DD untuk input
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    
    setTanggal(todayStr)
    setFilterDate(todayStr)
    fetchData(todayStr)
  }, [])

  const fetchData = async (dateFilter = '') => {
    setLoading(true)
    try {
      const url = dateFilter 
        ? `${API_URL}/pemesanan?tanggal=${dateFilter}`
        : `${API_URL}/pemesanan`
      
      const res = await axios.get(url)
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching pemesanan:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setTanggal(e.target.value)
  }

  const handleApplyFilter = () => {
    setFilterDate(tanggal)
    fetchData(tanggal)
  }

  const handleResetFilter = () => {
    setTanggal('')
    setFilterDate('')
    fetchData()
  }

  const handleCetak = () => {
    window.print()
  }

  const getBadgeClass = (status) => {
    if (status === 'Sukses') return 'badge-sukses'
    if (status === 'Gagal') return 'badge-gagal'
    return 'badge-pending'
  }

  // Format tanggal untuk display
  const formatTanggalDisplay = (dateStr) => {
    if (!dateStr) return 'Semua Tanggal'
    const date = new Date(dateStr)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  if (loading) {
    return (
      <div className="content">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      {/* TOPBAR */}
      <header className="topbar">
        <h1 className="topbar-title">Pemesanan</h1>
      </header>

      {/* CONTENT */}
      <main className="content">
        {/* TOOLBAR */}
        <div className="toolbar">
          <button className="btn-cetak" onClick={handleCetak}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8" rx="1"/>
            </svg>
            Cetak
          </button>
          
          <div className="date-filter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <input 
              type="date" 
              className="date-input"
              value={tanggal}
              onChange={handleFilterChange}
            />
            <button className="btn-filter" onClick={handleApplyFilter}>
              Filter
            </button>
            {filterDate && (
              <button className="btn-reset" onClick={handleResetFilter}>
                Reset
              </button>
            )}
          </div>
          
          <div className="date-display">
            <span>Tanggal: {formatTanggalDisplay(filterDate)}</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-section">
          <div className="table-wrapper">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Kapal</th>
                  <th>Tujuan</th>
                  <th>Waktu</th>
                  <th>Harga</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Tidak ada data pemesanan {filterDate ? 'pada tanggal ' + formatTanggalDisplay(filterDate) : ''}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id_ticket}>
                      <td className="id-cell">{row.id_ticket}</td>
                      <td className="name-cell">{row.nama}</td>
                      <td className="email-cell">{row.email}</td>
                      <td>{row.kapal}</td>
                      <td>{row.tujuan}</td>
                      <td className="waktu-cell">{row.waktu}</td>
                      <td className="harga-cell">Rp {parseInt(row.harga).toLocaleString('id-ID')}</td>
                      <td>
                        <span className={`badge ${getBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}