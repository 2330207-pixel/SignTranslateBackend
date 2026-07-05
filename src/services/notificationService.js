/**
 * services/notificationService.js
 * -----------------------------------------------------------------------
 * Acceso a datos para la tabla `notifications`.
 * Tipos válidos (coinciden con lo que ya definiste para el frontend):
 *   update | new_signs | download | tip | reminder | general
 * -----------------------------------------------------------------------
 */

const { query } = require('../../database/pool');

const VALID_TYPES = ['update', 'new_signs', 'download', 'tip', 'reminder', 'general'];

async function createNotification({ userId, title, message, type = 'general' }) {
  const safeType = VALID_TYPES.includes(type) ? type : 'general';
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, title, message, safeType]
  );
  return rows[0];
}

async function listNotifications(userId) {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function listUnreadNotifications(userId) {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function countUnread(userId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return rows[0].count;
}

async function markAsRead(notificationId, userId) {
  const { rows } = await query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return rows[0] || null;
}

async function markAllAsRead(userId) {
  const { rowCount } = await query(
    'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return rowCount;
}

async function deleteNotification(notificationId, userId) {
  const { rowCount } = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  return rowCount > 0;
}

module.exports = {
  VALID_TYPES,
  createNotification,
  listNotifications,
  listUnreadNotifications,
  countUnread,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
