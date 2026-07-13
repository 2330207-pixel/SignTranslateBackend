/**
 * controllers/dictionaryController.js
 * -----------------------------------------------------------------------
 * Endpoints públicos de solo lectura para la pantalla "Diccionario":
 *  - Listar categorías (con conteo de videos, como en el mockup)
 *  - Listar videos de una categoría
 *  - Obtener un video puntual por id
 * -----------------------------------------------------------------------
 */

const dictionaryService = require('../services/dictionaryService');

async function getCategories(req, res, next) {
  try {
    const categories = await dictionaryService.listCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

async function getCategoryVideos(req, res, next) {
  try {
    const { slug } = req.params;
    const result = await dictionaryService.listVideosByCategorySlug(slug);
    if (!result) return res.status(404).json({ error: `Categoría no encontrada: ${slug}` });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getVideoById(req, res, next) {
  try {
    const { id } = req.params;
    const video = await dictionaryService.findVideoById(id);
    if (!video) return res.status(404).json({ error: 'Video no encontrado.' });
    res.json({ video });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCategories, getCategoryVideos, getVideoById };
