const { cekUsername } = require('../models/User');

async function loginAplikasi(req, res) {
    try {
        const { username, password } = req.body;

        // 1. Ambil data user dari model
        const userdata = await cekUsername(username);

        // 2. Jika username tidak ditemukan
        if (!userdata) {
            return res.status(401).json({ success: false, message: 'Username tidak terdaftar!' });
        }

        // 3. Jika password salah
        if (userdata.password_hash !== password) {
            return res.status(401).json({ success: false, message: 'Password salah!' });
        }

        // 4. Jika sukses, kirim data role ke frontend untuk proses redirect halaman
        return res.json({
            success: true,
            message: 'Login Berhasil!',
            role: userdata.role
        });

    } catch (error) {
        console.error('Error di AuthController:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
}

module.exports = { loginAplikasi };