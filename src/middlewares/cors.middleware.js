import cors from 'cors';
import { HttpError } from '../utils/http-error.js';

export function createCorsMiddleware(config) {
  return cors({
    origin(origin, callback) {
      if (!origin || config.CORS_ORIGINS.includes(origin)) return callback(null, true);
      callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origen no permitido'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Location', 'X-Request-Id'],
    credentials: false,
    optionsSuccessStatus: 204,
  });
}
