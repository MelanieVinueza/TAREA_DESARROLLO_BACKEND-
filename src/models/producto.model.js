import { z } from 'zod';
import { HttpError } from '../utils/http-error.js';

export const PRODUCTO_FIELDS = Object.freeze(['nombre', 'descripcion', 'URLImagen', 'pvp', 'stock']);
const text = z.string().trim().min(1, 'No puede estar vacío')
  .refine(value => !value.includes('\u0000'), 'No admite caracteres nulos');
const price = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Use una cadena decimal no negativa con hasta 8 enteros y 2 decimales')
  .transform(value => {
    const [integer, decimal = ''] = value.split('.');
    return String(BigInt(integer)) + '.' + decimal.padEnd(2, '0');
  });
export const productoSchema = z.strictObject({
  nombre: text.refine(value => [...value].length <= 250, 'Máximo 250 caracteres'),
  descripcion: text,
  URLImagen: text.refine(value => {
    try {
      const url = new URL(value);
      return /^https?:\/\//i.test(value) && ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch { return false; }
  }, 'Debe ser una URL http:// o https:// válida'),
  pvp: price,
  stock: z.number().int().min(0).max(2147483647),
});
export const productoPatchSchema = productoSchema.partial()
  .refine(value => Object.keys(value).length > 0, 'Incluya al menos un campo editable');

export class Producto {
  constructor(row) {
    this.ID = String(row.ID);
    this.nombre = row.nombre;
    this.descripcion = row.descripcion;
    this.URLImagen = row.URLImagen;
    // No convertir NUMERIC a Number: conservar exactamente los centavos.
    this.pvp = price.parse(String(row.pvp));
    this.stock = row.stock;
  }
  toJSON() { return { ...this }; }
}
export function parseProducto(body, partial = false) {
  const result = (partial ? productoPatchSchema : productoSchema).safeParse(body);
  if (!result.success) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Los datos del producto no son válidos',
      result.error.issues.map(issue => ({
        field: issue.path.join('.') || 'body',
        message: issue.code === 'unrecognized_keys' ? 'Contiene campos no permitidos' : issue.message,
      })));
  }
  return result.data;
}
