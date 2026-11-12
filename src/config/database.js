import pg from 'pg';
import { config } from './env.js';
import { logger } from './logger.js';

let instance;
export function getPool() {
  if (!instance) {
    instance = new pg.Pool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      max: config.DB_POOL_MAX,
      connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: config.DB_IDLE_TIMEOUT_MS,
      ssl: config.DB_SSL ? { rejectUnauthorized: true } : false,
      application_name: 'backend-productos',
    });
    instance.on('error', () => logger.error({ code: 'DB_POOL_ERROR' }, 'Error de conexión del pool'));
  }
  return instance;
}
export async function closePool() {
  if (instance) {
    const current = instance;
    instance = undefined;
    await current.end();
  }
}
