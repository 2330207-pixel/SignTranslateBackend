/**
 * controllers/notificationController.js
 * -----------------------------------------------------------------------
 * Implementa exactamente los endpoints que definiste:
 *   GET    /notifications
 *   GET    /notifications/unread
 *   POST   /notifications
 *   PUT    /notifications/:id/read
 *   PUT    /notifications/read-all
 *   DELETE /notifications/:id
 * Todas requieren autenticación (requireAuth) — un usuario solo puede
 * ver/modificar SUS propias notificaciones (filtramos siempre por
 * req.user.id en el service).
 * -----------------------------------------------------------------------
 */

const notificationService = require('../services/notificationService');

async function list(req, res, next) {
  try {
    const notifications = await notificationService.listNotifications(req.user.id);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

async function listUnread(req, res, next) {
  try {
    const notifications = await notificationService.listUnreadNotifications(req.user.id);
    const unreadCount = await notificationService.countUnread(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Faltan title o message.' });
    }

    const notification = await notificationService.createNotification({
      userId: req.user.id,
      title,
      message,
      type, // opcional — el service ya cae a 'general' si no es válido
    });

    res.status(201).json({ notification });
  } catch (error) {
    next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada.' });
    }
    res.json({ notification });
  } catch (error) {
    next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    const updated = await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'Notificaciones marcadas como leídas.', updated });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await notificationService.deleteNotification(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { list, listUnread, create, markRead, markAllRead, remove };