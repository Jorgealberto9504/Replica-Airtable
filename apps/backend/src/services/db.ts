// apps/backend/src/services/db.ts
// ============================================================================
// PrismaClient (singleton en dev) con dos clientes:
//  - prisma:        usa DATABASE_URL (pool/PgBouncer).
//  - prismaDirect:  usa DIRECT_DATABASE_URL (sin pool). Úsalo p/ $transaction.
// ============================================================================

import { PrismaClient } from '@prisma/client';

function makeClient(url?: string) {
  return url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
}

// Evita múltiples instancias en dev (que agotan el pool)
const g = globalThis as unknown as {
  __prisma?: PrismaClient;
  __prismaDirect?: PrismaClient;
};

export const prisma = g.__prisma ?? makeClient(process.env.DATABASE_URL);

const directUrl = process.env.DIRECT_DATABASE_URL || undefined;
export const prismaDirect = g.__prismaDirect ?? (directUrl ? makeClient(directUrl) : prisma);

if (process.env.NODE_ENV !== 'production') {
  g.__prisma = prisma;
  g.__prismaDirect = prismaDirect;
}