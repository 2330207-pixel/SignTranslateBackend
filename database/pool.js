/**
 * database/pool.js
 * -----------------------------------------------------------------------
 * Pool de conexiones a PostgreSQL (Railway) usando el paquete `pg`.
 *
 * Por qué un Pool y no un solo Client:
 *  - Un Pool reutiliza conexiones en lugar de abrir una nueva por cada
 *    request, lo cual es indispensable en un servidor Express con tráfico
 *    concurrente.
 *  - Railway (y Postgres en general) exige SSL para conexiones externas;
 *    por eso activamos `ssl: { rejectUnauthorized: false }` cuando
 *    detectamos que NODE_ENV=production o que la URL apunta a Railway.
 * -----------------------------------------------------------------------
 */

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // Fallamos rápido y con un mensaje claro en lugar de dejar que pg
  // lance un error críptico más adelante.
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Defínela en tu archivo .env ' +
      'o en las variables de entorno de Railway.'
  );
}

const isProduction = process.env.NODE_ENV === 'production';

// Railway (y prácticamente cualquier Postgres remoto) exige SSL para
// conexiones externas — sin importar si el proceso que se conecta corre
// en Railway o en tu laptop. Antes esto se decidía con NODE_ENV, lo cual
// rompía scripts locales (como uploadDictionaryVideos.js) que sí se
// conectan a la base remota pero con NODE_ENV=development.
// Detectamos "remoto" viendo si la URL NO apunta a localhost/127.0.0.1.
const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  max: 10, // máximo de conexiones simultáneas en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Errores de conexiones inactivas (por ejemplo si Railway cierra el
  // socket). Los logueamos pero NO tumbamos el proceso.
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

/**
 * Helper para ejecutar queries con logging opcional en desarrollo.
 * Todo el resto del código debe usar esta función en lugar de
 * `pool.query` directamente, así centralizamos logging/manejo de errores.
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (!isProduction) {
      const duration = Date.now() - start;
      console.log('🔍 SQL ejecutado:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando query:', { text, error: error.message });
    throw error;
  }
}

/**
 * Verifica que la conexión a la base de datos funciona.
 * Se usa al arrancar el servidor para fallar rápido si algo está mal
 * configurado (útil en Railway: verás el error en los logs de deploy).
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada correctamente');
  } finally {
    client.release();
  }
}

module.exports = { pool, query, testConnection };