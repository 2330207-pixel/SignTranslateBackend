/**
 * middleware/errorHandler.js
 * -----------------------------------------------------------------------
 * Manejador global de errores. Cualquier `next(error)` o excepción no
 * capturada dentro de una ruta async cae aquí, así evitamos que el
 * servidor se caiga por un error no manejado y evitamos filtrar detalles
 * internos (stack traces, mensajes de PostgreSQL, etc.) al cliente en
 * producción.
 * -----------------------------------------------------------------------
 */

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('❌ Error no controlado:', err);

  // Violación de restricción UNIQUE de PostgreSQL (ej. email duplicado)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'El recurso ya existe (valor duplicado).' });
  }

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor.'
      : err.message;

  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
