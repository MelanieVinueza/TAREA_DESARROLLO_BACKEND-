import { HttpError } from '../utils/http-error.js';
export function createVersionMiddleware(config) {
  return (req, res, next) => {
    if (req.params.version !== config.API_VERSION) {
      return next(new HttpError(404, 'API_VERSION_NOT_FOUND', 'Versión de API no encontrada'));
    }
    next();
  };
}
