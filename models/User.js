const { poolPromise } = require('../config/database');

// Fungsi murni untuk cek username di tabel master_user
async function cekUsername(username) {
    const pool = await poolPromise;
    try {
        const result = await pool.request()
            .input('input_user', username)
            .query("SELECT * FROM master_user WHERE username = @input_user");
        
        return result.recordset[0];
    } catch (err) {
        console.error('Error di Model User:', err.message);
        throw err;
    }
}

module.exports = { cekUsername };