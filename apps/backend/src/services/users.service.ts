// apps/backend/src/services/users.service.ts
import { prisma } from './db.js';
import { hashPassword } from './security/password.service.js';
import { Prisma } from '@prisma/client';

/**
 * === MODO DEV (usado en /db/write de la tarea 1.3) ===
 * Inserta un usuario de prueba (deja passwordHash='dummy' si no se pasa).
 */
export async function createUserDev(input: {
  email: string;
  fullName: string;
  passwordHash?: string;
}) {
  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash: input.passwordHash ?? 'dummy',
    },
  });
  return user;
}

/**
 * === MODO REAL (para 3.2 /auth/register) ===
 * Hashea la contraseña y crea el usuario.
 * Devuelve SOLO campos públicos (no expone passwordHash).
 */
export async function createUser(input: {
  email: string;
  fullName: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      createdAt: true,
      platformRole: true,
    },
  });

  return user;
}

/**
 * Busca un usuario por email (para validar duplicados antes de crear).
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true }, 
  });
}


 // Helper para detectar el error de Prisma por email único.
 
export function isUniqueEmailError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}