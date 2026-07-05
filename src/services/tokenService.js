/**
 * services/tokenService.js
 * -----------------------------------------------------------------------
 * Persistencia de refresh tokens en PostgreSQL. Esto es lo que permite:
 *  - Login persistente real (el refresh token vive 30 días en la BD).
 *  - Cerrar sesión de verdad (revocar el token en la BD, algo imposible
 *    con el esquema anterior de token "id + random" sin almacenamiento).
 * -----------------------------------------------------------------------
 */

const { query } = require('../../database/pool');
const { generateRefreshToken, hashRefreshToken } = require('../utils/jwt');

async function issueRefreshToken(userId) {
  const { token, tokenHash, expiresAt } = generateRefreshToken();
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return token; // este es el que se manda al cliente, el hash se queda en la BD
}

async function findValidRefreshToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);
  const { rows } = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);
  await query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
}

async function revokeAllUserTokens(userId) {
  await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
}

module.exports = {
  issueRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
