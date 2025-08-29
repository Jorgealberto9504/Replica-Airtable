// Construye PermissionContext a partir del request + baseId
import type { Request } from 'express';
import { prisma } from '../services/db.js';
import { getAuthUser } from '../middlewares/auth.middleware.js';
import type { PermissionContext } from './types.js';

export async function buildPermissionContext(req: Request, baseId: number): Promise<PermissionContext> {
  const me = getAuthUser<{
    id: number;
    platformRole: 'USER' | 'SYSADMIN';
    canCreateBases: boolean;
  }>(req);

  if (!me) throw Object.assign(new Error('No autenticado'), { status: 401 });

  const base = await prisma.base.findUnique({
    where: { id: baseId },
    select: {
      id: true,
      ownerId: true,
      visibility: true, // 'PUBLIC' | 'PRIVATE'
      members: {
        where: { userId: me.id },
        select: { role: true }, // 'EDITOR' | 'COMMENTER' | 'VIEWER'
        take: 1,
      },
    },
  });

  if (!base) throw Object.assign(new Error('Base no encontrada'), { status: 404 });

  const membershipRole = base.members[0]?.role ?? null;

  const ctx: PermissionContext = {
    userId: me.id,
    platformRole: me.platformRole,
    canCreateBases: me.canCreateBases,

    baseId: base.id,
    baseVisibility: base.visibility, // ya es 'PUBLIC' | 'PRIVATE'
    isOwner: base.ownerId === me.id,
    membershipRole,
  };

  return ctx;
}