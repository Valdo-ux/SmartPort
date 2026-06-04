document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadKepadatanChart();
});

async function loadUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Default values jika user belum login
        const nama = user.nama || 'User';
        const email = user.email || 'user@email.com';
        const initial = nama.charAt(0).toUpperCase();
        
        // Update UI
        document.getElementById('userName').textContent = nama;
        document.getElementById('userInitial').textContent = initial;
        document.getElementById('userInitialLarge').textContent = initial;
        document.getElementById('profileName').textContent = nama;
        document.getElementById('profileFullName').textContent = nama;
        document.getElementById('profileEmail').textContent = email;
        
        // Fetch data dari API jika user sudah login
        if (user.id) {
            const res = await fetch(`/api/dashboard-data?userId=${user.id}`);
            const result = await res.json();
            
            if (result.success) {
                document.getElementById('userName').textContent = result.nama;
                document.getElementById('profileName').textContent = result.nama;
                document.getElementById('profileFullName').textContent = result.nama;
                document.getElementById('userInitial').textContent = result.nama.charAt(0).toUpperCase();
                document.getElementById('userInitialLarge').textContent = result.nama.charAt(0).toUpperCase();
                
                if (result.antrian) {
                    document.getElementById('antrianCode').textContent = result.antrian.kode_antrian;
                }
            }
        }
    } catch (err) {
        console.error('Error load data:', err);
    }
}

async function loadKepadatanChart() {
    try {
        const res = await fetch('/api/kepadatan');
        const result = await res.json();
        
        if (result.success) {
            const ctx = document.getElementById('kepadatanChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: result.data.labels,
                    datasets: [
                        {
                            label: 'Kedatangan',
                            data: result.data.kedatangan,
                            backgroundColor: '#22c55e',
                            borderRadius: 4
                        },
                        {
                            label: 'Antrian',
                            data: result.data.antrian,
                            backgroundColor: '#fbbf24',
                            borderRadius: 4
                        },
                        {
                            label: 'Keberangkatan',
                            data: result.data.keberangkatan,
                            backgroundColor: '#ef4444',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: (value) => value + '%' }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error load chart:', err);
    }
}