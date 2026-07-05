/**
 * services/googleAuthService.js
 * -----------------------------------------------------------------------
 * Verifica el ID Token que la app Android obtiene de Google Sign-In
 * (Credential Manager / Google Identity Services) y devuelve los datos
 * del usuario (email, nombre, id de Google) si el token es válido.
 *
 * Flujo completo:
 *   1. En Android, el usuario inicia sesión con Google -> obtiene un
 *      ID Token (JWT firmado por Google).
 *   2. La app manda ese ID Token a nuestro backend: POST /api/auth/google
 *   3. Aquí lo verificamos contra los servidores de Google (esto es
 *      indispensable: nunca confíes en un token sin verificarlo).
 *   4. Si es válido, buscamos o creamos el usuario y emitimos NUESTROS
 *      propios JWT (access + refresh), igual que en login/register.
 * -----------------------------------------------------------------------
 */

const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

const client = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

/**
 * Verifica el idToken contra Google.
 * Lanza un error si es inválido, expiró, o el `aud` no coincide con
 * nuestro GOOGLE_CLIENT_ID (esto evita que alguien reutilice un token
 * emitido para OTRA aplicación).
 */
async function verifyGoogleIdToken(idToken) {
  if (!client) {
    throw Object.assign(
      new Error(
        'El login con Google no está configurado en el servidor (falta GOOGLE_CLIENT_ID).'
      ),
      { status: 501 }
    );
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw Object.assign(new Error('Token de Google inválido.'), { status: 401 });
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    emailVerified: payload.email_verified,
  };
}

module.exports = { verifyGoogleIdToken };
