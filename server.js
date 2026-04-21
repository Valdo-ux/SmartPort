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

// 📊 Auto-create tabel (pakai promise biar async rapi)
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
        
        // Tabel users (baru untuk login/register)
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
    } catch (err) {
        console.error('❌ Error init database:', err);
    }
};

initDatabase();

// 🌐 Routes - Halaman
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 🔐 API: Registrasi User Baru
app.post('/api/register', async (req, res) => {
    try {
        const { nama, email, no_hp, password, confirm_password } = req.body;
        
        // Validasi input
        if (!nama || !email || !password) {
            return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
        }
        
        if (password !== confirm_password) {
            return res.status(400).json({ success: false, message: 'Konfirmasi password tidak cocok' });
        }
        
        // Cek email sudah terdaftar
        const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
        }
        
        // Hash password (enkripsi)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Simpan ke database
        const query = `INSERT INTO users (nama, email, no_hp, password) VALUES (?, ?, ?, ?)`;
        const [result] = await db.promise().query(query, [nama, email, no_hp, hashedPassword]);
        
        res.json({ 
            success: true, 
            message: 'Registrasi berhasil! Silakan login.',
            userId: result.insertId 
        });
        
    } catch (err) {
        console.error('❌ Register Error:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// 🔐 API: Login User
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
        }
        
        // Cari user berdasarkan email
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        
        const user = users[0];
        
        // Verifikasi password (bandingkan dengan hash)
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        
        // Login berhasil!
        res.json({ 
            success: true, 
            message: 'Login berhasil!',
            user: { id: user.id, nama: user.nama, email: user.email }
        });
        
    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// 🚢 API: Cari Jadwal (untuk user yang sudah login)
app.post('/api/cari-jadwal', async (req, res) => {
    try {
        const { tujuan, jenisPengguna, penumpang, kelas, jadwal } = req.body;
        
        const query = `INSERT INTO bookings (tujuan, jenis_pengguna, penumpang, kelas, jadwal) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await db.promise().query(query, [tujuan, jenisPengguna, penumpang, kelas, jadwal]);
        
        res.json({ 
            success: true, 
            message: 'Jadwal berhasil diproses', 
            data: { id: result.insertId, tujuan, jadwal } 
        });
    } catch (err) {
        console.error('❌ DB Error:', err);
        res.status(500).json({ success: false, message: 'Gagal memproses jadwal' });
    }
});

// 🚀 Start Server
app.listen(PORT, () => {
    console.log(`🚢 Server jalan di http://localhost:${PORT}`);
});