const express = require('express');
const router = express.Router();
const path = require('path');
const { poolPromise } = require('../config/database');
const { ambilSemuaKaryawan } = require('../models/Employee');
const { jalankanStoredProcedureGaji, ambilDataDariView } = require('../models/Payroll');

// Navigasi halaman HTML Dashboard HRD
router.get('/dashboard-hrd', (req, res) => {
    res.sendFile(path.join(__dirname, '../', 'views', 'dashboard-hrd.html'));
});

// ==================================================================
// [FIXED] 1. API: AMBIL SEMUA MASTER KARYAWAN (UNTUK TABEL UTAMA)
// ==================================================================
router.get('/api/hrd/employees', async (req, res) => {
    try {
        const data = await ambilSemuaKaryawan();
        res.json(data);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// ==================================================================
// 2. API: AMBIL DETAIL PROFIL 360 DARI SUPER-VIEW GAYA WHERE
// ==================================================================
router.get('/api/hrd/employee-detail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('id_karyawan', id)
            .query('SELECT * FROM v_DetailProfilKaryawan WHERE ID_Karyawan = @id_karyawan');
            
        if (result.recordset.length === 0) {
            console.log(`⚠️ QA Log: ID Karyawan ${id} tidak ditemukan di dalam VIEW.`);
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('❌ ERROR ASLI SQL SERVER DI BACKEND:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. API: Ambil semua Master Jabatan (Buat Dropdown & Edit Gaji)
router.get('/api/hrd/jabatans', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM master_jabatan');
        res.json(result.recordset);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 4. API: Tambah Karyawan Baru + Otomatis Buat Akun Login (Onboarding System)
router.post('/api/hrd/add-karyawan', async (req, res) => {
    try {
        const { nama, nik, id_jabatan, username, password } = req.body;
        const pool = await poolPromise;

        // Transaksi 1: Insert ke master_karyawan
        const resultKaryawan = await pool.request()
            .input('nama', nama)
            .input('nik', nik)
            .input('id_jabatan', id_jabatan)
            .query(`
                INSERT INTO master_karyawan (id_jabatan, nik, nama_karyawan, status_aktif)
                OUTPUT INSERTED.id_karyawan
                VALUES (@id_jabatan, @nik, @nama, 1)
            `);
        
        const newIdKaryawan = resultKaryawan.recordset[0].id_karyawan;

        // Transaksi 2: Insert ke master_user
        await pool.request()
            .input('id_karyawan', newIdKaryawan)
            .input('username', username)
            .input('password', password)
            .query(`
                INSERT INTO master_user (id_karyawan, username, password_hash, role)
                VALUES (@id_karyawan, @username, @password, 'Karyawan')
            `);

        // Transaksi 3: Buatkan rekap absensi default bulan 5 tahun 2026
        await pool.request()
            .input('id_karyawan', newIdKaryawan)
            .query(`
                INSERT INTO rekap_absensi (id_karyawan, bulan, tahun, jumlah_hadir, jumlah_alpa, total_jam_lembur)
                VALUES (@id_karyawan, 5, 2026, 22, 0, 0)
            `);

        res.json({ success: true, message: `Karyawan ${nama} & Akun User berhasil didaftarkan ke sistem!` });
    } catch (err) { 
        res.status(500).json({ success: false, message: err.message }); 
    }
});

// 5. API: Update Gaji Pokok Jabatan (Memicu TRIGGER Database Audit)
router.post('/api/hrd/update-gaji', async (req, res) => {
    try {
        const { id_jabatan, gaji_baru } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('id_jabatan', id_jabatan)
            .input('gaji_baru', gaji_baru)
            .query(`
                UPDATE master_jabatan 
                SET gaji_pokok = @gaji_baru 
                WHERE id_jabatan = @id_jabatan
            `);

        res.json({ success: true, message: 'Gaji Pokok berhasil diperbarui! TRIGGER log audit terpicu otomatis.' });
    } catch (err) { 
        res.status(500).json({ success: false, message: err.message }); 
    }
});

// 6. API: Ambil semua pengajuan lembur yang butuh tindakan HRD
router.get('/api/hrd/list-lembur', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT l.id_lembur, k.nama_karyawan, l.tanggal_lembur, l.durasi_jam, l.keterangan, l.status_approval
            FROM pengajuan_lembur l
            INNER JOIN master_karyawan k ON l.id_karyawan = k.id_karyawan
            ORDER BY l.status_approval DESC, l.tanggal_lembur DESC
        `);
        res.json(result.recordset);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 7. API: Aksi Konfirmasi HRD (Approve / Reject)
router.post('/api/hrd/action-lembur', async (req, res) => {
    try {
        const { id_lembur, status_baru } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('id_lembur', id_lembur)
            .input('status_baru', status_baru)
            .query('UPDATE pengajuan_lembur SET status_approval = @status_baru WHERE id_lembur = @id_lembur');

        if (status_baru === 'Approved') {
            await pool.request()
                .input('id_lembur', id_lembur)
                .query(`
                    UPDATE rekap_absensi
                    SET total_jam_lembur = total_jam_lembur + (SELECT durasi_jam FROM pengajuan_lembur WHERE id_lembur = @id_lembur)
                    WHERE id_karyawan = (SELECT id_karyawan FROM pengajuan_lembur WHERE id_lembur = @id_lembur) AND bulan = 5 AND tahun = 2026
                `);
        }
        res.json({ success: true, message: `Status lembur berhasil diubah ke ${status_baru}!` });
    } catch (err) { 
        res.status(500).json({ success: false, message: err.message }); 
    }
});

// 8. API: Ambil Laporan Penggajian dari VIEW
router.get('/api/hrd/payroll-report', async (req, res) => {
    try {
        const laporan = await ambilDataDariView();
        res.json(laporan);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 9. API: Trigger Stored Procedure + Cursor
// API BARU: Mengubah parameter global konfigurasi keuangan payroll (Lurus Tanpa Class)
router.post('/api/hrd/update-config', async (req, res) => {
    try {
        const { param_name, nilai_baru } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('parameter', param_name)
            .input('nilai', nilai_baru)
            .query(`
                UPDATE master_konfigurasi 
                SET nilai_numeric = @nilai
                WHERE nama_parameter = @parameter
            `);

        res.json({ success: true, message: `Parameter ${param_name} berhasil diubah menjadi Rp ${parseFloat(nilai_baru).toLocaleString('id-ID')}!` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;