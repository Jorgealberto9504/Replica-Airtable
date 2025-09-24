// apps/backend/src/middlewares/error.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError, normalizeError } from '../utils/errors.js';

const isProd = process.env.NODE_ENV === 'production';
const exposeStack = process.env.DEBUG_ERRORS === '1';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const appErr: AppError = normalizeError(err);

  // Logging en servidor
  // Puedes usar aquí tu logger preferido
  console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${appErr.status} ${appErr.code}: ${appErr.message}`, {
    details: appErr.details,
    raw: !isProd ? err : undefined,
  });

  // Respuesta uniforme
  const payload: any = {
    ok: false,
    error: {
      code: appErr.code,
      message: appErr.message,
    },
  };
  if (appErr.details !== undefined) payload.error.details = appErr.details;
  if (!isProd && exposeStack && err?.stack) payload.error.stack = String(err.stack);

  res.status(appErr.status).json(payload);
}