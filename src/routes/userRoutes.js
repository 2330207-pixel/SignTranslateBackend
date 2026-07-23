const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.put('/profile', userController.updateProfile); // Recomendado: PUT /api/users/profile
router.put('/update-profile', userController.updateProfile); // Para compatibilidad con tu snippet de Kotlin
router.put('/avatar', userController.updateAvatar);
router.put('/fcm-token', userController.updateFcmToken);
router.post('/translations', userController.saveTranslation);
router.get('/translations', userController.listTranslations);

module.exports = router;
