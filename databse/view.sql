USE db_payroll;
GO

CREATE VIEW v_LaporanPenggajian AS
SELECT 
    h.id_slip_h AS [ID_Slip],
    k.nik AS [NIK],
    k.nama_karyawan AS [Nama_Karyawan],
    j.nama_jabatan AS [Jabatan],
    h.bulan AS [Bulan],
    h.tahun AS [Tahun],
    d.nama_komponen AS [Komponen_Gaji],
    d.jenis_komponen AS [Kategori],
    d.nominal AS [Nominal],
    h.gaji_bersih AS [Total_Gaji_Bersih],
    h.status_bayar AS [Status_Bayar]
FROM slip_gaji_h h
INNER JOIN master_karyawan k ON h.id_karyawan = k.id_karyawan
INNER JOIN master_jabatan j ON k.id_jabatan = j.id_jabatan
INNER JOIN slip_gaji_d d ON h.id_slip_h = d.id_slip_h;
GO