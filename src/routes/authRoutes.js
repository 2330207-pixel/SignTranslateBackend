const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.put('/update-profile', requireAuth, authController.updateProfile);

// Recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

// Facial Auth
router.put('/facial', requireAuth, authController.updateFacial);
router.post('/verify-facial', authController.verifyFacial);

module.exports = router;
