import { Router } from 'express';
import { createProductoController } from '../factories/producto.factory.js';
import { requireJson, requireObject } from '../middlewares/json.middleware.js';
import { sanitizeProducto } from '../middlewares/sanitize.middleware.js';
import { validateId, validateProducto } from '../middlewares/producto.validation.js';
import { createPaginationMiddleware } from '../middlewares/pagination.middleware.js';
import { HttpError } from '../utils/http-error.js';

export function createProductoRoutes(config, repository) {
  const router = Router();
  const controller = createProductoController(repository);
  const body = [requireJson, requireObject, sanitizeProducto];
  const methodNotAllowed = allow => (req, res, next) => {
    res.set('Allow', allow);
    next(new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido'));
  };
  router.route('/')
    .get(createPaginationMiddleware(config), controller.getAll)
    .post(...body, validateProducto(), controller.create)
    .all(methodNotAllowed('GET, HEAD, POST, OPTIONS'));
  router.route('/:id')
    .get(validateId, controller.getById)
    .put(validateId, ...body, validateProducto(), controller.replace)
    .patch(validateId, ...body, validateProducto(true), controller.updatePartial)
    .delete(validateId, controller.remove)
    .all(methodNotAllowed('GET, HEAD, PUT, PATCH, DELETE, OPTIONS'));
  return router;
}
