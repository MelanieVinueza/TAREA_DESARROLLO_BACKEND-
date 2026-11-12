export function sanitizeProducto(req, res, next) {
  for (const field of ['nombre', 'descripcion', 'URLImagen']) {
    if (typeof req.body[field] === 'string') req.body[field] = req.body[field].trim();
  }
  next();
}
