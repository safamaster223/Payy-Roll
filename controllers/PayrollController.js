const { jalankanStoredProcedureGaji, ambilDataDariView } = require('../models/Payroll');

async function hitungDanCetakLaporanGaji() {
    try {
        const bulanUji = 5;
        const tahunUji = 2026;

        console.log(`\n⏳ Pemicu Otomatis: Menghitung Gaji Massal Periode ${bulanUji}-${tahunUji}...`);
        
        // 1. Eksekusi Stored Procedure + Cursor
        await jalankanStoredProcedureGaji(bulanUji, tahunUji);
        console.log('✅ Stored Procedure & Cursor selesai memproses seluruh karyawan!');

        // 2. Ambil data dari VIEW database
        const laporan = await ambilDataDariView();

        console.log('\n====================================================================================');
        console.log('                      HRD INTERFACE - LAPORAN RINCIAN GAJI (VIEW)                   ');
        console.log('====================================================================================');
        console.table(laporan);
        console.log('====================================================================================\n');

    } catch (error) {
        console.error('Terjadi kesalahan pada Payroll Controller:', error.message);
    }
}

module.exports = { hitungDanCetakLaporanGaji };