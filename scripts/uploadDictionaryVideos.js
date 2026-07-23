/**
 * scripts/uploadDictionaryVideos.js
 * -----------------------------------------------------------------------
 * Script de un solo uso (lo puedes correr las veces que quieras, es
 * idempotente) que:
 *   1. Recorre una carpeta local con subcarpetas por categoría
 *      (ej. abecedario/, Numeros/, Familia/, ... tal como las tienes
 *      organizadas ahora mismo en tu explorador de archivos).
 *   2. Sube cada video (.mp4, .mov, .webm) a Cloudinary.
 *   3. Crea/actualiza la categoría y el video correspondiente en
 *      Postgres (Railway), listos para que tu API los sirva.
 *
 * NO corre dentro del servidor Express ni en Railway: lo corres UNA VEZ
 * (o cada vez que agregues videos nuevos) desde tu propia computadora,
 * apuntando a tu base de datos de Railway mediante DATABASE_URL.
 *
 * -----------------------------------------------------------------------
 * Uso:
 *   1. npm install cloudinary   (ver instrucciones más abajo)
 *   2. Agrega a tu .env (el mismo que ya usa el backend):
 *        CLOUDINARY_CLOUD_NAME=tu_cloud_name
 *        CLOUDINARY_API_KEY=tu_api_key
 *        CLOUDINARY_API_SECRET=tu_api_secret
 *   3. node scripts/uploadDictionaryVideos.js "C:\ruta\a\tus\videos"
 *
 *      La carpeta que le pases debe contener las subcarpetas por
 *      categoría directamente adentro, ej.:
 *        C:\ruta\a\tus\videos\
 *          abecedario\A.mp4, B.mp4, ...
 *          Numeros\Uno.mp4, Dos.mp4, ...
 *          Familia\Mama.mp4, Papa.mp4, ...
 * -----------------------------------------------------------------------
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { testConnection } = require('../database/pool');
const dictionaryService = require('../src/services/dictionaryService');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi']);

// -------------------------------------------------------------------------
// Config de Cloudinary
// -------------------------------------------------------------------------
const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`❌ Faltan variables de entorno de Cloudinary: ${missingEnv.join(', ')}`);
  console.error('   Agrégalas a tu archivo .env (ver el encabezado de este script).');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// -------------------------------------------------------------------------
// Helpers de nombres: de "Museo y Arte", "Salud-", "abecedario" a un slug
// estable (para la URL/BD) y un nombre bonito para mostrar en pantalla.
// -------------------------------------------------------------------------
function toSlug(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .trim()
    .replace(/-+$/g, '') // quita guiones colgados al final (ej. "Salud-")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDisplayName(folderName) {
  const cleaned = folderName.replace(/-+$/g, '').trim();
  return cleaned
    .split(/\s+/)
    .map((word) => (word.length <= 2 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

function wordFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const cleaned = base.replace(/[_-]+/g, ' ').trim();
  return cleaned
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// -------------------------------------------------------------------------
// Sube un archivo de video a Cloudinary y regresa { secure_url, public_id }
// -------------------------------------------------------------------------
async function uploadVideoFile(filePath, categorySlug) {
  return cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: `signtranslate/dictionary/${categorySlug}`,
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  });
}

async function run() {
  const rootDir = process.argv[2];
  if (!rootDir) {
    console.error('❌ Debes pasar la ruta de la carpeta raíz de videos.');
    console.error('   Ejemplo: node scripts/uploadDictionaryVideos.js "C:\\Users\\ara\\Videos\\LSM"');
    process.exit(1);
  }
  if (!fs.existsSync(rootDir)) {
    console.error(`❌ No existe la carpeta: ${rootDir}`);
    process.exit(1);
  }

  console.log('🚀 Conectando a la base de datos...');
  await testConnection();

  const categoryFolders = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  console.log(`📁 Encontré ${categoryFolders.length} carpetas de categoría.\n`);

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < categoryFolders.length; i++) {
    const folder = categoryFolders[i];
    const categoryPath = path.join(rootDir, folder.name);
    const slug = toSlug(folder.name);
    const displayName = toDisplayName(folder.name);

    if (!slug) {
      console.warn(`⚠️  Saltando carpeta "${folder.name}" (no se pudo generar un slug válido).`);
      continue;
    }

    const category = await dictionaryService.upsertCategory({
      slug,
      name: displayName,
      displayOrder: i,
    });

    const files = fs
      .readdirSync(categoryPath, { withFileTypes: true })
      .filter((f) => f.isFile() && VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase()));

    console.log(`\n📂 ${displayName}  (slug: ${slug})  —  ${files.length} video(s)`);

    for (const file of files) {
      const filePath = path.join(categoryPath, file.name);
      const word = wordFromFilename(file.name);

      try {
        process.stdout.write(`   ⬆️  Subiendo "${file.name}" -> ${word}... `);
        const result = await uploadVideoFile(filePath, slug);
        await dictionaryService.insertVideo({
          categoryId: category.id,
          word,
          videoUrl: result.secure_url,
          storagePublicId: result.public_id,
        });
        console.log('✅');
        totalUploaded++;
      } catch (error) {
        console.log('❌');
        console.error(`      Error con "${file.name}":`, error.message);
        totalFailed++;
      }
    }
  }

  console.log('\n-------------------------------------------');
  console.log(`✅ Subidos/actualizados: ${totalUploaded}`);
  console.log(`⏭️  Saltados: ${totalSkipped}`);
  console.log(`❌ Fallidos: ${totalFailed}`);
  console.log('-------------------------------------------');
  process.exit(0);
}

run().catch((error) => {
  console.error('❌ Error fatal en el script:', error);
  process.exit(1);
});
