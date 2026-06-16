'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:4000/api'

export default function JadwalPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [hapusId, setHapusId] = useState(null)
  
  const [formData, setFormData] = useState({
    tanggal: '',
    waktu: '',
    kapal: '',
    rute: '',
    kapasitas: '',
    tersedia: '',
    harga: '',
    status: 'Terjadwal'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/jadwal`)
      if (res.data.success) {
        const formattedData = res.data.data.map((item) => ({
          id: item.schedule_id,
          tanggal: item.departure_date, // Tambah tanggal
          waktu: item.departure_time?.substring(0, 5),
          kapal: item.ship_name,
          rute: item.route,
          kapasitas: item.capacity,
          tersedia: item.remaining_slot,
          harga: item.price,
          status: item.departure_status
        }))
        setData(formattedData)
      }
    } catch (error) {
      console.error('Error fetching jadwal:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format tanggal untuk tampilan (DD/MM/YYYY)
  const formatTanggal = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const openModal = (id = null) => {
    setEditId(id)
    // Default tanggal hari ini
    const today = new Date().toISOString().split('T')[0]
    
    if (id) {
      const row = data.find(d => d.id === id)
      setFormData({
        tanggal: row.tanggal || today,
        waktu: row.waktu,
        kapal: row.kapal,
        rute: row.rute,
        kapasitas: row.kapasitas.toString(),
        tersedia: row.tersedia.toString(),
        harga: row.harga.toString(),
        status: row.status
      })
    } else {
      setFormData({
        tanggal: today,
        waktu: '',
        kapal: '',
        rute: '',
        kapasitas: '',
        tersedia: '',
        harga: '',
        status: 'Terjadwal'
      })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const saveData = async () => {
    const { tanggal, waktu, kapal, rute, kapasitas, tersedia, harga, status } = formData

    if (!tanggal || !waktu || !kapal || !rute || !kapasitas || !tersedia || !harga) {
      alert('Harap isi semua field dengan benar.')
      return
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/jadwal/${editId}`, {
          ship_name: kapal,
          departure_time: waktu + ':00',
          departure_date: tanggal,
          route: rute,
          price: parseInt(harga),
          capacity: parseInt(kapasitas),
          remaining_slot: parseInt(tersedia),
          departure_status: status
        })
        alert('Jadwal berhasil diupdate!')
      } else {
        await axios.post(`${API_URL}/jadwal`, {
          ship_name: kapal,
          departure_time: waktu + ':00',
          departure_date: tanggal,
          route: rute,
          price: parseInt(harga),
          capacity: parseInt(kapasitas),
          remaining_slot: parseInt(tersedia),
          departure_status: status
        })
        alert('Jadwal berhasil ditambahkan!')
      }
      closeModal()
      fetchData()
    } catch (error) {
      console.error('Error saving data:', error)
      alert('Gagal menyimpan data: ' + (error.response?.data?.message || error.message))
    }
  }

  const openConfirm = (id) => {
    setHapusId(id)
    setConfirmOpen(true)
  }

  const closeConfirm = () => {
    setConfirmOpen(false)
    setHapusId(null)
  }

  const confirmHapus = async () => {
    try {
      await axios.delete(`${API_URL}/jadwal/${hapusId}`)
      alert('Jadwal berhasil dihapus!')
      closeConfirm()
      fetchData()
    } catch (error) {
      console.error('Error deleting data:', error)
      alert('Gagal menghapus data')
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const sortedData = [...data].sort((a, b) => {
    // Sort by tanggal, then by waktu
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal)
    return a.waktu.localeCompare(b.waktu)
  })

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
        <h1 className="topbar-title">Jadwal Keberangkatan</h1>
      </header>

      {/* CONTENT */}
      <main className="content">
        <button className="btn-tambah" onClick={() => openModal()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Tambah Jadwal
        </button>

        <div className="table-section">
          <div className="table-title">Daftar Jadwal Kapal</div>
          <div className="table-wrapper">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>Kapal</th>
                  <th>Rute</th>
                  <th>Kapasitas</th>
                  <th>Tersedia</th>
                  <th>Harga</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr key={row.id}>
                    <td className="time-cell">{formatTanggal(row.tanggal)}</td>
                    <td className="time-cell">{row.waktu}</td>
                    <td>{row.kapal}</td>
                    <td>{row.rute}</td>
                    <td>{row.kapasitas}</td>
                    <td>{row.tersedia}</td>
                    <td className="harga-cell">Rp {parseInt(row.harga).toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`badge badge-${row.status === 'Berangkat' ? 'berangkat' : 'terjadwal'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button className="btn-edit" onClick={() => openModal(row.id)}>
                          ✏️ Edit
                        </button>
                        <button className="btn-hapus" onClick={() => openConfirm(row.id)}>
                          🗑 Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL TAMBAH / EDIT */}
      {modalOpen && (
        <div className="modal-backdrop show" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editId ? 'Edit Jadwal' : 'Tambah Jadwal'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tanggal Berangkat</label>
                <input 
                  type="date" 
                  className="form-input" 
                  id="tanggal"
                  value={formData.tanggal}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Waktu</label>
                <input 
                  type="time" 
                  className="form-input" 
                  id="waktu"
                  value={formData.waktu}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rute</label>
                <input 
                  type="text" 
                  className="form-input" 
                  id="rute"
                  placeholder="cth: Karimun"
                  value={formData.rute}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Nama Kapal</label>
                <input 
                  type="text" 
                  className="form-input" 
                  id="kapal"
                  placeholder="cth: Kapal Jarjit Singh"
                  value={formData.kapal}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Kapasitas</label>
                <input 
                  type="number" 
                  className="form-input" 
                  id="kapasitas"
                  placeholder="300"
                  value={formData.kapasitas}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tersedia</label>
                <input 
                  type="number" 
                  className="form-input" 
                  id="tersedia"
                  placeholder="40"
                  value={formData.tersedia}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Harga Tiket</label>
                <input 
                  type="number" 
                  className="form-input" 
                  id="harga"
                  placeholder="50000"
                  value={formData.harga}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Status</label>
                <select 
                  className="form-select" 
                  id="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="Terjadwal">Terjadwal</option>
                  <option value="Berangkat">Berangkat</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Batal</button>
              <button className="btn-save" onClick={saveData}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmOpen && (
        <div className="modal-backdrop show" onClick={closeConfirm}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="confirm-title">Hapus Jadwal?</div>
            <div className="confirm-desc">Data jadwal ini akan dihapus permanen dan tidak bisa dikembalikan.</div>
            <div className="confirm-footer">
              <button className="btn-cancel" onClick={closeConfirm}>Batal</button>
              <button className="btn-confirm-hapus" onClick={confirmHapus}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}