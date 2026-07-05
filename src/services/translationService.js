/**
 * services/translationService.js
 * -----------------------------------------------------------------------
 * Historial de traducciones detectadas por el modelo de IA (el modelo en
 * sí vive fuera de este backend). La app envía el resultado ya detectado
 * y aquí solo lo persistimos para mostrar historial/estadísticas.
 * -----------------------------------------------------------------------
 */

const { query } = require('../../database/pool');

async function saveTranslation({ userId, detectedWord, confidence = null }) {
  const { rows } = await query(
    `INSERT INTO translations (user_id, detected_word, confidence)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, detectedWord, confidence]
  );
  return rows[0];
}

async function listTranslations(userId, limit = 50) {
  const { rows } = await query(
    `SELECT * FROM translations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = { saveTranslation, listTranslations };
