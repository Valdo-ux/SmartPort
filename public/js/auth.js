// Handle Register Form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            nama: document.getElementById('nama').value,
            email: document.getElementById('email').value,
            no_hp: document.getElementById('no_hp').value,
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm_password').value
        };
        
        // Validasi client-side
        if (formData.password.length < 6) {
            alert('❌ Password minimal 6 karakter');
            return;
        }
        
        if (formData.password !== formData.confirm_password) {
            alert('❌ Password dan konfirmasi password tidak cocok');
            return;
        }
        
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const result = await res.json();
            
            if (result.success) {
                alert('✅ ' + result.message);
                window.location.href = '/login'; // Redirect ke login
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            alert('❌ Koneksi error. Coba lagi.');
            console.error(err);
        }
    });
}

// Handle Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const result = await res.json();
            
            if (result.success) {
                alert('✅ ' + result.message);
                // Simpan user info di localStorage (sederhana)
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = '/index.html'; // Redirect ke halaman utama
            } else {
                alert('❌ ' + result.message);
            }
        } catch (err) {
            alert('❌ Koneksi error. Coba lagi.');
            console.error(err);
        }
    });
}