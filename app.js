const express = require('express');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const hrdRoutes = require('./routes/hrdRoutes');
const karyawanRoutes = require('./routes/karyawanRoutes');

const app = express();
const PORT = 3000;

// Middleware Wajib Server Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MENYEDIAKAN AKSES UNTUK FOLDER PUBLIC (CSS, IMAGES, JS FRONTEND)
app.use(express.static(path.join(__dirname, 'public')));

// Registrasi Semua Modul Routing Arsitektur MVC
app.use(authRoutes);
app.use(hrdRoutes);
app.use(karyawanRoutes);

// Jalur Masuk Utama Halaman Login UI Browser
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Jalankan Mesin Server Web
app.listen(PORT, () => {
    console.log(`==================================================================`);
    console.log(`🚀 ENTERPRISE PAYROLL SYSTEM - AMUNISI MVC SELESAI TOTAL!         `);
    console.log(`🌐 Semua folder terisi padat. Buka browser: http://localhost:${PORT} `);
    console.log(`==================================================================`);
});