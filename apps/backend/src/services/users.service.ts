// apps/backend/src/services/users.service.ts
import { prisma } from './db.js';
import { hashPassword } from './security/password.service.js';
import { Prisma, type PlatformRole } from '@prisma/client';

type UserPublic = {
  id: number;
  email: string;
  fullName: string;
  createdAt: Date;
  platformRole: PlatformRole;
  mustChangePassword: boolean;
};

/** Alta de usuario por SYSADMIN con password temporal. */
export async function createUserAdmin(input: {
  email: string;
  fullName: string;
  password: string;            // temporal
  platformRole?: PlatformRole; // 'USER' | 'SYSADMIN'
}): Promise<UserPublic> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      email,
      fullName: input.fullName,
      passwordHash,
      platformRole: input.platformRole ?? 'USER',
      isActive: true,
      mustChangePassword: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      createdAt: true,
      platformRole: true,
      mustChangePassword: true,
    },
  });
}

/** Busca un usuario por email (normalizado) para validar duplicados. */
export async function findUserByEmail(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
}

/** Datos mínimos para login (incluye hash). */
export async function getUserForLogin(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      platformRole: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
}

/** Detecta error de constraint única (email) en Prisma. */
export function isUniqueEmailError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}