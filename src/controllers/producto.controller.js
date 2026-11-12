import { HttpError } from '../utils/http-error.js';

function requireProducto(producto) {
  if (!producto) throw new HttpError(404, 'PRODUCTO_NOT_FOUND', 'Producto no encontrado');
  return producto;
}
export class ProductoController {
  constructor(repository) { this.repository = repository; }
  getAll = async (req, res) => {
    const { page, limit, offset } = req.pagination;
    const [data, total] = await Promise.all([
      this.repository.findAll({ limit, offset }), this.repository.countAll(),
    ]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  };
  getById = async (req, res) => {
    res.json({ data: requireProducto(await this.repository.findById(req.productoId)) });
  };
  create = async (req, res) => {
    const data = await this.repository.create(req.productoData);
    res.location(req.baseUrl + '/' + data.ID).status(201).json({ data });
  };
  replace = async (req, res) => {
    res.json({ data: requireProducto(await this.repository.replace(req.productoId, req.productoData)) });
  };
  updatePartial = async (req, res) => {
    res.json({ data: requireProducto(await this.repository.updatePartial(req.productoId, req.productoData)) });
  };
  remove = async (req, res) => {
    requireProducto(await this.repository.deleteById(req.productoId));
    res.status(204).end();
  };
}
