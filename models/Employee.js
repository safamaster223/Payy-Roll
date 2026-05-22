const { poolPromise } = require('../config/database');

async function ambilSemuaKaryawan() {
    const pool = await poolPromise;
    try {
        const result = await pool.request().query(`
            SELECT k.id_karyawan, k.nik, k.nama_karyawan, j.nama_jabatan 
            FROM master_karyawan k
            INNER JOIN master_jabatan j ON k.id_jabatan = j.id_jabatan
            WHERE k.status_aktif = 1
        `);
        return result.recordset;
    } catch (err) {
        console.error('Error di Model Employee:', err.message);
        throw err;
    }
}

module.exports = { ambilSemuaKaryawan };