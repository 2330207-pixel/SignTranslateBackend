/**
 * database/migrate.js
 * -----------------------------------------------------------------------
 * Ejecuta schema.sql contra la base de datos definida en DATABASE_URL.
 *
 * Uso:
 *   node database/migrate.js
 *
 * Es seguro ejecutarlo varias veces: todo el schema.sql usa
 * "IF NOT EXISTS", así que no falla si las tablas ya existen.
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('./pool');

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de base de datos...');
    await testConnection();

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📄 Ejecutando schema.sql...');
    await pool.query(schemaSql);

    console.log('✅ Migración completada. Tablas creadas/verificadas:');
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    rows.forEach((r) => console.log('   -', r.table_name));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  }
}

runMigration();
