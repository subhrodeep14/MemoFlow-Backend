// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { login, register, logout, me } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, login);
router.post('/register', register);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

module.exports = router;
