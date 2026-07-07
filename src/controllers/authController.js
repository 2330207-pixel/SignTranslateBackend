ñ/**
 * controllers/authController.js
 * -----------------------------------------------------------------------
 * Controladores HTTP para autenticación. Reemplazan las rutas
 * /api/auth/register y /api/auth/login que antes leían/escribían
 * db.json directamente.
 * -----------------------------------------------------------------------
 */

const userService = require('../services/userService');
const tokenService = require('../services/tokenService');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { validateRegisterInput, validateLoginInput } = require('../utils/validators');
const { verifyGoogleIdToken } = require('../services/googleAuthService');

function toPublicUser(user) {
  // Nunca exponemos password_hash ni fcm_token en las respuestas.
  const { password_hash, fcm_token, ...safe } = user; // eslint-disable-line no-unused-vars
  return safe;
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = await tokenService.issueRefreshToken(user.id);
  return { accessToken, refreshToken };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const errors = validateRegisterInput({ name, email, password });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

    const existing = await userService.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Este correo ya está registrado.' });

    const passwordHash = await hashPassword(password);
    const user = await userService.createUser({ name, email, passwordHash });

    const { accessToken, refreshToken } = await issueTokenPair(user);
    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const errors = validateLoginInput({ email, password });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

    const user = await userService.findUserByEmail(email);
    const passwordOk = user ? await verifyPassword(password, user.password_hash) : false;
    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);
    res.json({
      message: 'Sesión iniciada exitosamente.',
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/google
 * Body: { idToken: "<token que Android obtuvo de Google Sign-In>" }
 *
 * - Si ya existe un usuario con ese google_id -> inicia sesión.
 * - Si existe un usuario con ese email pero registrado con password
 *   (sin google_id) -> vincula la cuenta de Google a ese usuario.
 * - Si no existe -> crea un usuario nuevo.
 */
async function googleLogin(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Falta el idToken de Google.' });

    const googleData = await verifyGoogleIdToken(idToken);

    let user = await userService.findUserByGoogleId(googleData.googleId);

    if (!user) {
      const existingByEmail = await userService.findUserByEmail(googleData.email);
      if (existingByEmail) {
        user = await userService.linkGoogleIdToUser(existingByEmail.id, googleData.googleId);
      } else {
        user = await userService.createUser({
          name: googleData.name,
          email: googleData.email,
          googleId: googleData.googleId,
        });
      }
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);
    res.json({
      message: 'Sesión iniciada con Google exitosamente.',
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken: "..." }
 * Devuelve un nuevo accessToken sin pedir contraseña — esto es lo que
 * mantiene la sesión "persistente" en la app.
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Falta el refreshToken.' });

    const stored = await tokenService.findValidRefreshToken(refreshToken);
    if (!stored) return res.status(401).json({ error: 'Refresh token inválido, expirado o revocado.' });

    const user = await userService.findUserById(stored.user_id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado.' });

    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Body: { refreshToken: "..." }
 * Revoca el refresh token -> cierre de sesión real en el servidor.
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await tokenService.revokeRefreshToken(refreshToken);
    res.json({ message: 'Sesión cerrada exitosamente.' });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  // req.user ya viene sin password_hash porque userService.findUserById
  // usa SAFE_COLUMNS, y requireAuth lo puso en req.user.
  res.json({ user: req.user });
}

module.exports = { register, login, googleLogin, refresh, logout, me };
