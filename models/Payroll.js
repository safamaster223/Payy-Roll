const { poolPromise } = require('../config/database');

async function jalankanStoredProcedureGaji(bulan, tahun) {
    const pool = await poolPromise;
    try {
        await pool.request()
            .input('Bulan', bulan)
            .input('Tahun', tahun)
            .execute('sp_GeneratePayrollMassal'); 
        return true;
    } catch (err) {
        console.error('Error di Model Payroll (SP):', err.message);
        throw err;
    }
}

async function ambilDataDariView() {
    const pool = await poolPromise;
    try {
        const result = await pool.request().query('SELECT * FROM v_LaporanPenggajian');
        return result.recordset;
    } catch (err) {
        console.error('Error di Model Payroll (View):', err.message);
        throw err;
    }
}

module.exports = { jalankanStoredProcedureGaji, ambilDataDariView };