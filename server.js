const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔌 Koneksi MySQL (XAMPP default)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pelabuhan_pintar'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal konek ke MySQL:', err.message);
        console.log('💡 Pastikan MySQL XAMPP sudah START');
        return;
    }
    console.log('✅ Terkoneksi ke MySQL');
});

// 📊 Auto-create tabel
const initDatabase = async () => {
    try {
        // Tabel bookings
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tujuan VARCHAR(100) NOT NULL,
                jenis_pengguna VARCHAR(50) NOT NULL,
                penumpang VARCHAR(10) NOT NULL,
                kelas VARCHAR(50) NOT NULL,
                jadwal VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel bookings siap');
        
        // Tabel users
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                no_hp VARCHAR(15),
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel users siap');
        
        // Tabel antrian
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS antrian (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                kode_antrian VARCHAR(20) UNIQUE,
                status ENUM('menunggu', 'diproses', 'selesai') DEFAULT 'menunggu',
                estimasi_waktu VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel antrian siap');
        
    } catch (err) {
        console.error('❌ Error init database:', err);
    }
};
initDatabase();

// ==================== 🌐 ROUTES - PUBLIC PAGES ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==================== 👤 ROUTES - USER PAGES ====================
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'dashboard.html'));
});

app.get('/jadwal-kapal', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'jadwal-kapal.html'));
});

app.get('/pesan-tiket', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'pesan-tiket.html'));
});

app.get('/tiket-saya', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'tiket-saya.html'));
});

app.get('/riwayat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'riwayat.html'));
});

// ==================== 👨‍💼 ROUTES - ADMIN PAGES ====================
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'dashboard.html'));
});

app.get('/admin/jadwal', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'jadwal.html'));
});

app.get('/admin/pemesanan', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'pemesanan.html'));
});

// ==================== 🔐 API - AUTH ====================
app.post('/api/register', async (req, res) => {
    try {
        const { nama, email, no_hp, password, confirm_password } = req.body;
        
        if (!nama || !email || !password) {
            return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
        }
        if (password !== confirm_password) {
            return res.status(400).json({ success: false, message: 'Konfirmasi password tidak cocok' });
        }
        
        const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.promise().query(
            'INSERT INTO users (nama, email, no_hp, password) VALUES (?, ?, ?, ?)',
            [nama, email, no_hp, hashedPassword]
        );
        
        res.json({ success: true, message: 'Registrasi berhasil! Silakan login.', userId: result.insertId });
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
        
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        
        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        
        res.json({ success: true, message: 'Login berhasil!', user: { id: user.id, nama: user.nama, email: user.email } });
    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// ==================== 🚢 API - BOOKING & JADWAL ====================
app.post('/api/cari-jadwal', async (req, res) => {
    try {
        const { tujuan, jenisPengguna, penumpang, kelas, jadwal } = req.body;
        const [result] = await db.promise().query(
            'INSERT INTO bookings (tujuan, jenis_pengguna, penumpang, kelas, jadwal) VALUES (?, ?, ?, ?, ?)',
            [tujuan, jenisPengguna, penumpang, kelas, jadwal]
        );
        
        const kodeAntrian = `ANTR-${Date.now().toString().slice(-6)}`;
        await db.promise().query(
            'INSERT INTO antrian (user_id, kode_antrian, estimasi_waktu) VALUES (?, ?, ?)',
            [1, kodeAntrian, '15-30 menit']
        );
        
        res.json({ success: true, message: 'Jadwal berhasil diproses', data: { id: result.insertId, tujuan, jadwal, kode_antrian: kodeAntrian } });
    } catch (err) {
        console.error('❌ DB Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memproses jadwal' });
    }
});

app.get('/api/dashboard-data', async (req, res) => {
    try {
        const userId = req.query.userId || 1;
        const [users] = await db.promise().query('SELECT nama FROM users WHERE id = ?', [userId]);
        const [stats] = await db.promise().query('SELECT COUNT(*) as total FROM bookings WHERE user_id = ?', [userId]);
        const [antrian] = await db.promise().query('SELECT * FROM antrian WHERE user_id = ? AND status != "selesai" LIMIT 1', [userId]);
        
        res.json({
            success: true,
            nama: users[0]?.nama || 'User',
            totalBooking: stats[0]?.total || 0,
            antrian: antrian[0] || null
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal ambil data' });
    }
});

app.get('/api/kepadatan', (req, res) => {
    const data = {
        labels: ['08:00', '09:00', '10:15', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
        kedatangan: [30, 50, 70, 70, 30, 30, 50, 30, 20],
        keberangkatan: [12, 5, 40, 50, 20, 19, 11, 7, 50],
        antrian: [0, 0, 12, 80, 0, 0, 0, 0, 3]
    };
    res.json({ success: true, data });
});

app.get('/api/jadwal', async (req, res) => {
    try {
        const { rute, tanggal } = req.query;
        // Fallback data dummy jika tabel belum ada
        const dummyData = [
            { nama_kapal: 'Kapal Barunajaya', rute: 'Pungggur - Tj. Uban', jam_keberangkatan: '09:30 WIB', status: 'Tersedia' },
            { nama_kapal: 'KM. Bukit Raya', rute: 'Pungggur - Tj. Uban', jam_keberangkatan: '11:00 WIB', status: 'Tersedia' },
            { nama_kapal: 'KM. Bahari Nusantara', rute: 'Pungggur - Tj. Uban', jam_keberangkatan: '13:30 WIB', status: 'Penuh' }
        ];
        res.json({ success: true, data: dummyData });
    } catch (err) {
        res.json({ success: true, data: [] });
    }
});

// Route untuk Halaman Tiket Saya
app.get('/tiket-saya', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'tiket-saya.html'));
});

// Route untuk Halaman Riwayat
app.get('/riwayat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pengguna', 'riwayat.html'));
});
// 🚀 START SERVER (PALING BAWAH!)
app.listen(PORT, () => {
    console.log(`\n🚢 Server berjalan: http://localhost:${PORT}`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin/dashboard`);
    console.log(`👤 User Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🚢 Jadwal Kapal: http://localhost:${PORT}/jadwal-kapal\n`);
});