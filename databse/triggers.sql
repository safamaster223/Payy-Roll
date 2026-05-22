USE db_payroll;
GO

CREATE TRIGGER trg_AuditPerubahanGaji
ON master_jabatan
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(gaji_pokok)
    BEGIN
        INSERT INTO log_perubahan_gaji (id_jabatan, nama_jabatan, gaji_pokok_lama, gaji_pokok_baru, user_pemasok, waktu_perubahan)
        SELECT d.id_jabatan, d.nama_jabatan, d.gaji_pokok, i.gaji_pokok, ORIGINAL_LOGIN(), GETDATE()
        FROM deleted d
        INNER JOIN inserted i ON d.id_jabatan = i.id_jabatan;
    END
END;
GO