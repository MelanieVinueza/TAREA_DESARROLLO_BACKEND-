import { Producto, PRODUCTO_FIELDS } from '../models/producto.model.js';

const TABLE = 'dbo."Producto"';
const COLUMNS = '"ID", nombre, descripcion, "URLImagen", pvp, stock';
const COLUMN_MAP = Object.freeze({ nombre: 'nombre', descripcion: 'descripcion', URLImagen: '"URLImagen"', pvp: 'pvp', stock: 'stock' });

export class ProductoRepository {
  constructor(pool) { this.pool = pool; }
  async findAll({ limit, offset }) {
    const { rows } = await this.pool.query('SELECT ' + COLUMNS + ' FROM ' + TABLE + ' ORDER BY "ID" ASC LIMIT $1 OFFSET $2', [limit, offset]);
    return rows.map(row => new Producto(row));
  }
  async countAll() {
    const { rows } = await this.pool.query('SELECT COUNT(*) AS total FROM ' + TABLE);
    const total = Number(rows[0].total);
    if (!Number.isSafeInteger(total)) throw new Error('Conteo fuera del rango seguro');
    return total;
  }
  async findById(id) {
    const { rows } = await this.pool.query('SELECT ' + COLUMNS + ' FROM ' + TABLE + ' WHERE "ID" = $1', [id]);
    return rows[0] ? new Producto(rows[0]) : null;
  }
  async create(data) {
    const { rows } = await this.pool.query('INSERT INTO ' + TABLE + ' (nombre, descripcion, "URLImagen", pvp, stock) VALUES ($1, $2, $3, $4, $5) RETURNING ' + COLUMNS, PRODUCTO_FIELDS.map(key => data[key]));
    return new Producto(rows[0]);
  }
  async replace(id, data) {
    const { rows } = await this.pool.query('UPDATE ' + TABLE + ' SET nombre = $1, descripcion = $2, "URLImagen" = $3, pvp = $4, stock = $5 WHERE "ID" = $6 RETURNING ' + COLUMNS, [...PRODUCTO_FIELDS.map(key => data[key]), id]);
    return rows[0] ? new Producto(rows[0]) : null;
  }
  async updatePartial(id, data) {
    const keys = Object.keys(data);
    if (!keys.length || keys.some(key => !Object.hasOwn(COLUMN_MAP, key))) {
      throw new Error('Campos de actualización no permitidos');
    }
    const assignments = keys.map((key, index) => COLUMN_MAP[key] + ' = $' + (index + 1)).join(', ');
    const { rows } = await this.pool.query('UPDATE ' + TABLE + ' SET ' + assignments + ' WHERE "ID" = $' + (keys.length + 1) + ' RETURNING ' + COLUMNS, [...keys.map(key => data[key]), id]);
    return rows[0] ? new Producto(rows[0]) : null;
  }
  async deleteById(id) {
    const result = await this.pool.query('DELETE FROM ' + TABLE + ' WHERE "ID" = $1 RETURNING "ID"', [id]);
    return result.rowCount > 0;
  }
}
