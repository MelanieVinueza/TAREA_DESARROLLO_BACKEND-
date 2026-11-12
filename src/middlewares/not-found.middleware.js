import { HttpError } from '../utils/http-error.js';
export function notFound(req, res, next) {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'Ruta no encontrada'));
}
