/**
 * utils/password.js
 * -----------------------------------------------------------------------
 * Hash y verificación de contraseñas con bcrypt.
 *
 * Por qué bcrypt y no SHA-256 (como estaba antes):
 *  - bcrypt incluye un "salt" único por contraseña automáticamente,
 *    y es deliberadamente lento (factor de costo configurable), lo que
 *    hace inviable un ataque de fuerza bruta/rainbow tables.
 *  - SHA-256 con un salt fijo (como se usaba en el proyecto anterior) es
 *    rápido de calcular, por lo que es vulnerable a ataques masivos.
 * -----------------------------------------------------------------------
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12; // 10-12 es el estándar recomendado en 2026

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  if (!hash) return false; // usuario registrado solo con Google, sin password
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, verifyPassword };
