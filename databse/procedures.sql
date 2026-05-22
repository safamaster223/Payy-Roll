USE db_payroll;
GO

CREATE PROCEDURE sp_GeneratePayrollMassal
    @Bulan INT,
    @Tahun INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @IdKaryawan INT, @GajiPokok DECIMAL(18,2), @Tunjangan DECIMAL(18,2);
    DECLARE @JumlahHadir INT, @JumlahAlpa INT, @TotalJamLembur INT;
    DECLARE @NominalLemburPerJam DECIMAL(18,2) = 50000.00;
    DECLARE @DendaAlpaPerHari DECIMAL(18,2) = 150000.00;
    DECLARE @TotalLembur DECIMAL(18,2), @TotalPotongan DECIMAL(18,2), @TotalPendapatan DECIMAL(18,2), @GajiBersih DECIMAL(18,2), @NewIdSlipH INT;

    DECLARE cursor_karyawan CURSOR FOR 
    SELECT k.id_karyawan, j.gaji_pokok, j.tunjangan_jabatan, ISNULL(a.jumlah_hadir, 0), ISNULL(a.jumlah_alpa, 0), ISNULL(a.total_jam_lembur, 0)
    FROM master_karyawan k
    INNER JOIN master_jabatan j ON k.id_jabatan = j.id_jabatan
    LEFT JOIN rekap_absensi a ON k.id_karyawan = a.id_karyawan AND a.bulan = @Bulan AND a.tahun = @Tahun
    WHERE k.status_aktif = 1;

    OPEN cursor_karyawan;
    FETCH NEXT FROM cursor_karyawan INTO @IdKaryawan, @GajiPokok, @Tunjangan, @JumlahHadir, @JumlahAlpa, @TotalJamLembur;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @TotalLembur = @TotalJamLembur * @NominalLemburPerJam;
        SET @TotalPotongan = @JumlahAlpa * @DendaAlpaPerHari;
        SET @TotalPendapatan = @GajiPokok + @Tunjangan + @TotalLembur;
        SET @GajiBersih = @TotalPendapatan - @TotalPotongan;

        DELETE FROM slip_gaji_h WHERE id_karyawan = @IdKaryawan AND bulan = @Bulan AND tahun = @Tahun;
        INSERT INTO slip_gaji_h (id_karyawan, bulan, tahun, total_pendapatan, total_potongan, gaji_bersih, status_bayar)
        VALUES (@IdKaryawan, @Bulan, @Tahun, @TotalPendapatan, @TotalPotongan, @GajiBersih, 'Belum Dibayar');
        SET @NewIdSlipH = SCOPE_IDENTITY();

        INSERT INTO slip_gaji_d (id_slip_h, id_komponen, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, NULL, 'Gaji Pokok Snapshot', 'Pendapatan', @GajiPokok);
        INSERT INTO slip_gaji_d (id_slip_h, id_komponen, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, NULL, 'Tunjangan Jabatan Snapshot', 'Pendapatan', @Tunjangan);
        IF @TotalLembur > 0 INSERT INTO slip_gaji_d (id_slip_h, id_komponen, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 1, 'Uang Lembur Per Jam', 'Pendapatan', @TotalLembur);
        IF @TotalPotongan > 0 INSERT INTO slip_gaji_d (id_slip_h, id_komponen, nama_komponen, jenis_komponen, nominal) VALUES (@NewIdSlipH, 2, 'Potongan Alpa Per Hari', 'Potongan', @TotalPotongan);

        FETCH NEXT FROM cursor_karyawan INTO @IdKaryawan, @GajiPokok, @Tunjangan, @JumlahHadir, @JumlahAlpa, @TotalJamLembur;
    END;
    CLOSE cursor_karyawan; DEALLOCATE cursor_karyawan;
END;
GO