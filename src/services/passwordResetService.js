/**
 * services/passwordResetService.js
 * -----------------------------------------------------------------------
 * Lógica para manejar los tokens de restablecimiento de contraseña.
 * -----------------------------------------------------------------------
 */

const { query } = require('../../database/pool');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const CODE_EXPIRATION_MINUTES = 15;
const MAX_ATTEMPTS_PER_CODE = 5;
const MAX_CODES_PER_HOUR = 10; // Aumentado para pruebas

function generateCode() {
  // Genera un código numérico de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createResetToken(userId) {
  // 1. Verificar si el usuario ha pedido demasiados códigos recientemente (Rate Limit)
  const { rows: recentCodes } = await query(
    'SELECT count(*) FROM password_reset_tokens WHERE user_id = $1 AND created_at > now() - interval \'1 hour\'',
    [userId]
  );

  if (parseInt(recentCodes[0].count) >= MAX_CODES_PER_HOUR) {
    throw new Error('Has solicitado demasiados códigos. Inténtalo más tarde.');
  }

  const code = generateCode();
  const tokenHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);

  // Invalidamos tokens anteriores del mismo usuario
  await query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1', [userId]);

  await query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return code;
}

async function verifyResetCode(email, code) {
  const { rows } = await query(
    `SELECT prt.*, u.email
     FROM password_reset_tokens prt
     JOIN users u ON prt.user_id = u.id
     WHERE u.email = $1 AND prt.used = false AND prt.expires_at > now()
     ORDER BY prt.created_at DESC
     LIMIT 1`,
    [email.toLowerCase().trim()]
  );

  const tokenRecord = rows[0];
  if (!tokenRecord) return { valid: false, error: 'Código inválido o expirado.' };

  if (tokenRecord.attempts >= MAX_ATTEMPTS_PER_CODE) {
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenRecord.id]);
    return { valid: false, error: 'Demasiados intentos con este código. Solicita uno nuevo.' };
  }

  const isValid = await bcrypt.compare(code, tokenRecord.token_hash);
  if (!isValid) {
    await query('UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1', [tokenRecord.id]);
    return { valid: false, error: 'Código incorrecto.' };
  }

  // Si es válido, generamos un temporary_token (UUID) para que el siguiente paso
  // (reset-password) sea seguro y sepamos que ya validó el código.
  const tempToken = crypto.randomUUID();
  // Podríamos guardar este tempToken en la DB o simplemente usar el ID del registro.
  // Para simplificar y seguir el flujo, usaremos el id del registro como "token" de validación.

  return { valid: true, resetTokenId: tokenRecord.id, tempToken };
}

async function useResetToken(tokenId) {
  await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]);
}

async function getUserIdFromToken(tokenId) {
    const { rows } = await query('SELECT user_id FROM password_reset_tokens WHERE id = $1 AND used = false AND expires_at > now()', [tokenId]);
    return rows[0]?.user_id || null;
}

module.exports = {
  createResetToken,
  verifyResetCode,
  useResetToken,
  getUserIdFromToken
};
