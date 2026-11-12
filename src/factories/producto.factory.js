import { getPool } from '../config/database.js';
import { ProductoRepository } from '../repositories/producto.repository.js';
import { ProductoController } from '../controllers/producto.controller.js';

export function createProductoController(repository) {
  return new ProductoController(repository ?? new ProductoRepository(getPool()));
}
