import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const integer = (fallback, max = Number.MAX_SAFE_INTEGER) =>
  z.coerce.number().int().min(1).max(max).default(fallback);
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: integer(5050, 65535),
  API_PREFIX: z.string().regex(/^\/[a-zA-Z0-9_-]+$/).default('/api'),
  API_VERSION: z.literal('v1').default('v1'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: integer(5432, 65535),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_SCHEMA: z.literal('dbo').default('dbo'),
  DB_POOL_MAX: integer(10, 100),
  DB_CONNECTION_TIMEOUT_MS: integer(5000, 2147483647),
  DB_IDLE_TIMEOUT_MS: integer(30000, 2147483647),
  DB_SSL: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173')
    .transform(v => v.split(',').map(s => s.trim()).filter(Boolean))
    .refine(values => values.length > 0 && values.every(value => {
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
      } catch { return false; }
    }), 'Defina orígenes HTTP/HTTPS explícitos, sin ruta ni barra final'),
  JSON_BODY_LIMIT: z.string().regex(/^[1-9]\d*(?:b|kb|mb)$/i).default('100kb'),
  RATE_LIMIT_WINDOW_MS: integer(900000, 2147483647),
  RATE_LIMIT_MAX: integer(100),
  PAGINATION_DEFAULT_PAGE: integer(1),
  PAGINATION_DEFAULT_LIMIT: integer(20),
  PAGINATION_MAX_LIMIT: integer(100, 100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
}).superRefine((value, context) => {
  if (value.PAGINATION_DEFAULT_LIMIT > value.PAGINATION_MAX_LIMIT) {
    context.addIssue({ code: 'custom', path: ['PAGINATION_DEFAULT_LIMIT'], message: 'Supera el máximo configurado' });
  }
  if (!Number.isSafeInteger((value.PAGINATION_DEFAULT_PAGE - 1) * value.PAGINATION_DEFAULT_LIMIT)) {
    context.addIssue({ code: 'custom', path: ['PAGINATION_DEFAULT_PAGE'], message: 'Desplazamiento fuera del rango seguro' });
  }
});

export function parseEnv(source) {
  const result = schema.safeParse(source);
  if (!result.success) {
    // No incluir valores de configuración ni credenciales en los errores.
    throw new Error('Configuración inválida: ' + result.error.issues.map(i => i.path.join('.')).join(', '));
  }
  return Object.freeze(result.data);
}
export const config = parseEnv(process.env);
