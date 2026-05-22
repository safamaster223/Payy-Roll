const { ambilSemuaKaryawan } = require('../models/Employee');

async function tampilkanDashboardKaryawan() {
    try {
        const employees = await ambilSemuaKaryawan();
        
        console.log('\n======================================================');
        console.log('       DASHBOARD HRD - DAFTAR KARYAWAN AKTIF          ');
        console.log('======================================================');
        
        if (employees.length > 0) {
            console.table(employees);
        } else {
            console.log('Data karyawan masih kosong.');
        }
        console.log('======================================================\n');
        
    } catch (error) {
        console.error('Terjadi kesalahan pada Employee Controller:', error.message);
    }
}

module.exports = { tampilkanDashboardKaryawan };