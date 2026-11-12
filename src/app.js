import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config as defaultConfig } from './config/env.js';
import { logger as defaultLogger } from './config/logger.js';
import { createCorsMiddleware } from './middlewares/cors.middleware.js';
import { requireJson, createJsonParser } from './middlewares/json.middleware.js';
import { createApiRoutes } from './routes/index.routes.js';
import { notFound } from './middlewares/not-found.middleware.js';
import { createErrorMiddleware } from './middlewares/error.middleware.js';

export function createApp({ config = defaultConfig, repository, logger = defaultLogger } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.set('X-Request-Id', req.id);
    next();
  });
  app.use(helmet());
  app.use(createCorsMiddleware(config));
  app.use(rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes; vuelva a intentarlo más tarde' } });
    },
  }));
  app.use(requireJson);
  app.use(createJsonParser(config.JSON_BODY_LIMIT));
  app.use(config.API_PREFIX, createApiRoutes(config, repository));
  app.use(notFound);
  app.use(createErrorMiddleware(logger));
  return app;
}
