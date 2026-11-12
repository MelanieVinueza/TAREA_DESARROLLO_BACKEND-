import { Router } from 'express';
import { createVersionMiddleware } from '../middlewares/version.middleware.js';
import { createProductoRoutes } from './producto.routes.js';

export function createApiRoutes(config, repository) {
  const router = Router();
  router.use('/:version', createVersionMiddleware(config));
  router.use('/' + config.API_VERSION + '/productos', createProductoRoutes(config, repository));
  return router;
}
