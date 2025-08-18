// apps/backend/src/services/users.service.ts
import { prisma } from './db.js';

// Inserta un usuario de prueba en "User".
// Nota: passwordHash 'dummy' solo para esta prueba de 1.3.
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
    // Si prefieres no devolver passwordHash, puedes usar select.
    // select: { id: true, email: true, fullName: true, createdAt: true },
  });
  return user;
}