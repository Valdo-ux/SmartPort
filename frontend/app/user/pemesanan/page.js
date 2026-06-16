'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function UserPemesananPage() {
  const router = useRouter()
  const [jadwalList, setJadwalList] = useState([])
  const [selectedJadwal, setSelectedJadwal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    no_whatsapp: '',
    vehicle_number: ''
  })

  const [userData, setUserData] = useState(null)

  useEffect(() => {
    // Load user data dari localStorage
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const parsed = JSON.parse(user)
        setUserData(parsed)
        setFormData({
          nama: parsed.username || '',
          email: parsed.email || '',
          no_whatsapp: parsed.no_whatsapp || '',
          vehicle_number: ''
        })
      } catch (e) {
        console.error('Error parsing user data', e)
      }
    }

    fetchJadwal()
  }, [])

  const fetchJadwal = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/jadwal`)
      if (res.data.success) {
        const formattedData = res.data.data.map((item) => ({
          id: item.schedule_id,
          tanggal: item.departure_date,
          waktu: item.departure_time?.substring(0, 5) || '00:00',
          kapal: item.ship_name || '-',
          rute: item.route || '-',
          harga: Number(item.price) || 0,
          tersedia: Number(item.remaining_slot) || 0,
          status: item.departure_status || 'Terjadwal'
        }))
        // Filter hanya yang tersedia dan status Terjadwal
        const availableJadwal = formattedData.filter(j => j.tersedia > 0 && j.status === 'Terjadwal')
        setJadwalList(availableJadwal)
      }
    } catch (error) {
      console.error('Error fetching jadwal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJadwalChange = (e) => {
    const jadwalId = parseInt(e.target.value)
    const jadwal = jadwalList.find(j => j.id === jadwalId)
    setSelectedJadwal(jadwal || null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatTanggal = (dateStr) => {
    if (!dateStr) return '-'
    const cleanDate = dateStr.split('T')[0]
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return cleanDate
  }

  const formatHarga = (harga) => {
    const num = Number(harga)
    if (isNaN(num)) return 'Rp 0'
    return `Rp ${num.toLocaleString('id-ID')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedJadwal) {
      alert('Pilih jadwal terlebih dahulu!')
      return
    }

    if (!formData.nama || !formData.email) {
      alert('Nama dan email wajib diisi!')
      return
    }

    setSubmitting(true)
    try {
      const res = await axios.post(`${API_URL}/pemesanan`, {
        user_id: userData.user_id,
        schedule_id: selectedJadwal.id,
        nama: formData.nama,
        email: formData.email,
        no_whatsapp: formData.no_whatsapp,
        vehicle_number: formData.vehicle_number || null
      })

      if (res.data.success) {
        alert('Pemesanan berhasil! Tiket Anda sudah dikonfirmasi.')
        // Redirect ke riwayat tiket
        router.push('/user/riwayat')
      }
    } catch (err) {
      console.error('Error creating pemesanan:', err)
      alert('Gagal membuat pemesanan: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#0c4a6e',
          marginBottom: '8px'
        }}>
          Pemesanan Tiket
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Pilih jadwal dan lengkapi data untuk memesan tiket kapal
        </p>
      </div>

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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px' }}>
            Tidak Ada Jadwal Tersedia
          </h3>
          <p style={{ fontSize: '14px' }}>
            Maaf, saat ini tidak ada jadwal yang tersedia untuk dipesan
          </p>
          <button
            onClick={() => router.push('/user/jadwal')}
            style={{
              marginTop: '20px',
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
            Lihat Jadwal
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Step 1: Pilih Jadwal */}
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0c4a6e',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                background: '#0284c7',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                1
              </span>
              Pilih Jadwal Keberangkatan
            </h3>

            <select
              value={selectedJadwal?.id || ''}
              onChange={handleJadwalChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0c4a6e',
                background: '#f8fafc',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Pilih Jadwal --</option>
              {jadwalList.map((jadwal) => (
                <option key={jadwal.id} value={jadwal.id}>
                  {formatTanggal(jadwal.tanggal)} | {jadwal.waktu} | {jadwal.kapal} | {jadwal.rute} | {formatHarga(jadwal.harga)} | {jadwal.tersedia} slot
                </option>
              ))}
            </select>

            {/* Detail Jadwal Terpilih */}
            {selectedJadwal && (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                background: '#f0f9ff',
                borderRadius: '10px',
                border: '1px solid #bae6fd'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#0c4a6e',
                  marginBottom: '12px'
                }}>
                  Detail Jadwal Terpilih:
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tanggal</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
                      {formatTanggal(selectedJadwal.tanggal)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Waktu</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
                      {selectedJadwal.waktu}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Kapal</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
                      {selectedJadwal.kapal}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Rute</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
                      {selectedJadwal.rute}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Harga Tiket</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7' }}>
                      {formatHarga(selectedJadwal.harga)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Slot Tersedia</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                      {selectedJadwal.tersedia} slot
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Data Penumpang */}
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0c4a6e',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                background: '#0284c7',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                2
              </span>
              Data Penumpang
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '14px', fontWeight: '600' }}>
                  Nama Lengkap <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleInputChange}
                  required
                  placeholder="Masukkan nama lengkap"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0c4a6e',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '14px', fontWeight: '600' }}>
                  Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
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
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '14px', fontWeight: '600' }}>
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  name="no_whatsapp"
                  value={formData.no_whatsapp}
                  onChange={handleInputChange}
                  placeholder="081234567890"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0c4a6e',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '14px', fontWeight: '600' }}>
                  Nomor Kendaraan
                </label>
                <input
                  type="text"
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleInputChange}
                  placeholder="B 1234 ABC"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0c4a6e',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Konfirmasi & Submit */}
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0c4a6e',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                background: '#0284c7',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700'
              }}>
                3
              </span>
              Konfirmasi Pemesanan
            </h3>

            <div style={{
              padding: '16px',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fde68a',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>️</span>
              <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
                <strong>Perhatian:</strong> Pastikan data yang Anda masukkan sudah benar. 
                Setelah pemesanan dibuat, data tidak dapat diubah. Tiket akan langsung dikonfirmasi.
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedJadwal || submitting}
              style={{
                width: '100%',
                padding: '14px',
                background: (!selectedJadwal || submitting) ? '#94a3b8' : '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (!selectedJadwal || submitting) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {submitting ? 'Memproses...' : 'Buat Pemesanan'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}