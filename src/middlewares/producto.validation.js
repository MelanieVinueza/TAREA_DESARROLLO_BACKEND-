import { parseProducto } from '../models/producto.model.js';
import { HttpError } from '../utils/http-error.js';

export function validateProducto(partial = false) {
  return (req, res, next) => {
    req.productoData = parseProducto(req.body, partial);
    next();
  };
}
export function validateId(req, res, next) {
  const id = req.params.id;
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
    return next(new HttpError(400, 'INVALID_ID', 'El ID debe ser un entero positivo dentro del rango BIGINT'));
  }
  req.productoId = id;
  next();
}
