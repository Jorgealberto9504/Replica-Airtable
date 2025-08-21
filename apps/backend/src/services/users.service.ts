import { prisma } from './db.js';
import { hashPassword } from './security/password.service.js';
import { Prisma, PlatformRole } from '@prisma/client';

/** Alta de usuario por SYSADMIN con password temporal. */
export async function createUserAdmin(input: {
  email: string;
  fullName: string;
  password: string;                // temporal
  platformRole?: PlatformRole;     // 'USER' | 'SYSADMIN'
}) {
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      platformRole: input.platformRole ?? 'USER',
      isActive: true,               // si tienes este campo en el schema
      mustChangePassword: true,     // <- clave para forzar cambio en primer login
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      platformRole: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return user;
}

// (dejas tus otras funciones: createUser, findUserByEmail, isUniqueEmailError, etc.)

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