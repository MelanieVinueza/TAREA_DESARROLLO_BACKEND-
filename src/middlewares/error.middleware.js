import { HttpError } from '../utils/http-error.js';

const unavailable = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', '57P01', '57P02', '57P03', '53300']);
export function createErrorMiddleware(logger) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);
    let safe;
    if (error instanceof HttpError) safe = error;
    else if (error.type === 'entity.parse.failed') safe = new HttpError(400, 'INVALID_JSON', 'JSON mal formado');
    else if (error.type === 'entity.too.large') safe = new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera el tamaño permitido');
    else if (error.status === 415) safe = new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Codificación o tipo de contenido no soportado');
    else if (error.type === 'request.aborted' || error.type === 'request.size.invalid') safe = new HttpError(400, 'INVALID_REQUEST', 'Solicitud incompleta o inválida');
    else if (error.code === '23505' || error.code === '23503') safe = new HttpError(409, 'DATA_CONFLICT', 'La operación entra en conflicto con los datos existentes');
    else if (['23502', '23514', '22003', '22001', '22P02'].includes(error.code)) safe = new HttpError(422, 'DATA_CONSTRAINT', 'Los datos no cumplen las restricciones del producto');
    else if (unavailable.has(error.code) || String(error.code ?? '').startsWith('08') || error instanceof AggregateError || error.message === 'Connection terminated due to connection timeout') {
      safe = new HttpError(503, 'DATABASE_UNAVAILABLE', 'La base de datos no está disponible temporalmente');
    } else safe = new HttpError(500, 'INTERNAL_ERROR', 'Error interno del servidor');
    if (safe.status >= 500) {
      // Los mensajes de pg pueden incluir SQL, valores o contraseñas: registrar solo códigos.
      logger.error({ requestId: req.id, status: safe.status, code: safe.code, causeCode: /^[A-Z0-9_]{1,32}$/.test(error.code ?? '') ? error.code : undefined }, 'Solicitud fallida');
    }
    res.status(safe.status).json({ error: {
      code: safe.code, message: safe.message, ...(safe.details ? { details: safe.details } : {}),
    } });
  };
}
