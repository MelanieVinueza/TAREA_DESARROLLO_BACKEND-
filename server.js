import { createApp } from './src/app.js';
import { config } from './src/config/env.js';
import { closePool } from './src/config/database.js';
import { logger } from './src/config/logger.js';

const app = createApp();
const server = app.listen(config.PORT, config.HOST, () => {
  logger.info({ url: 'http://' + config.HOST + ':' + config.PORT + config.API_PREFIX + '/' + config.API_VERSION + '/productos' }, 'API de productos iniciada');
});
server.on('error', async error => {
  logger.error({ code: error.code ?? 'SERVER_ERROR' }, 'No se pudo iniciar el servidor');
  await closePool();
  process.exitCode = 1;
});
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info({ signal }, 'Cerrando servidor y conexiones');
  const timer = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10000);
  timer.unref();
  server.close(async () => {
    try { await closePool(); }
    catch { process.exitCode = 1; }
    finally { clearTimeout(timer); }
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
