import { prisma } from './db.js';
import type { BaseRole } from '@prisma/client';

export async function listBaseMembers(baseId: number) {
  return prisma.baseMember.findMany({
    where: { baseId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, email: true, fullName: true } },
    },
  });
}

export async function findUserByEmailStrict(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true },
  });
}

export async function addMember(baseId: number, userId: number, role: BaseRole) {
  // Evita duplicados por unique (baseId,userId)
  return prisma.baseMember.create({
    data: { baseId, userId, role },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, email: true, fullName: true } },
    },
  });
}

export async function updateMemberRole(memberId: number, baseId: number, role: BaseRole) {
  // Asegura que pertenece a la misma base
  return prisma.baseMember.update({
    where: { id: memberId },
    data: { role },
    select: {
      id: true,
      role: true,
      createdAt: true,
      baseId: true,
      user: { select: { id: true, email: true, fullName: true } },
    },
  });
}

export async function removeMember(memberId: number, baseId: number) {
  // Solo elimina si es de esa base (defensa adicional)
  const bm = await prisma.baseMember.findUnique({ where: { id: memberId } });
  if (!bm || bm.baseId !== baseId) {
    throw Object.assign(new Error('Miembro no encontrado en esta base'), { status: 404 });
  }
  return prisma.baseMember.delete({ where: { id: memberId } });
}

export async function getBaseOwnerId(baseId: number) {
  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: { ownerId: true },
  });
  return base?.ownerId ?? null;
}