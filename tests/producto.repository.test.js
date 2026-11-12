import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductoRepository } from '../src/repositories/producto.repository.js';
import { validProducto } from './helpers.js';

test('SQL mantiene entradas maliciosas como parámetros y ordena por ID', async () => {
  const queries = [];
  const pool = { async query(text, values) {
    queries.push({ text, values });
    return { rows: [{ ...validProducto, ID: '9007199254740993' }], rowCount: 1 };
  } };
  const repository = new ProductoRepository(pool);
  const malicious = "x'); DROP TABLE dbo.\"Producto\"; --";
  await repository.create({ ...validProducto, nombre: malicious });
  await repository.updatePartial('9007199254740993', { nombre: malicious, stock: 0 });
  await repository.findAll({ limit: 20, offset: 20 });
  assert.ok(!queries[0].text.includes(malicious));
  assert.equal(queries[0].values[0], malicious);
  assert.ok(queries[0].text.includes('dbo."Producto"'));
  assert.ok(queries[1].text.includes('nombre = $1, stock = $2'));
  assert.deepEqual(queries[1].values, [malicious, 0, '9007199254740993']);
  assert.ok(queries[2].text.includes('ORDER BY "ID" ASC LIMIT $1 OFFSET $2'));
  assert.deepEqual(queries[2].values, [20, 20]);
  const before = queries.length;
  await assert.rejects(repository.updatePartial('1', { 'stock = 0; --': 4 }));
  await assert.rejects(repository.updatePartial('1', {}));
  assert.equal(queries.length, before);
});
