import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProducto, Producto } from '../src/models/producto.model.js';
import { parseEnv, config } from '../src/config/env.js';
import { validProducto } from './helpers.js';

test('Normaliza texto y precio sin perder precisión', () => {
  const data = parseProducto({ ...validProducto, nombre: '  Café  ', pvp: '000049.9' });
  assert.equal(data.nombre, 'Café');
  assert.equal(data.pvp, '49.90');
  assert.equal(parseProducto({ ...validProducto, pvp: '99999999.99' }).pvp, '99999999.99');
});
test('Modelo conserva BIGINT y NUMERIC como cadenas', () => {
  const value = JSON.parse(JSON.stringify(new Producto({ ...validProducto, ID: '9223372036854775807', pvp: '99999999.99' })));
  assert.equal(value.ID, '9223372036854775807');
  assert.equal(value.pvp, '99999999.99');
});
const invalid = [
  ['nombre vacío', { nombre: '  ' }],
  ['nombre demasiado largo', { nombre: 'a'.repeat(251) }],
  ['carácter nulo', { descripcion: 'a\u0000b' }],
  ['descripción inválida', { descripcion: null }],
  ['URL no HTTP', { URLImagen: 'javascript:alert(1)' }],
  ['URL mal formada', { URLImagen: 'https://' }],
  ['URL sin doble barra', { URLImagen: 'http:ejemplo.com' }],
  ['precio negativo', { pvp: '-0.01' }],
  ['precio como número', { pvp: 49.90 }],
  ['precio excedido', { pvp: '100000000.00' }],
  ['precio con 3 decimales', { pvp: '1.001' }],
  ['precio en notación exponencial', { pvp: '1e3' }],
  ['stock fraccionario', { stock: 1.5 }],
  ['stock negativo', { stock: -1 }],
  ['stock fuera de INTEGER', { stock: 2147483648 }],
  ['stock como cadena', { stock: '25' }],
  ['ID del cliente', { ID: '12' }],
  ['campo desconocido', { extra: true }],
];
for (const [name, patch] of invalid) {
  test('Rechaza ' + name, () => {
    assert.throws(() => parseProducto({ ...validProducto, ...patch }), error => error.status === 422);
  });
}
test('POST y PUT exigen todos los campos; PATCH exige al menos uno', () => {
  assert.throws(() => parseProducto({ stock: 1 }), error => error.status === 422);
  assert.throws(() => parseProducto({}, true), error => error.status === 422);
  assert.deepEqual(parseProducto({ stock: 0 }, true), { stock: 0 });
});
test('Configuración rechaza valores inválidos sin revelar secretos', () => {
  const source = { ...config, CORS_ORIGINS: config.CORS_ORIGINS.join(','), DB_SSL: 'false' };
  for (const changes of [
    { PORT: 'abc' }, { DB_SSL: 'no' }, { CORS_ORIGINS: '*' },
    { CORS_ORIGINS: 'http://localhost:3000/path' },
    { PAGINATION_DEFAULT_LIMIT: '101' }, { DB_SCHEMA: 'otro' },
    { RATE_LIMIT_WINDOW_MS: '0' },
  ]) {
    assert.throws(() => parseEnv({ ...source, ...changes }), /Configuración inválida/);
  }
  assert.throws(() => parseEnv({ ...source, DB_PASSWORD: '' }), error => !error.message.includes('REEMPLAZAR_LOCALMENTE'));
});
