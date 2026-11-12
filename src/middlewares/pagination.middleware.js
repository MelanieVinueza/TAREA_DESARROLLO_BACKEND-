import { HttpError } from '../utils/http-error.js';

export function createPaginationMiddleware(config) {
  return (req, res, next) => {
    const invalid = () => new HttpError(400, 'INVALID_PAGINATION', 'Paginación inválida: use page y limit enteros positivos dentro de los límites permitidos');
    const parse = (value, fallback) => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw invalid();
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw invalid();
      return number;
    };
    if (Object.keys(req.query).some(key => !['page', 'limit'].includes(key))) throw invalid();
    const page = parse(req.query.page, config.PAGINATION_DEFAULT_PAGE);
    const limit = parse(req.query.limit, config.PAGINATION_DEFAULT_LIMIT);
    const offset = (page - 1) * limit;
    if (limit > config.PAGINATION_MAX_LIMIT || !Number.isSafeInteger(offset)) throw invalid();
    req.pagination = { page, limit, offset };
    next();
  };
}
