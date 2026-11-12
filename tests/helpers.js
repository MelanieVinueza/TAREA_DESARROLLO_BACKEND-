import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';

export const validProducto = {
  nombre: 'Teclado mecánico', descripcion: 'Teclado con conexión USB',
  URLImagen: 'https://ejemplo.com/teclado.jpg', pvp: '49.90', stock: 25,
};
export class MemoryRepository {
  constructor() { this.items = new Map(); this.nextId = 1n; }
  async findAll({ limit, offset }) {
    return [...this.items.values()].sort((a, b) => BigInt(a.ID) < BigInt(b.ID) ? -1 : 1).slice(offset, offset + limit);
  }
  async countAll() { return this.items.size; }
  async findById(id) { return this.items.get(id) ?? null; }
  async create(data) {
    const item = { ID: String(this.nextId++), ...data };
    this.items.set(item.ID, item);
    return item;
  }
  async replace(id, data) {
    if (!this.items.has(id)) return null;
    const item = { ID: id, ...data };
    this.items.set(id, item);
    return item;
  }
  async updatePartial(id, data) {
    if (!this.items.has(id)) return null;
    const item = { ...this.items.get(id), ...data };
    this.items.set(id, item);
    return item;
  }
  async deleteById(id) { return this.items.delete(id); }
}
export async function serve(t, { repository = new MemoryRepository(), ...overrides } = {}) {
  const app = createApp({
    repository, config: { ...config, RATE_LIMIT_MAX: 10000, ...overrides },
    logger: { error() {} },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {
    repository, base,
    request(path = '/api/v1/productos', options = {}) { return fetch(base + path, options); },
    write(method, path, data) {
      return fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    },
  };
}
