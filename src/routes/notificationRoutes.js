const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth); // todas las rutas de notificaciones requieren sesión

router.get('/', notificationController.list);
router.get('/unread', notificationController.listUnread);
router.post('/', notificationController.create);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.remove);

module.exports = router;