const express = require('express');
const router = express.Router();
const { loginAplikasi } = require('../controllers/AuthController');

// Jalur API untuk login
router.post('/api/login', loginAplikasi);

// PASTIKAN LINE INI EXPORT ROUTER, BUKAN FUNGSINYA!
module.exports = router;