const express = require('express');
const dictionaryController = require('../controllers/dictionaryController');
// const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Endpoints públicos: el diccionario es contenido de consulta, no requiere
// sesión iniciada. Si más adelante quieres exigir login para verlo,
// descomenta la línea de arriba y agrega router.use(requireAuth);

router.get('/categories', dictionaryController.getCategories);
router.get('/categories/:slug/videos', dictionaryController.getCategoryVideos);
router.get('/videos/:id', dictionaryController.getVideoById);

module.exports = router;
