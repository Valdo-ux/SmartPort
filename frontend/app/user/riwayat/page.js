'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function RiwayatTiketPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        setUserData(JSON.parse(user))
      } catch (e) {
        console.error('Error parsing user', e)
      }
    }
  }, [])

  useEffect(() => {
    if (userData?.user_id) {
      fetchTickets()
    }
  }, [userData])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/tickets/user/${userData.user_id}`)
      if (res.data.success) {
        setTickets(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTanggal = (dateStr) => {
    if (!dateStr) return '-'
    const cleanDate = dateStr.split('T')[0]
    const parts = cleanDate.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return cleanDate
  }

  const formatHarga = (harga) => {
    const num = Number(harga)
    return isNaN(num) ? 'Rp 0' : `Rp ${num.toLocaleString('id-ID')}`
  }

  const getStatusBadge = (status) => {
    const map = {
      'Sukses': { bg: '#dcfce7', color: '#166534', text: '✅ Sukses' },
      'Pending': { bg: '#fef9c3', color: '#854d0e', text: '⏳ Pending' },
      'Gagal': { bg: '#fee2e2', color: '#b91c1c', text: '❌ Gagal' }
    }
    return map[status] || { bg: '#f1f5f9', color: '#475569', text: status }
  }

  const filteredTickets = filterStatus === 'Semua' 
    ? tickets 
    : tickets.filter(t => t.ticket_status === filterStatus)

  const handlePrint = (ticket) => {
    // Simpel print menggunakan window.print()
    // Nanti bisa dikembangkan jadi generate PDF atau tampilan khusus print
    alert(`Fitur cetak tiket #${ticket.id_ticket} akan segera tersedia!`)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e', marginBottom: '8px' }}>
          Riwayat Tiket
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Daftar semua tiket yang telah Anda pesan
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {['Semua', 'Sukses', 'Pending', 'Gagal'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              background: filterStatus === status ? '#0284c7' : '#f1f5f9',
              color: filterStatus === status ? '#fff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          Memuat riwayat tiket...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTickets.length === 0 && (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px' }}>
            Belum Ada Tiket
          </h3>
          <p style={{ fontSize: '14px' }}>
            {filterStatus === 'Semua' 
              ? 'Anda belum melakukan pemesanan tiket' 
              : `Tidak ada tiket dengan status ${filterStatus}`}
          </p>
        </div>
      )}

      {/* Ticket List */}
      {!loading && filteredTickets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredTickets.map((ticket) => {
            const badge = getStatusBadge(ticket.ticket_status)
            return (
              <div 
                key={ticket.id_ticket}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}
              >
                {/* Left Info */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: '#e0f2fe',
                      color: '#0284c7'
                    }}>
                      #{ticket.id_ticket}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: badge.bg,
                      color: badge.color
                    }}>
                      {badge.text}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: '#334155' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Tanggal & Waktu</span>
                      <strong>{formatTanggal(ticket.departure_date)} | {ticket.departure_time?.substring(0, 5)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Kapal & Rute</span>
                      <strong>{ticket.ship_name} → {ticket.route}</strong>
                    </div>
                    {ticket.vehicle_number && (
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>Kendaraan</span>
                        <strong>{ticket.vehicle_number}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Price & Action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flex: '0 0 auto' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0c4a6e' }}>
                    {formatHarga(ticket.price)}
                  </div>
                  <button
                    onClick={() => handlePrint(ticket)}
                    style={{
                      padding: '8px 16px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#e2e8f0'
                      e.target.style.color = '#0c4a6e'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = '#f1f5f9'
                      e.target.style.color = '#475569'
                    }}
                  >
                    🖨️ Cetak Tiket
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}