// apps/backend/src/services/bases.service.ts
import { prisma } from './db.js';
import type { BaseVisibility } from '@prisma/client';
import { Prisma } from '@prisma/client'; // NUEVO T6.4: detectar P2002 (violación de unique)

// NUEVO T6.4: helper local para mapear duplicados a HTTP 409
function rethrowConflictIfDuplicateBase(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const err: any = new Error('Unique constraint violation');
    err.status = 409;
    err.body = {
      error: 'CONFLICT',
      detail: 'Duplicate base name for this owner', // (ownerId, name)
      code: 'P2002',
      meta: e.meta, // opcional: Prisma meta con campos
    };
    throw err;
  }
  throw e;
}

export async function createBase(input: {
  ownerId: number;
  name: string;
  visibility: BaseVisibility;
}) {
  try { // NUEVO T6.4: capturar P2002 y convertirlo a 409
    return await prisma.base.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        visibility: input.visibility,
      },
      select: {
        id: true,
        name: true,
        visibility: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (e) { // NUEVO T6.4
    rethrowConflictIfDuplicateBase(e);
  }
}

/**
 * Lista todas las bases a las que el usuario TIENE acceso:
 * - Públicas (visibility=PUBLIC)
 * - Donde es dueño
 * - Donde es miembro
 */
export async function listAccessibleBasesForUser(userId: number) {
  const bases = await prisma.base.findMany({
    where: {
      OR: [
        { visibility: 'PUBLIC' },
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  return bases.map((b) => ({
    ...b,
    membershipRole: b.members[0]?.role ?? null,
    members: undefined as any,
  }));
}

/**
 * SYSADMIN: lista TODAS las bases (públicas y privadas).
 * Incluye membershipRole si el admin también es miembro de alguna base.
 */
export async function listAllBasesForSysadmin(viewerUserId: number) {
  const bases = await prisma.base.findMany({
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
      members: {
        where: { userId: viewerUserId },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { id: 'asc' },
  });

  return bases.map((b) => ({
    ...b,
    membershipRole: b.members[0]?.role ?? null,
    members: undefined as any,
  }));
}

export async function getBaseById(baseId: number) {
  return prisma.base.findUnique({
    where: { id: baseId },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, fullName: true, email: true } },
    },
  });
}

export async function updateBase(
  baseId: number,
  patch: { name?: string; visibility?: BaseVisibility }
) {
  try { // NUEVO T6.4: capturar P2002 si el rename rompe la unicidad (ownerId, name)
    return await prisma.base.update({
      where: { id: baseId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
      },
      select: {
        id: true,
        name: true,
        visibility: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (e) { // NUEVO T6.4
    rethrowConflictIfDuplicateBase(e);
  }
}

export async function deleteBase(baseId: number) {
  await prisma.base.delete({ where: { id: baseId } });
}