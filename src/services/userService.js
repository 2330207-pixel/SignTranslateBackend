/**
 * services/userService.js
 * -----------------------------------------------------------------------
 * Toda la lógica de acceso a datos para la tabla `users`.
 * Los controladores NUNCA escriben SQL directamente: siempre pasan por
 * aquí. Esto es lo que reemplaza a readDB()/writeDB() sobre db.json.
 * -----------------------------------------------------------------------
 */

const { query } = require('../../database/pool');

// Nunca devolvemos password_hash al cliente. Este es el set de columnas
// "seguras" que sí se pueden exponer en las respuestas de la API.
const SAFE_COLUMNS = 'id, name, email, avatar_id, google_id, created_at, updated_at';

async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await query(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findUserByGoogleId(googleId) {
  const { rows } = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash = null, googleId = null }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, google_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SAFE_COLUMNS}`,
    [name.trim(), email.toLowerCase().trim(), passwordHash, googleId]
  );
  return rows[0];
}

async function linkGoogleIdToUser(userId, googleId) {
  const { rows } = await query(
    `UPDATE users SET google_id = $1 WHERE id = $2 RETURNING ${SAFE_COLUMNS}`,
    [googleId, userId]
  );
  return rows[0];
}

async function updateAvatar(userId, avatarId) {
  const { rows } = await query(
    `UPDATE users SET avatar_id = $1 WHERE id = $2 RETURNING ${SAFE_COLUMNS}`,
    [avatarId, userId]
  );
  return rows[0];
}

async function updateFcmToken(userId, fcmToken) {
  await query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcmToken, userId]);
}

module.exports = {
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  createUser,
  linkGoogleIdToUser,
  updateAvatar,
  updateFcmToken,
};
