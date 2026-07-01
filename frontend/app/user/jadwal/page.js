'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function UserJadwalPage() {
  const [jadwalList, setJadwalList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchRoute, setSearchRoute] = useState('')
  const [searchDate, setSearchDate] = useState('')

  useEffect(() => {
    fetchJadwal()
  }, [])

  const fetchJadwal = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchRoute) params.append('rute', searchRoute)
      if (searchDate) params.append('tanggal', searchDate)
      
      const res = await axios.get(`${API_URL}/jadwal?${params.toString()}`)
      if (res.data.success) {
        const formattedData = res.data.data.map((item) => {
          // Format tanggal pakai split string (ANTI TIMEZONE)
          let rawDate = item.departure_date
          if (rawDate instanceof Date) {
            const yyyy = rawDate.getFullYear()
            const mm = String(rawDate.getMonth() + 1).padStart(2, '0')
            const dd = String(rawDate.getDate()).padStart(2, '0')
            rawDate = `${yyyy}-${mm}-${dd}`
          } else if (typeof rawDate === 'string') {
            rawDate = rawDate.split('T')[0]
          }

          let displayDate = '-'
          if (rawDate) {
            const parts = rawDate.split('-')
            if (parts.length === 3) {
              displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`
            }
          }

          return {
            id: item.schedule_id,
            tanggal: displayDate,
            waktu: item.departure_time?.substring(0, 5) || '00:00',
            kapal: item.ship_name || '-',
            rute: item.route || '-',
            harga: Number(item.price) || 0,
            tersedia: Number(item.remaining_slot) || 0,
            status: item.departure_status || 'Terjadwal'
          }
        })
        setJadwalList(formattedData)
      }
    } catch (error) {
      console.error('Error fetching jadwal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchJadwal()
  }

  const handleReset = () => {
    setSearchRoute('')
    setSearchDate('')
    fetchJadwal()
  }

  const formatHarga = (harga) => {
    const num = Number(harga)
    if (isNaN(num)) return 'Rp 0'
    return `Rp ${num.toLocaleString('id-ID')}`
  }

  const handlePesan = (jadwal) => {
    // Nanti redirect ke halaman pemesanan dengan schedule_id
    alert(`Fitur pesan tiket untuk ${jadwal.kapal} ke ${jadwal.rute} akan segera tersedia!`)
  }

  return (
    <div>
      {/* Search Form */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#0c4a6e',
          marginBottom: '16px'
        }}>
          🔍 Cari Jadwal
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '12px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
              Rute Tujuan
            </label>
            <select 
              value={searchRoute}
              onChange={(e) => setSearchRoute(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0c4a6e',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Semua Rute</option>
              <option value="Karimun">Karimun</option>
              <option value="Tj. Uban">Tj. Uban</option>
              <option value="Marina">Marina</option>
              <option value="Paradise">Paradise</option>
              <option value="Surga">Surga</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
              Tanggal
            </label>
            <input 
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0c4a6e',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleSearch}
              style={{
                padding: '10px 20px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cari
            </button>
            <button 
              onClick={handleReset}
              style={{
                padding: '10px 20px',
                background: '#fff',
                color: '#64748b',
                border: '1.5px solid #e2e8f0',
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
      </div>

      {/* Jadwal Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          Memuat jadwal...
        </div>
      ) : jadwalList.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          Tidak ada jadwal tersedia
        </div>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#0c4a6e', color: '#fff' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Tanggal</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Waktu</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Kapal</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Rute</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Harga</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Tersedia</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: '600' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jadwalList.map((jadwal, index) => (
                  <tr 
                    key={jadwal.id || index}
                    style={{ borderBottom: '1px solid #e2e8f0' }}
                  >
                    <td style={{ padding: '14px 18px', color: '#334155', fontWeight: '600' }}>
                      {jadwal.tanggal}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0c4a6e' }}>
                      {jadwal.waktu}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155' }}>
                      {jadwal.kapal}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155' }}>
                      {jadwal.rute}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#0c4a6e' }}>
                      {formatHarga(jadwal.harga)}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
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
                    <td style={{ padding: '14px 18px' }}>
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
                    <td style={{ padding: '14px 18px' }}>
                      <button 
                        onClick={() => handlePesan(jadwal)}
                        style={{
                          padding: '6px 16px',
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Pesan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}