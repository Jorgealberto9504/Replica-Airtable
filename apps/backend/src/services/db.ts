// apps/backend/src/services/db.ts
import { PrismaClient } from '@prisma/client';

// Exporta una instancia de PrismaClient para usar en otros servicios
export const prisma = new PrismaClient();