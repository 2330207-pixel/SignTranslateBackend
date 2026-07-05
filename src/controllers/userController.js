/**
 * controllers/userController.js
 * -----------------------------------------------------------------------
 * Endpoints de usuario que no son de autenticación pura:
 *  - Actualizar avatar_id (referencia al sistema de animaciones)
 *  - Actualizar fcm_token (para cuando se implemente el envío push)
 *  - Guardar/listar historial de traducciones detectadas por la IA
 * -----------------------------------------------------------------------
 */

const userService = require('../services/userService');
const translationService = require('../services/translationService');

async function updateAvatar(req, res, next) {
  try {
    const { avatarId } = req.body;
    if (!avatarId) return res.status(400).json({ error: 'Falta avatarId.' });
    const user = await userService.updateAvatar(req.user.id, avatarId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function updateFcmToken(req, res, next) {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'Falta fcmToken.' });
    await userService.updateFcmToken(req.user.id, fcmToken);
    res.json({ message: 'Token de notificaciones push actualizado.' });
  } catch (error) {
    next(error);
  }
}

async function saveTranslation(req, res, next) {
  try {
    const { detectedWord, confidence } = req.body;
    if (!detectedWord) return res.status(400).json({ error: 'Falta detectedWord.' });
    const translation = await translationService.saveTranslation({
      userId: req.user.id,
      detectedWord,
      confidence,
    });
    res.status(201).json({ translation });
  } catch (error) {
    next(error);
  }
}

async function listTranslations(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 50;
    const translations = await translationService.listTranslations(req.user.id, limit);
    res.json({ translations });
  } catch (error) {
    next(error);
  }
}

module.exports = { updateAvatar, updateFcmToken, saveTranslation, listTranslations };
