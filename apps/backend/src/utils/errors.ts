// apps/backend/src/utils/errors.ts
import { Prisma } from '@prisma/client';

/**
 * Estructura estándar para errores de aplicación.
 * Usa siempre AppError a través de los helpers de abajo.
 */
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* ========= Helpers de creación ========= */

export const badRequest = (message = 'Solicitud inválida', details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'No autenticado') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'FORBIDDEN') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'No encontrado') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message = 'Conflicto', details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);

export const unprocessable = (message = 'Entidad no procesable', details?: unknown) =>
  new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);

export const internal = (message = 'Error interno') =>
  new AppError(500, 'INTERNAL_ERROR', message);

/* ========= Mapeo de errores de Zod (mensajes amigables) ========= */
export function fromZodError(err: any): AppError {
  if (err?.name !== 'ZodError') return badRequest('Body inválido');

  const details = (err.issues ?? []).map((i: any) => {
    const path = Array.isArray(i.path) ? i.path.join('.') : String(i.path ?? '');
    let message = i.message;

    // Traducciones/amabilización por tipo de issue
    if (i.code === 'invalid_type') {
      if (i.received === 'undefined') {
        message = `${path || 'valor'} es obligatorio.`;
      } else {
        message = `${path || 'valor'} debe ser de tipo ${String(i.expected)}.`;
      }
    } else if (i.code === 'too_small') {
      if (i.type === 'string' && i.minimum === 1) {
        message = `${path || 'texto'} no puede estar vacío.`;
      } else if (i.type === 'array') {
        message = `${path || 'lista'} tiene muy pocos elementos.`;
      } else if (i.type === 'number') {
        message = `${path || 'número'} es demasiado pequeño.`;
      }
    } else if (i.code === 'too_big') {
      if (i.type === 'array') {
        message = `${path || 'lista'} tiene demasiados elementos.`;
      } else if (i.type === 'number') {
        message = `${path || 'número'} es demasiado grande.`;
      }
    } else if (i.code === 'invalid_enum_value') {
      message = `${path || 'valor'} no es válido.`;
    } else if (i.code === 'invalid_string') {
      message = `${path || 'texto'} no tiene el formato esperado.`;
    }

    return { path, message, code: i.code };
  });

  // Si solo hay un detalle, usarlo como mensaje principal
  const message = details.length === 1 ? (details[0]?.message ?? 'Validación fallida') : 'Validación fallida';
  return unprocessable(message, details);
}

/* ========= Mapeo de errores de Prisma ========= */
export function fromPrismaError(err: any): AppError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // unique constraint
        return conflict('Violación de índice único', {
          target: (err.meta as any)?.target,
          code: err.code,
        });
      case 'P2025': // not found
        return notFound('Registro no encontrado (P2025)');
      case 'P2003': // foreign key
        return conflict('Restricción de llave foránea', {
          field: (err.meta as any)?.field_name,
          code: err.code,
        });
      case 'P2028': // transaction not found
        return new AppError(
          409,
          'TRANSACTION_NOT_FOUND',
          'La transacción de Prisma no es válida o ya fue cerrada.',
          {
            code: err.code,
            hint:
              'Evita usar el cliente fuera del callback de prisma.$transaction, no hagas await paralelos que cierren la tx, y no mezcles prisma.* con tx.*.',
          }
        );
      default:
        return internal(`Error de Prisma (${err.code})`);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    // Error de shape/tipos hacia Prisma (no del usuario final, pero útil)
    return badRequest('Payload inválido para Prisma (tipos/shape).');
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(503, 'DB_INIT_ERROR', 'No se pudo inicializar Prisma/DB.');
  }

  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return new AppError(500, 'DB_PANIC', 'Prisma sufrió un panic.');
  }

  return null;
}

/* ========= Normalizador general para el middleware ========= */
export function normalizeError(err: any): AppError {
  if (!err) return internal();

  // Si ya es AppError, respétalo
  if (err instanceof AppError) return err;

  // JSON malformado (body-parser)
  if (err?.type === 'entity.parse.failed') {
    return badRequest('JSON malformado. Revisa comas, comillas y llaves.', {
      original: err.message,
    });
  }

  // Si algún servicio lanzó { status, message, code?, details? }
  if (typeof err?.status === 'number' && typeof err?.message === 'string') {
    return new AppError(err.status, err.code || 'ERROR', err.message, err.body ?? err.details);
  }

  // Validación Zod
  if (err?.name === 'ZodError') return fromZodError(err);

  // Prisma
  const prismaMapped = fromPrismaError(err);
  if (prismaMapped) return prismaMapped;

  // Desconocido
  return internal(err?.message || 'Error inesperado');
}