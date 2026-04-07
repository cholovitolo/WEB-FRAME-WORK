// routes/authRoutes.js
const express = require('express');
const router  = express.Router();

const {
  register, login, logout, getMe, updateProfile, changePassword,
} = require('../controllers/AuthController');

const { protect } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validateMiddleware');

// Public
router.post('/register', validateRegister, register);
router.post('/login',    validateLogin,    login);
router.post('/logout',   logout);

// Protected
router.get('/me',                  protect, getMe);
router.put('/profile',             protect, updateProfile);
router.put('/change-password',     protect, changePassword);


router.get('/users/profile',       protect, getMe);
router.put('/users/profile',       protect, updateProfile);

module.exports = router;