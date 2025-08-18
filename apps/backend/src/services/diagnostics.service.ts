// apps/backend/src/services/diagnostics.service.ts
import { prisma } from './db.js';

// Verifica la conexión real ejecutando un SELECT 1.
// Lanza error si no hay conexión (lo capturará el controller).
export async function pingDB() {
  await prisma.$queryRaw`SELECT 1`;
}

// Pide la versión del servidor Postgres (SELECT version()).
export async function getDbVersion() {
  const [row] = await prisma.$queryRaw<{ version: string }[]>`
    SELECT version() AS version
  `;
  return row?.version ?? null;
}