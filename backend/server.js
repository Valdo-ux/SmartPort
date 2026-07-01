require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Set timezone ke Jakarta
process.env.TZ = 'Asia/Jakarta';

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔌 Koneksi MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartport',
    timezone: '+07:00' // Set timezone MySQL ke Jakarta
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal konek ke MySQL:', err.message);
        return;
    }
    console.log('✅ Terkoneksi ke MySQL (database: smartport)');
});

// ==================== 🔐 API - AUTH ====================
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, no_whatsapp, password, confirm_password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Username, email, dan password wajib diisi' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
        }
        if (password !== confirm_password) {
            return res.status(400).json({ success: false, message: 'Konfirmasi password tidak cocok' });
        }
        
        const [existing] = await db.promise().query('SELECT user_id FROM USERS WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.promise().query(
            'INSERT INTO USERS (username, email, no_whatsapp, password) VALUES (?, ?, ?, ?)',
            [username, email, no_whatsapp, hashedPassword]
        );
        
        res.json({ success: true, message: 'Registrasi berhasil!', userId: result.insertId });
    } catch (err) {
        console.error('❌ Register Error:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
        }
        
        const [users] = await db.promise().query('SELECT * FROM USERS WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        
        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        
        res.json({ 
            success: true, 
            message: 'Login berhasil!', 
            user: { 
                user_id: user.user_id, 
                username: user.username, 
                email: user.email 
            } 
        });
    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// ==================== 📊 API - STATISTICS ====================
app.get('/api/admin/statistics', async (req, res) => {
    try {
        const [totalTiket] = await db.promise().query('SELECT COUNT(*) as count FROM TICKET WHERE ticket_status = "Sukses"');
        const [totalUsers] = await db.promise().query('SELECT COUNT(*) as count FROM USERS');
        const [pendapatan] = await db.promise().query(`
            SELECT SUM(s.price) as total 
            FROM TICKET t 
            JOIN SCHEDULE s ON t.schedule_id = s.schedule_id 
            WHERE t.ticket_status = "Sukses"
        `);
        
        res.json({
            success: true,
            data: {
                totalTiket: totalTiket[0]?.count || 0,
                totalUsers: totalUsers[0]?.count || 0,
                totalPendapatan: pendapatan[0]?.total || 0
            }
        });
    } catch (err) {
        console.error('❌ Statistics Error:', err);
        res.status(500).json({ success: false, message: 'Gagal ambil statistik' });
    }
});

// ==================== 🚢 API - SCHEDULE ====================

// 1. GET - Ambil semua jadwal (dengan filter rute & tanggal)
// 1. GET - Ambil semua jadwal
app.get('/api/jadwal', async (req, res) => {
    try {
        const { rute, tanggal, showAll } = req.query;
        
        let query = `
            SELECT 
                schedule_id,
                ship_name,
                departure_time,
                DATE_FORMAT(departure_date, '%Y-%m-%d') as departure_date,
                route,
                price,
                capacity,
                remaining_slot,
                departure_status,
                created_at
            FROM SCHEDULE 
            WHERE 1=1
        `;
        const params = [];
        
        if (rute) {
            query += ' AND route LIKE ?';
            params.push(`%${rute}%`);
        }
        
        if (tanggal) {
            query += ' AND departure_date = ?';
            params.push(tanggal);
        } else if (!showAll) {
            query += ' AND departure_date >= CURDATE()';
        }
        
        query += ' ORDER BY departure_date ASC, departure_time ASC';
        
        const [jadwal] = await db.promise().query(query, params);
        
        // Format tanggal di backend langsung jadi DD/MM/YYYY
        const formattedJadwal = jadwal.map(item => {
            let tanggalFormatted = '-'
            if (item.departure_date) {
                // departure_date sudah string YYYY-MM-DD dari DATE_FORMAT
                const parts = item.departure_date.split('-')
                if (parts.length === 3) {
                    tanggalFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`
                }
            }
            
            return {
                ...item,
                departure_date_formatted: tanggalFormatted
            }
        })
        
        res.json({ success: true, data: formattedJadwal });
    } catch (err) {
        console.error('❌ Jadwal GET Error:', err);
        res.status(500).json({ success: false, message: 'Gagal ambil data jadwal' });
    }
});

// 2. POST - Tambah jadwal baru
app.post('/api/jadwal', async (req, res) => {
    try {
        const { ship_name, departure_time, departure_date, route, price, capacity, remaining_slot, departure_status } = req.body;
        
        const [result] = await db.promise().query(
            'INSERT INTO SCHEDULE (ship_name, departure_time, departure_date, route, price, capacity, remaining_slot, departure_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [ship_name, departure_time, departure_date, route, price, capacity, remaining_slot, departure_status]
        );
        
        res.json({ success: true, message: 'Jadwal berhasil ditambahkan', schedule_id: result.insertId });
    } catch (err) {
        console.error('❌ Jadwal POST Error:', err);
        res.status(500).json({ success: false, message: 'Gagal tambah jadwal' });
    }
});

// 3. PUT - Update jadwal
app.put('/api/jadwal/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ship_name, departure_time, departure_date, route, price, capacity, remaining_slot, departure_status } = req.body;
        
        await db.promise().query(
            'UPDATE SCHEDULE SET ship_name = ?, departure_time = ?, departure_date = ?, route = ?, price = ?, capacity = ?, remaining_slot = ?, departure_status = ? WHERE schedule_id = ?',
            [ship_name, departure_time, departure_date, route, price, capacity, remaining_slot, departure_status, id]
        );
        
        res.json({ success: true, message: 'Jadwal berhasil diupdate' });
    } catch (err) {
        console.error('❌ Jadwal PUT Error:', err);
        res.status(500).json({ success: false, message: 'Gagal update jadwal' });
    }
});

// 4. DELETE - Hapus jadwal
app.delete('/api/jadwal/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.promise().query('DELETE FROM SCHEDULE WHERE schedule_id = ?', [id]);
        
        res.json({ success: true, message: 'Jadwal berhasil dihapus' });
    } catch (err) {
        console.error('❌ Jadwal DELETE Error:', err);
        res.status(500).json({ success: false, message: 'Gagal hapus jadwal' });
    }
});

// ==================== 👤 API - USER DATA ====================
app.get('/api/dashboard-data', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID required' });
        }
        
        const [users] = await db.promise().query('SELECT username FROM USERS WHERE user_id = ?', [userId]);
        const [stats] = await db.promise().query('SELECT COUNT(*) as total FROM TICKET WHERE user_id = ?', [userId]);
        
        res.json({
            success: true,
            nama: users[0]?.username || 'User',
            totalBooking: stats[0]?.total || 0
        });
    } catch (err) {
        console.error('❌ Dashboard Data Error:', err);
        res.status(500).json({ success: false, message: 'Gagal ambil data' });
    }
});

// ==================== 🎫 API - PEMESANAN (ADMIN) ====================
app.get('/api/pemesanan', async (req, res) => {
    try {
        const { tanggal } = req.query;
        
        let query = `
            SELECT 
                t.id_ticket,
                u.username as nama,
                u.email,
                s.ship_name as kapal,
                s.route as tujuan,
                TIME_FORMAT(s.departure_time, '%H:%i') as waktu,
                s.price as harga,
                t.ticket_status as status,
                t.vehicle_number,
                t.created_at
            FROM TICKET t
            LEFT JOIN USERS u ON t.user_id = u.user_id
            LEFT JOIN SCHEDULE s ON t.schedule_id = s.schedule_id
        `;
        
        const params = [];
        
        // Filter by date if provided
        if (tanggal) {
            query += ' WHERE DATE(t.created_at) = ?';
            params.push(tanggal);
        }
        
        query += ' ORDER BY t.created_at DESC';
        
        const [pemesanan] = await db.promise().query(query, params);
        res.json({ success: true, data: pemesanan });
    } catch (err) {
        console.error('❌ Ticket Error:', err);
        res.status(500).json({ success: false, message: 'Gagal ambil data pemesanan' });
    }
});

// ==================== 👤 API - UPDATE USER PROFILE ====================
app.put('/api/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, no_whatsapp } = req.body;
        
        // Cek email tidak duplikat (kecuali milik sendiri)
        const [existing] = await db.promise().query(
            'SELECT user_id FROM USERS WHERE email = ? AND user_id != ?',
            [email, id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email sudah digunakan user lain' });
        }
        
        await db.promise().query(
            'UPDATE USERS SET username = ?, email = ?, no_whatsapp = ? WHERE user_id = ?',
            [username, email, no_whatsapp, id]
        );
        
        res.json({ success: true, message: 'Profil berhasil diperbarui' });
    } catch (err) {
        console.error('❌ Update User Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil' });
    }
});

// ==================== 🎫 API - PEMESANAN USER ====================
app.post('/api/pemesanan', async (req, res) => {
    try {
        const { user_id, schedule_id, nama, email, no_whatsapp, vehicle_number } = req.body;
        
        if (!user_id || !schedule_id || !nama || !email) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }
        
        // Cek jadwal masih tersedia
        const [schedules] = await db.promise().query(
            'SELECT * FROM SCHEDULE WHERE schedule_id = ? AND remaining_slot > 0 AND departure_status = "Terjadwal"',
            [schedule_id]
        );
        
        if (schedules.length === 0) {
            return res.status(400).json({ success: false, message: 'Jadwal tidak tersedia atau slot penuh' });
        }
        
        const schedule = schedules[0];
        
        // Buat tiket
        const [result] = await db.promise().query(
            'INSERT INTO TICKET (user_id, schedule_id, ticket_status, vehicle_number) VALUES (?, ?, ?, ?)',
            [user_id, schedule_id, 'Sukses', vehicle_number || null]
        );
        
        // Kurangi remaining slot
        await db.promise().query(
            'UPDATE SCHEDULE SET remaining_slot = remaining_slot - 1 WHERE schedule_id = ?',
            [schedule_id]
        );
        
        res.json({ 
            success: true, 
            message: 'Pemesanan berhasil', 
            id_ticket: result.insertId 
        });
    } catch (err) {
        console.error('❌ Create Pemesanan Error:', err);
        res.status(500).json({ success: false, message: 'Gagal membuat pemesanan' });
    }
});

// ==================== 🎫 API - RIWAYAT TIKET USER ====================
app.get('/api/tickets/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [tickets] = await db.promise().query(`
            SELECT 
                t.id_ticket,
                t.ticket_status,
                t.vehicle_number,
                t.created_at,
                s.ship_name,
                s.route,
                s.departure_time,
                DATE_FORMAT(s.departure_date, '%Y-%m-%d') as departure_date,
                s.price
            FROM TICKET t
            JOIN SCHEDULE s ON t.schedule_id = s.schedule_id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        `, [userId]);
        
        res.json({ success: true, data: tickets });
    } catch (err) {
        console.error('❌ Fetch Tickets Error:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil data tiket' });
    }
});

// ==================== 🚦 API - GATE SCANNER (Simulasi IoT) ====================
app.post('/api/gate/verify', async (req, res) => {
    try {
        const { plate_number } = req.body;
        
        if (!plate_number) {
            return res.status(400).json({ success: false, message: 'Plat nomor tidak terbaca' });
        }

        // 1. Bersihkan teks dari OCR 
        const cleanPlate = plate_number.replace(/[^A-Z0-9]/g, '').toUpperCase();

        // 2. Cari tiket yang valid di database
        const [tickets] = await db.promise().query(`
            SELECT 
                t.id_ticket, 
                t.vehicle_number, 
                s.departure_date, 
                s.departure_time, 
                s.ship_name, 
                s.route 
            FROM TICKET t
            JOIN SCHEDULE s ON t.schedule_id = s.schedule_id
            WHERE t.vehicle_number = ? AND t.ticket_status = 'Sukses'
            ORDER BY s.departure_date ASC, s.departure_time ASC
            LIMIT 1
        `, [cleanPlate]);

        // Jika plat nomor tidak punya tiket
        if (tickets.length === 0) {
            return res.json({ 
                success: true, 
                allowed: false, 
                message: 'Tiket tidak ditemukan! Silakan beli tiket terlebih dahulu.' 
            });
        }

        const ticket = tickets[0];
        
        // 3. Logika Aturan 2 Jam
        const departureStr = `${ticket.departure_date}T${ticket.departure_time}`;
        const departureTime = new Date(departureStr);
        const now = new Date();
        
        const diffMs = departureTime - now; 
        const diffHours = diffMs / (1000 * 60 * 60); 

        let allowed = false;
        let message = '';

        if (diffHours < 0) {
            message = 'Kapal sudah berangkat! Tiket hangus.';
        } else if (diffHours > 2) {
            message = `Terlalu awal! Waktu berangkat masih ${Math.floor(diffHours)} jam lagi. Silakan putar balik agar tidak menumpuk di parkiran.`;
        } else {
            allowed = true;
            const diffMinutes = Math.floor(diffHours * 60);
            message = `Tiket Valid! Silakan masuk ke area parkir. Kapal berangkat dalam ${diffMinutes} menit lagi.`;
        }

        res.json({
            success: true,
            allowed,
            message,
            ticket_info: {
                plat: cleanPlate,
                kapal: ticket.ship_name,
                rute: ticket.route,
                waktu_berangkat: departureTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
            }
        });

    } catch (err) {
        console.error('❌ Gate Verify Error:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// 🚀 START SERVER
app.listen(PORT, () => {
    console.log(`\n🚢 Backend berjalan: http://localhost:${PORT}`);
    console.log(`📡 API tersedia di http://localhost:${PORT}/api\n`);
});