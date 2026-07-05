/**
 * middleware/auth.js
 * -----------------------------------------------------------------------
 * Middleware que protege rutas verificando el access token JWT enviado
 * en el header "Authorization: Bearer <token>".
 * -----------------------------------------------------------------------
 */

const { verifyAccessToken } = require('../utils/jwt');
const { findUserById } = require('../services/userService');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token de autenticación faltante o mal formado.' });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'El token ha expirado. Usa tu refresh token para renovarlo.'
          : 'Token inválido.';
      return res.status(401).json({ error: message });
    }

    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'El usuario asociado a este token ya no existe.' });
    }

    req.user = user; // disponible en los controladores siguientes
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
