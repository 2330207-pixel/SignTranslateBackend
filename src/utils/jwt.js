/**
 * utils/jwt.js
 * -----------------------------------------------------------------------
 * Emisión y verificación de tokens JWT.
 *
 * Estrategia de dos tokens (estándar de la industria):
 *  - accessToken: vida corta (15 min). Se manda en cada request protegida
 *    vía header "Authorization: Bearer <token>".
 *  - refreshToken: vida larga (30 días). Se guarda hasheado en la tabla
 *    refresh_tokens y permite pedir un nuevo accessToken sin que el
 *    usuario tenga que volver a escribir su contraseña — esto es lo que
 *    te da el "login persistente" que pediste (cierra la app y al volver
 *    sigue con la sesión iniciada).
 *
 * Por qué esto es mejor que el token anterior (randomBytes + '.' + id):
 *  - Está firmado criptográficamente (nadie puede fabricar uno sin la
 *    clave secreta).
 *  - Tiene expiración incorporada.
 *  - El refresh token puede revocarse (cerrar sesión de verdad) porque
 *    se verifica su hash contra la tabla refresh_tokens.
 * -----------------------------------------------------------------------
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_TTL_DAYS = 30;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error('Falta la variable de entorno JWT_ACCESS_SECRET en tu .env');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET); // lanza si es inválido/expiró
}

/**
 * Genera un refresh token opaco (no JWT, solo un string aleatorio) y
 * devuelve tanto el token en claro (para enviarlo al cliente) como su
 * hash (para guardarlo en la base de datos). Nunca guardamos el token
 * en texto plano, igual que hacemos con las contraseñas.
 */
function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
