import { PrismaClient } from '@prisma/client';

/**
 * Cliente normal (usa DATABASE_URL; suele ir por PgBouncer en modo "transaction").
 * Úsalo para lecturas/escrituras simples SIN transacción interactiva.
 */
export const prisma = new PrismaClient();

/**
 * Cliente DIRECTO (usa DIRECT_DATABASE_URL; SIN PgBouncer).
 * Úsalo SIEMPRE que invoques prisma.$transaction(...) (callback o array).
 */
const directUrl = process.env.DIRECT_DATABASE_URL;
export const prismaDirect =
  directUrl ? new PrismaClient({ datasources: { db: { url: directUrl } } }) : prisma;