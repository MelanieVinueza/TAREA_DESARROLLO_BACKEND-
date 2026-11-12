import test from 'node:test';
import assert from 'node:assert/strict';
import { serve, validProducto } from './helpers.js';

const root = '/api/v1/productos';
test('CRUD completo HTTP, Location, PUT y PATCH, borrado sin cuerpo', async t => {
  const { write, request } = await serve(t);
  let response = await write('POST', root, { ...validProducto, nombre: '  Teclado  ' });
  assert.equal(response.status, 201);
  const { data: created } = await response.json();
  assert.equal(created.nombre, 'Teclado');
  assert.equal(created.pvp, '49.90');
  assert.equal(typeof created.ID, 'string');
  const path = root + '/' + created.ID;
  assert.equal(response.headers.get('location'), path);
  response = await request(path);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, created);

  response = await write('PUT', path, { ...validProducto, nombre: 'Nuevo', pvp: '12', stock: 4 });
  assert.equal(response.status, 200);
  const replaced = (await response.json()).data;
  assert.equal(replaced.pvp, '12.00');
  response = await write('PATCH', path, { stock: 0 });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, { ...replaced, stock: 0 });
  response = await request(path, { method: 'DELETE' });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(path, { method: 'DELETE' })).status, 404);
  assert.equal((await write('PUT', path, validProducto)).status, 404);
  assert.equal((await write('PATCH', path, { stock: 1 })).status, 404);
});
test('10 000 productos: paginación, orden y metadatos', async t => {
  const { repository, request } = await serve(t);
  for (let n = 0; n < 10000; n++) await repository.create({ ...validProducto, nombre: 'Producto ' + (n + 1) });
  const response = await request(root + '?page=2&limit=20');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.data.length, 20);
  assert.equal(result.data[0].ID, '21');
  assert.equal(result.data[19].ID, '40');
  assert.deepEqual(result.pagination, { page: 2, limit: 20, total: 10000, totalPages: 500 });
});
test('Lista vacía devuelve 200 y data vacía', async t => {
  const { request } = await serve(t);
  const response = await request(root);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
});
test('Los BIGINT grandes no pierden precisión al pasar por HTTP', async t => {
  const { repository, request } = await serve(t);
  repository.nextId = 9223372036854775807n;
  await repository.create(validProducto);
  const response = await request(root + '/9223372036854775807');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.ID, '9223372036854775807');
});
test('Rechaza IDs incorrectos antes del repositorio', async t => {
  const { request } = await serve(t);
  for (const id of ['0', '-1', '1.2', 'abc', '1e3', '9223372036854775808', '1%20OR%201=1']) {
    assert.equal((await request(root + '/' + id)).status, 400, id);
  }
});
test('Paginación rechaza valores inválidos y parámetros repetidos', async t => {
  const { request } = await serve(t);
  for (const query of ['limit=1000', 'page=0', 'limit=-1', 'page=1.2', 'page=abc', 'page=9007199254740992', 'page=9007199254740991&limit=100', 'page=1&page=2', 'page[]=1', 'offset=1', 'limit=']) {
    assert.equal((await request(root + '?' + query)).status, 400, query);
  }
});
test('Errores semánticos 422 y rechazo de campos desconocidos', async t => {
  const { write } = await serve(t);
  for (const body of [
    {}, { ...validProducto, ID: '123' }, { ...validProducto, pvp: '-1.00' },
    { ...validProducto, stock: 1.1 }, { ...validProducto, URLImagen: 'file:///etc/passwd' },
    { ...validProducto, nombre: { nested: true } },
    JSON.parse(JSON.stringify(validProducto).slice(0, -1) + ',"__proto__":{"admin":true}}'),
  ]) {
    const response = await write('POST', root, body);
    assert.equal(response.status, 422);
    const result = await response.json();
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(result.error.details));
  }
  assert.equal((await write('PUT', root + '/1', { stock: 1 })).status, 422);
  assert.equal((await write('PATCH', root + '/1', {})).status, 422);
});
test('JSON, objetos obligatorios, tamaño y Content-Type', async t => {
  const { request } = await serve(t, { JSON_BODY_LIMIT: '1kb' });
  const send = (body, type = 'application/json') => request(root, {
    method: 'POST', headers: { 'Content-Type': type }, body,
  });
  assert.equal((await send('{"nombre":')).status, 400);
  for (const value of ['null', '[]', '"texto"', '1', 'true', '']) {
    assert.equal((await send(value)).status, 400, value);
  }
  assert.equal((await send('{}', 'text/plain')).status, 415);
  assert.equal((await request(root, { method: 'POST' })).status, 415);
  assert.equal((await send(JSON.stringify({ ...validProducto, descripcion: 'a'.repeat(2000) }))).status, 413);
  assert.equal((await send(JSON.stringify(validProducto), 'application/json; charset=utf-8')).status, 201);
});
test('Versiones, rutas y métodos no admitidos', async t => {
  const { request } = await serve(t);
  assert.equal((await request('/api/v2/productos')).status, 404);
  assert.equal((await request('/inexistente')).status, 404);
  const response = await request(root, { method: 'DELETE' });
  assert.equal(response.status, 405);
  assert.ok(response.headers.get('allow').includes('POST'));
});
test('CORS restringido, preflight y cabeceras de seguridad', async t => {
  const { request } = await serve(t);
  const allowed = await request(root, { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(allowed.headers.get('x-powered-by'), null);
  assert.ok(allowed.headers.get('x-request-id'));
  assert.equal((await request(root, { headers: { Origin: 'https://intruso.example' } })).status, 403);
  const response = await request(root, {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'PATCH' },
  });
  assert.equal(response.status, 204);
  assert.ok(response.headers.get('access-control-allow-methods').includes('PATCH'));
});
test('Límite de tasa devuelve JSON y 429', async t => {
  const { request } = await serve(t, { RATE_LIMIT_MAX: 1 });
  assert.equal((await request(root)).status, 200);
  const response = await request(root);
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'RATE_LIMIT_EXCEEDED');
});
for (const [code, expected] of [['ECONNREFUSED', 503], ['23505', 409], ['23514', 422], ['42P01', 500]]) {
  test('Error de persistencia ' + code + ': respuesta segura ' + expected, async t => {
    const { request } = await serve(t, { repository: {
      async findAll() { throw Object.assign(new Error('password=secreto SELECT * FROM tabla_privada'), { code }); },
      async countAll() { return 0; },
    } });
    const response = await request(root);
    assert.equal(response.status, expected);
    const body = await response.text();
    assert.ok(!body.includes('secreto'));
    assert.ok(!body.includes('SELECT'));
    assert.ok(!body.includes('stack'));
  });
}
