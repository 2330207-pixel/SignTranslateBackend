/**
 * server.js
 * -----------------------------------------------------------------------
 * Punto de entrada del backend de SignTranslate.
 *
 * Cambios respecto a la versión anterior (que usaba db.json):
 *  - Ya no hay readDB()/writeDB() ni fs. Todo pasa por PostgreSQL
 *    (ver database/pool.js y src/services/*).
 *  - El puerto y demás configuración vienen de variables de entorno
 *    (src/config/env.js), no están hardcodeados.
 *  - Las rutas están organizadas por dominio (auth, users,
 *    notifications, dictionary) en lugar de vivir todas en este archivo.
 *  - Se agrega un manejador global de errores y de rutas no encontradas.
 * -----------------------------------------------------------------------
 */

const express = require('express');
const cors = require('cors');

const env = require('./src/config/env');
const { testConnection } = require('./database/pool');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const dictionaryRoutes = require('./src/routes/dictionaryRoutes');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Healthcheck — Railway lo usa para saber si el deploy está vivo.
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dictionary', dictionaryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await testConnection(); // falla rápido si DATABASE_URL está mal
    app.listen(env.port, '0.0.0.0', () => {
      console.log(`\n✅ Servidor SignTranslate escuchando en 0.0.0.0:${env.port}`);
      console.log(`🔗 Local: http://localhost:${env.port}`);
      console.log(`🌎 Entorno: ${env.nodeEnv}\n`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

start();
