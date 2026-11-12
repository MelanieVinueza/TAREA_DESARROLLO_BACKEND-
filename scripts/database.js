import { readFile } from 'node:fs/promises';
import { getPool, closePool } from '../src/config/database.js';
import { config } from '../src/config/env.js';

const action = process.argv[2] ?? 'check';
try {
  if (!['check', 'schema', 'seed'].includes(action)) throw new Error('Acción inválida');
  if (config.DB_PASSWORD === 'REEMPLAZAR_LOCALMENTE') {
    console.error('Configure DB_USER y DB_PASSWORD en .env para conectarse a ' + config.DB_NAME);
    process.exitCode = 1;
  } else {
    const pool = getPool();
    if (action === 'schema' || action === 'seed') {
      const filename = action === 'schema' ? '001-schema.sql' : '002-seed.sql';
      await pool.query(await readFile(new URL('../sql/' + filename, import.meta.url), 'utf8'));
    }
    const { rows: [role] } = await pool.query('SELECT current_user AS usuario, rolsuper FROM pg_roles WHERE rolname = current_user');
    const { rows: [count] } = await pool.query('SELECT COUNT(*) AS total FROM dbo."Producto"');
    console.log(JSON.stringify({ database: config.DB_NAME, usuario: role.usuario, superusuario: role.rolsuper, total_productos: count.total }, null, 2));
    if (role.rolsuper) {
      console.error('Configure la API con un usuario sin privilegios de superusuario.');
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error('No se pudo verificar PostgreSQL. Código: ' + (error.code ?? 'CONFIG_ERROR') + '. Revise .env y la existencia de dbo."Producto".');
  process.exitCode = 1;
} finally {
  await closePool();
}
