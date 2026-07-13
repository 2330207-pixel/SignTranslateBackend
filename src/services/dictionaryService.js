/**
 * services/dictionaryService.js
 * -----------------------------------------------------------------------
 * Acceso a datos para el "Diccionario" (categorías + videos de LSM).
 * Los videos en sí NO viven en este backend ni en Postgres: solo se
 * guarda la URL pública (Cloudinary u otro storage) y a qué categoría
 * pertenece cada uno.
 * -----------------------------------------------------------------------
 */

const { query } = require('../../database/pool');

async function listCategories() {
  const { rows } = await query(
    `SELECT
        c.id,
        c.slug,
        c.name,
        c.icon_key,
        c.display_order,
        COUNT(v.id)::int AS video_count
     FROM dictionary_categories c
     LEFT JOIN dictionary_videos v ON v.category_id = c.id
     GROUP BY c.id
     ORDER BY c.display_order ASC, c.name ASC`
  );
  return rows;
}

async function findCategoryBySlug(slug) {
  const { rows } = await query(
    'SELECT id, slug, name, icon_key, display_order FROM dictionary_categories WHERE slug = $1',
    [slug]
  );
  return rows[0] || null;
}

async function listVideosByCategorySlug(slug) {
  const category = await findCategoryBySlug(slug);
  if (!category) return null;

  const { rows } = await query(
    `SELECT id, word, video_url, thumbnail_url, display_order, created_at
     FROM dictionary_videos
     WHERE category_id = $1
     ORDER BY display_order ASC, word ASC`,
    [category.id]
  );

  return { category, videos: rows };
}

async function findVideoById(id) {
  const { rows } = await query(
    `SELECT v.id, v.word, v.video_url, v.thumbnail_url, v.display_order,
            c.slug AS category_slug, c.name AS category_name
     FROM dictionary_videos v
     JOIN dictionary_categories c ON c.id = v.category_id
     WHERE v.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// --- Usadas por el script de subida masiva (scripts/uploadDictionaryVideos.js) ---

async function upsertCategory({ slug, name, iconKey = null, displayOrder = 0 }) {
  const { rows } = await query(
    `INSERT INTO dictionary_categories (slug, name, icon_key, display_order)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, slug, name, icon_key, display_order`,
    [slug, name, iconKey, displayOrder]
  );
  return rows[0];
}

async function insertVideo({ categoryId, word, videoUrl, thumbnailUrl = null, storagePublicId = null, displayOrder = 0 }) {
  const { rows } = await query(
    `INSERT INTO dictionary_videos (category_id, word, video_url, thumbnail_url, storage_public_id, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (category_id, word) DO UPDATE SET
        video_url = EXCLUDED.video_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        storage_public_id = EXCLUDED.storage_public_id
     RETURNING id, word, video_url`,
    [categoryId, word, videoUrl, thumbnailUrl, storagePublicId, displayOrder]
  );
  return rows[0];
}

module.exports = {
  listCategories,
  findCategoryBySlug,
  listVideosByCategorySlug,
  findVideoById,
  upsertCategory,
  insertVideo,
};
