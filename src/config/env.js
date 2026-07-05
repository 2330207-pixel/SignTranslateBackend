/**
 * config/env.js
 * -----------------------------------------------------------------------
 * Punto único de lectura de variables de entorno. El resto del código
 * importa este archivo en lugar de leer `process.env` directamente, así
 * si falta una variable obligatoria fallamos rápido y con un mensaje
 * claro al arrancar el servidor (en vez de un error críptico a mitad de
 * una request).
 * -----------------------------------------------------------------------
 */

require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
      'Revisa tu archivo .env (usa .env.example como referencia).'
  );
}

module.exports = {
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
