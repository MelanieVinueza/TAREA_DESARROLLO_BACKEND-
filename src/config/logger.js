import pino from 'pino';
import { config } from './env.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: ['password', 'DB_PASSWORD', 'authorization', 'req.headers.authorization'],
});
