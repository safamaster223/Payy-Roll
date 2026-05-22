1. Akun Admin HRD (Untuk Cek Semua Karyawan & Hitung Gaji)
Username: admin_hrd

Password: hash_password_admin_123

2. Akun Karyawan Biasa
Username: alghifari

Password: hash_password_alghifari_123

-- ==================================================================
-- BLUEPRINT DATABASE ENTERPRISE SYSTEM: db_payroll (VERSI PARAMETERISASI LIVE)
-- SYSTEM DESIGNED BY: ALGHIFARI AMAR MUKHASYAFAH
-- ==================================================================

CREATE DATABASE db_payroll;
GO
USE db_payroll;
GO

-- ==================================================================
-- [BAGIAN 1] STRUKTUR TABEL MASTER & TRANSAKSI
-- ==================================================================

CREATE TABLE master_jabatan (
    id_jabatan INT PRIMARY KEY IDENTITY(1,1),
    nama_jabatan VARCHAR(100) NOT NULL,
    gaji_pokok DECIMAL(18,2) NOT NULL,
    tunjangan_jabatan DECIMAL(18,2) NOT NULL
);

CREATE TABLE master_karyawan (
    id_karyawan INT PRIMARY KEY IDENTITY(1,1),
    id_jabatan INT FOREIGN KEY REFERENCES master_jabatan(id_jabatan),
    nik VARCHAR(50) UNIQUE NOT NULL,
    nama_karyawan VARCHAR(150) NOT NULL,
    status_aktif INT DEFAULT 1
);

CREATE TABLE master_user (
    id_user INT PRIMARY KEY IDENTITY(1,1),
    id_karyawan INT FOREIGN KEY REFERENCES master_karyawan(id_karyawan),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Karyawan'
);

CREATE TABLE rekap_absensi (
    id_rekap INT PRIMARY KEY IDENTITY(1,1),
    id_karyawan INT FOREIGN KEY REFERENCES master_karyawan(id_karyawan),
    bulan INT NOT NULL,
    tahun INT NOT NULL,
    jumlah_hadir INT DEFAULT 0,
    jumlah_alpa INT DEFAULT 0,
    total_jam_lembur INT DEFAULT 0,
    total_menit_terlambat INT DEFAULT 0 -- [BARU] Menampung akumulasi menit telat karyawan
);

CREATE TABLE log_absensi_harian (
    id_log INT PRIMARY KEY IDENTITY(1,1),
    id_karyawan INT FOREIGN KEY REFERENCES master_karyawan(id_karyawan),
    tanggal DATE NOT NULL,
    jam_masuk TIME NOT NULL,
    ip_address VARCHAR(50),
    waktu_server_masuk DATETIME DEFAULT GETDATE(),
    status_kehadiran VARCHAR(50)
);

CREATE TABLE pengajuan_lembur (
    id_lembur INT PRIMARY KEY IDENTITY(1,1),
    id_karyawan INT FOREIGN KEY REFERENCES master_karyawan(id_karyawan),
    tanggal_lembur DATE NOT NULL,
    durasi_jam INT NOT NULL,
    keterangan VARCHAR(255),
    status_approval VARCHAR(50) DEFAULT 'Pending'
);

CREATE TABLE slip_gaji_h (
    id_slip_h INT PRIMARY KEY IDENTITY(1,1),
    id_karyawan INT FOREIGN KEY REFERENCES master_karyawan(id_karyawan),
    bulan INT,
    tahun INT,
    total_pendapatan DECIMAL(18,2),
    total_potongan DECIMAL(18,2),
    gaji_bersih DECIMAL(18,2),
    status_bayar VARCHAR(50) DEFAULT 'Belum Dibayar'
);

CREATE TABLE slip_gaji_d (
    id_slip_d INT PRIMARY KEY IDENTITY(1,1),
    id_slip_h INT FOREIGN KEY REFERENCES slip_gaji_h(id_slip_h) ON DELETE CASCADE,
    nama_komponen VARCHAR(100),
    jenis_komponen VARCHAR(50), -- 'Pendapatan' atau 'Potongan'
    nominal DECIMAL(18,2)
);

CREATE TABLE audit_log_gaji (
    id_audit INT PRIMARY KEY IDENTITY(1,1),
    id_jabatan INT,
    gaji_pokok_lama DECIMAL(18,2),
    gaji_pokok_baru DECIMAL(18,2),
    tanggal_perubahan DATETIME DEFAULT GETDATE(),
    user_pelaksana VARCHAR(100) DEFAULT 'SYSTEM_HRD'
);

CREATE TABLE master_konfigurasi (
    id_config INT PRIMARY KEY IDENTITY(1,1),
    nama_parameter VARCHAR(100) UNIQUE NOT NULL,
    nilai_numeric DECIMAL(18,2) NOT NULL,
    keterangan VARCHAR(255)
);
GO


-- ==================================================================
-- [BAGIAN 2] DATA SEEDING INITIAL (DUMMY AWAL)
-- ==================================================================

INSERT INTO master_jabatan (nama_jabatan, gaji_pokok, tunjangan_jabatan) VALUES
('HRD Manager', 9000000.00, 1500000.00),
('Senior Software Engineer', 12000000.00, 2000000.00);

-- Insert Karyawan Utama (Alghifari Amar Mukhasyafah - Master 071)
INSERT INTO master_karyawan (id_jabatan, nik, nama_karyawan, status_aktif) VALUES
(2, 'NIK2026071', 'Alghifari Amar M', 1);

INSERT INTO master_user (id_karyawan, username, password_hash, role) VALUES
(1, 'alghifari071', 'admin071', 'HRD');

INSERT INTO rekap_absensi (id_karyawan, bulan, tahun, jumlah_hadir, jumlah_alpa, total_jam_lembur, total_menit_terlambat) VALUES
(1, 5, 2026, 21, 1, 5, 30); -- Simulasi: 1 Alpa, 5 Jam Lembur, Telat 30 Menit

INSERT INTO master_konfigurasi (nama_parameter, nilai_numeric, keterangan) VALUES
('TARIF_LEMBUR_PER_JAM', 50000.00, 'Upah lembur per jam karyawan'),
('DENDA_ALPA_PER_HARI', 150000.00, 'Potongan per hari jika mangkir kerja'),
('DENDA_TERLATM_PER_10_MENIT', 10000.00, 'Denda keterlambatan kelipatan per 10 menit');
GO


-- ==================================================================
-- [BAGIAN 3] SUPER-VIEW 360 DERAJAT
-- ==================================================================

CREATE VIEW v_DetailProfilKaryawan AS
SELECT 
    k.id_karyawan AS [ID_Karyawan],
    k.nik AS [NIK],
    k.nama_karyawan AS [Nama_Karyawan],
    j.nama_jabatan AS [Jabatan],
    
    j.gaji_pokok AS [Gaji_Pokok],
    j.tunjangan_jabatan AS [Tunjangan],
    (j.gaji_pokok / 22) AS [Gaji_Harian_Estimasi],
    
    ISNULL((SELECT u.username FROM master_user u WHERE u.id_karyawan = k.id_karyawan), 'Belum Ada Akun') AS [Username_Sistem],
    ISNULL((SELECT u.role FROM master_user u WHERE u.id_karyawan = k.id_karyawan), 'Karyawan') AS [Hak_Akses],
    
    ISNULL((SELECT r.jumlah_hadir FROM rekap_absensi r WHERE r.id_karyawan = k.id_karyawan AND r.bulan = 5 AND r.tahun = 2026), 0) AS [Total_Masuk_Bulan_Ini],
    ISNULL((SELECT r.jumlah_alpa FROM rekap_absensi r WHERE r.id_karyawan = k.id_karyawan AND r.bulan = 5 AND r.tahun = 2026), 0) AS [Total_Alpa_Bulan_Ini],
    
    ISNULL((SELECT TOP 1 sgh.gaji_bersih FROM slip_gaji_h sgh WHERE sgh.id_karyawan = k.id_karyawan ORDER BY sgh.tahun DESC, sgh.bulan DESC), 0) AS [Gaji_Terakhir_Diterima],
    ISNULL((SELECT TOP 1 sgd.nominal FROM slip_gaji_d sgd, slip_gaji_h sgh WHERE sgd.id_slip_h = sgh.id_slip_h AND sgh.id_karyawan = k.id_karyawan AND sgd.jenis_komponen = 'Potongan'), 0) AS [Snapshot_Denda_Terakhir],
    (SELECT COUNT(*) FROM log_absensi_harian lah WHERE lah.id_karyawan = k.id_karyawan AND lah.status_kehadiran = 'Hadir') AS [Total_Tap_Absen_Mesin]
FROM 
    master_karyawan k, 
    master_jabatan j
WHERE 
    k.id_jabatan = j.id_jabatan
    AND k.status_aktif = 1;
GO


-- ==================================================================
-- [BAGIAN 4] AUTOMATIC TRIGGER (AUDIT LOG SYSTEM)
-- ==================================================================

CREATE TRIGGER trg_AuditPerubahanGaji
ON master_jabatan
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Memasukkan riwayat lama vs baru jika terjadi update gaji pokok oleh HRD
    IF UPDATE(gaji_pokok)
    BEGIN
        INSERT INTO audit_log_gaji (id_jabatan, gaji_pokok_lama, gaji_pokok_baru, tanggal_perubahan, user_pelaksana)
        SELECT 
            d.id_jabatan,
            d.gaji_pokok,
            i.gaji_pokok,
            GETDATE(),
            'ADMIN_HRD_INTERFACE'
        FROM deleted d
        INNER JOIN inserted i ON d.id_jabatan = i.id_jabatan;
    END
END;
GO


-- ==================================================================
-- [BAGIAN 5] STORED PROCEDURE + CURSOR (ENGINE KREASI GAJI MASSAL)
-- ==================================================================

CREATE PROCEDURE sp_GeneratePayrollMassal
    @Bulan INT,
    @Tahun INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Mengambil parameter finansial global secara dinamis (Anti-Hardcode)
    DECLARE @NominalLemburPerJam DECIMAL(18,2) = (SELECT nilai_numeric FROM master_konfigurasi WHERE nama_parameter = 'TARIF_LEMBUR_PER_JAM');
    DECLARE @DendaAlpaPerHari DECIMAL(18,2) = (SELECT nilai_numeric FROM master_konfigurasi WHERE nama_parameter = 'DENDA_ALPA_PER_HARI');
    DECLARE @DendaTerlambatPer10Min DECIMAL(18,2) = (SELECT nilai_numeric FROM master_konfigurasi WHERE nama_parameter = 'DENDA_TERLATM_PER_10_MENIT');

    -- Variables Penampung Iterasi Data Karyawan
    DECLARE @IdKaryawan INT, @GajiPokok DECIMAL(18,2), @Tunjangan DECIMAL(18,2);
    DECLARE @JumlahHadir INT, @JumlahAlpa INT, @TotalJamLembur INT, @TotalMenitTerlambat INT;
    
    -- Variables Hasil Perhitungan Matematis Komponen
    DECLARE @TotalLembur DECIMAL(18,2), @TotalDendaAlpa DECIMAL(18,2), @TotalDendaTerlambat DECIMAL(18,2);
    DECLARE @TotalPotongan DECIMAL(18,2), @TotalPendapatan DECIMAL(18,2), @GajiBersih DECIMAL(18,2), @NewIdSlipH INT;

    -- ==============================================================
    -- THE SACRED CURSOR: Melakukan looping ke seluruh karyawan aktif
    -- ==============================================================
    DECLARE cursor_karyawan CURSOR FOR 
    SELECT k.id_karyawan, j.gaji_pokok, j.tunjangan_jabatan, 
           ISNULL(a.jumlah_hadir, 0), ISNULL(a.jumlah_alpa, 0), ISNULL(a.total_jam_lembur, 0), ISNULL(a.total_menit_terlambat, 0)
    FROM master_karyawan k
    INNER JOIN master_jabatan j ON k.id_jabatan = j.id_jabatan
    LEFT JOIN rekap_absensi a ON k.id_karyawan = a.id_karyawan AND a.bulan = @Bulan AND a.tahun = @Tahun
    WHERE k.status_aktif = 1;

    OPEN cursor_karyawan;
    
    -- Ambil baris data pertama kedalam variabel penampung
    FETCH NEXT FROM cursor_karyawan INTO @IdKaryawan, @GajiPokok, @Tunjangan, @JumlahHadir, @JumlahAlpa, @TotalJamLembur, @TotalMenitTerlambat;

    -- Looping berjalan selama data dalam antrian cursor masih ada (status 0)
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Logika Perhitungan Finansial Komprehensif
        SET @TotalLembur = @TotalJamLembur * @NominalLemburPerJam;
        SET @TotalDendaAlpa = @JumlahAlpa * @DendaAlpaPerHari;
        
        -- Formulasi Denda Kelipatan Waktu: Total Menit dibagi 10 dikali Nilai Parameter Tarif Denda
        SET @TotalDendaTerlambat = (@TotalMenitTerlambat / 10) * @DendaTerlambatPer10Min;

        SET @TotalPotongan = @TotalDendaAlpa + @TotalDendaTerlambat;
        SET @TotalPendapatan = @GajiPokok + @Tunjangan + @TotalLembur;
        SET @GajiBersih = @TotalPendapatan - @TotalPotongan;

        -- Proteksi Kebersihan Data: Hapus slip bulan berjalan lama jika ada re-kalkulasi ulang
        DELETE FROM slip_gaji_h WHERE id_karyawan = @IdKaryawan AND bulan = @Bulan AND tahun = @Tahun;
        
        -- Eksekusi INSERT ke Transaksi Header Slip Gaji
        INSERT INTO slip_gaji_h (id_karyawan, bulan, tahun, total_pendapatan, total_potongan, gaji_bersih, status_bayar)
        VALUES (@IdKaryawan, @Bulan, @Tahun, @TotalPendapatan, @TotalPotongan, @GajiBersih, 'Belum Dibayar');
        
        -- Mengambil ID Header barusan untuk di-couple ke detail rincian komponen
        SET @NewIdSlipH = SCOPE_IDENTITY();

        -- Eksekusi INSERT Detail Slip Gaji (Pecah Komponen agar rincian Slip Transparan & Akurat)
        INSERT INTO slip_gaji_d (id_slip_h, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 'Gaji Pokok Base', 'Pendapatan', @GajiPokok);
        INSERT INTO slip_gaji_d (id_slip_h, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 'Tunjangan Jabatan', 'Pendapatan', @Tunjangan);
        
        IF @TotalLembur > 0 
            INSERT INTO slip_gaji_d (id_slip_h, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 'Uang Lembur Aktif', 'Pendapatan', @TotalLembur);
        IF @TotalDendaAlpa > 0 
            INSERT INTO slip_gaji_d (id_slip_h, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 'Potongan Mangkir Kerja (Alpa)', 'Potongan', @TotalDendaAlpa);
        IF @TotalDendaTerlambat > 0 
            INSERT INTO slip_gaji_d (id_slip_h, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 'Denda Keterlambatan (Kelipatan 10m)', 'Potongan', @TotalDendaTerlambat);

        -- Bergeser maju mengambil baris data karyawan berikutnya dalam cursor
        FETCH NEXT FROM cursor_karyawan INTO @IdKaryawan, @GajiPokok, @Tunjangan, @JumlahHadir, @JumlahAlpa, @TotalJamLembur, @TotalMenitTerlambat;
    END;

    -- Menutup antrian dan membersihkan alokasi memori cursor dari server SQL
    CLOSE cursor_karyawan; 
    DEALLOCATE cursor_karyawan;
END;
GO