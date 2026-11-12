import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config/env.js';
import { getPool, closePool } from '../src/config/database.js';
import { ProductoRepository } from '../src/repositories/producto.repository.js';
import { serve, validProducto } from './helpers.js';

// Activada al completar .env. Solo modifica productos creados por esta prueba.
// ROLLBACK revierte los datos; las secuencias identity pueden avanzar.
test('PostgreSQL real: tabla, permisos, conteo y CRUD HTTP en transacción', {
  skip: config.DB_PASSWORD === 'REEMPLAZAR_LOCALMENTE' ? 'Configure credenciales en .env para ejecutar PostgreSQL real' : false,
}, async t => {
  let client;
  let transaction = false;
  t.after(async () => {
    try {
      if (client && transaction) await client.query('ROLLBACK');
    } finally {
      client?.release();
      await closePool();
    }
  });
  client = await getPool().connect();
  await client.query('BEGIN');
  transaction = true;
  const { rows: [role] } = await client.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');
  assert.equal(role.rolsuper, false, 'La API debe usar una cuenta sin privilegios de superusuario');
  const repository = new ProductoRepository(client);
  const total = await repository.countAll();
  assert.ok(total >= 0);
  const { write, request } = await serve(t, { repository });
  const root = '/api/v1/productos';
  let response = await request(root + '?page=1&limit=20');
  assert.equal(response.status, 200);
  const list = await response.json();
  assert.equal(list.pagination.total, total);
  assert.ok(list.data.length <= 20);
  response = await write('POST', root, { ...validProducto, nombre: 'Prueba automatizada temporal' });
  assert.equal(response.status, 201);
  const created = (await response.json()).data;
  assert.equal(created.pvp, '49.90');
  assert.equal(typeof created.ID, 'string');
  const path = root + '/' + created.ID;
  assert.equal((await request(path)).status, 200);
  response = await write('PUT', path, { ...validProducto, pvp: '99999999.99', nombre: 'Reemplazo temporal' });
  assert.equal(response.status, 200);
  const replaced = (await response.json()).data;
  assert.equal(replaced.pvp, '99999999.99');
  response = await write('PATCH', path, { stock: 0 });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { ...replaced, stock: 0 });
  response = await request(path, { method: 'DELETE' });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal((await request(path)).status, 404);
});
