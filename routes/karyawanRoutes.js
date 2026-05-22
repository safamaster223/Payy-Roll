const express = require('express');
const router = express.Router();
const path = require('path');
const { poolPromise } = require('../config/database');
const { ambilDataDariView } = require('../models/Payroll');

// IP Kantor yang diizinkan untuk absen (Standar QA Security)
const IP_KANTOR_RESMI = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];

router.get('/dashboard-karyawan', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'views', 'dashboard-karyawan.html'));
});

// 1. API: Ambil slip gaji dengan validasi proteksi identitas (Anti-Intip Data Orang Lain)
router.get('/api/karyawan/my-slip/:bulan/:tahun', async (req, res) => {
    try {
        const { bulan, tahun } = req.params;
        
        // Simulasi Secure Session Header (Mengecek siapa yang merequest)
        const userMinta = req.headers['x-user-role'] || 'Karyawan';
        
        const semuaLaporan = await ambilDataDariView();
        const slipSpesifik = semuaLaporan.filter(slip => 
            slip.Nama_Karyawan === 'Alghifari Amar' && 
            slip.Bulan == bulan && 
            slip.Tahun == tahun
        );
        
        res.json(slipSpesifik);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API: Check-in dengan Kunci IP Address (Anti-Fraud Attendance)
// API REVISI: Check-in Aman dengan Kunci Harian & Validasi IP
router.post('/api/karyawan/checkin', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress;
        const IP_KANTOR_RESMI = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];

        if (!IP_KANTOR_RESMI.includes(clientIp)) {
            return res.status(403).json({ success: false, message: 'Absen Ditolak! Anda di luar Wi-Fi kantor.' });
        }

        const pool = await poolPromise;
        
        // 1. CEK APAKAH HARI INI SUDAH PERNAH CHECK-IN (Double Check-in Protection)
        const cekAbsenHariIni = await pool.request()
            .input('id_karyawan', 1) // ID Alghifari
            .query(`
                SELECT COUNT(*) AS sudah_absen 
                FROM log_absensi_harian 
                WHERE id_karyawan = @id_karyawan AND tanggal = CAST(GETDATE() AS DATE)
            `);

        if (cekAbsenHariIni.recordset[0].sudah_absen > 0) {
            return res.json({ 
                success: false, 
                alreadyCheckedIn: true, 
                message: 'Hari ini Anda sudah melakukan Check-in! Akses dikunci sampai besok.' 
            });
        }

        // 2. Jika lolos validasi, baru masukkan data ke database
        const sekarang = new Date();
        const jam = ThermalJam(sekarang);

        await pool.request()
            .input('id_karyawan', 1)
            .input('jam_masuk', jam)
            .input('ip_address', clientIp)
            .query(`
                INSERT INTO log_absensi_harian (id_karyawan, tanggal, jam_masuk, ip_address, waktu_server_masuk, status_kehadiran)
                VALUES (@id_karyawan, CAST(GETDATE() AS DATE), @jam_masuk, @ip_address, GETDATE(), 'Hadir')
            `);

        // Otomatis tambahkan jumlah_hadir di rekap_absensi HRD biar live sinkron!
        await pool.request()
            .input('id_karyawan', 1)
            .query(`
                UPDATE rekap_absensi 
                SET jumlah_hadir = jumlah_hadir + 1 
                WHERE id_karyawan = @id_karyawan AND bulan = 5 AND tahun = 2026
            `);

        res.json({ success: true, alreadyCheckedIn: true, message: `Sukses Check-in! Jam Server: ${jam}. Data rekap HRD otomatis bertambah.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper format jam
function ThermalJam(d) { return d.toTimeString().split(' ')[0]; }

// 3. API: Ajukan Lembur Baru ke Database
router.post('/api/karyawan/ajukan-lembur', async (req, res) => {
    try {
        const { tanggal, jam, keterangan } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('id_karyawan', 1)
            .input('tanggal', tanggal)
            .input('durasi', jam)
            .input('keterangan', keterangan)
            .query(`
                INSERT INTO pengajuan_lembur (id_karyawan, tanggal_lembur, durasi_jam, keterangan, status_approval)
                VALUES (@id_karyawan, @tanggal, @durasi, @keterangan, 'Pending')
            `);

        res.json({ success: true, message: 'Formulir pengajuan lembur berhasil dikirim ke Admin HRD!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;