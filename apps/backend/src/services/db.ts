// apps/backend/src/services/db.ts
import { PrismaClient } from '@prisma/client';

// Instancia única del cliente de Prisma (pool de conexiones a Postgres).
export const prisma = new PrismaClient();