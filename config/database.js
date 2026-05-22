const sql = require('mssql');

const config = {
    server: 'localhost',
    instanceName: 'MSSQLSERVER', 
    database: 'db_payroll',
    // MENGGUNAKAN USER BARU YANG BARU KITA BUAT
    user: 'heker_payroll',                          
    password: '1', // <--- Cukup angka 1 saja sesuai perintah SQL tadi
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000 
    }
};

// Membuat koneksi pool global
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('⚡ Mantap! JavaScript Berhasil Terhubung ke Microsoft SQL Server menggunakan User Baru.');
        return pool;
    })
    .catch(err => {
        console.error('❌ Database Connection Failed! Bad Config: ', err.message);
        throw err;
    });

module.exports = { sql, poolPromise };