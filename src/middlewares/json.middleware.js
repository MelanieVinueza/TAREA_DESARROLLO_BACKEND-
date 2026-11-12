import express from 'express';
import { HttpError } from '../utils/http-error.js';

const WRITES = new Set(['POST', 'PUT', 'PATCH']);
export function requireJson(req, res, next) {
  const mediaType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (WRITES.has(req.method) && mediaType !== 'application/json') {
    return next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere Content-Type: application/json'));
  }
  next();
}
export function createJsonParser(limit) {
  // strict:false permite identificar null, arrays y escalares como cuerpo inválido de manera uniforme.
  return express.json({
    limit, strict: false,
    verify(req, res, buffer) { req.jsonBodyLength = buffer.length; },
  });
}
export function requireObject(req, res, next) {
  if (!req.jsonBodyLength || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(new HttpError(400, 'INVALID_JSON_BODY', 'El cuerpo debe ser un objeto JSON'));
  }
  next();
}
