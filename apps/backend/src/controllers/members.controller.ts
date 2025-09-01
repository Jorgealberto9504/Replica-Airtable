import type { Request, Response } from 'express';
import { Prisma, type BaseRole } from '@prisma/client';
import {
  listBaseMembers,
  findUserByEmailStrict,
  addMember,
  updateMemberRole,
  removeMember,
  getBaseOwnerId,
} from '../services/members.service.js';

// GET /bases/:baseId/members
export async function listMembersCtrl(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const members = await listBaseMembers(baseId);
    return res.json({ ok: true, members });
  } catch (e) {
    console.error('[listMembersCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo listar miembros' });
  }
}

// POST /bases/:baseId/members  { email, role }
export async function addMemberCtrl(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const { email, role } = req.body as { email?: string; role?: BaseRole };

    if (!email || !role) {
      return res.status(400).json({ ok: false, error: 'email y role son requeridos' });
    }
    if (!['EDITOR', 'COMMENTER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'role inválido' });
    }

    // No permitir agregar al owner como "miembro" (ya tiene control por ownerId)
    const ownerId = await getBaseOwnerId(baseId);
    const user = await findUserByEmailStrict(email);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    if (user.id === ownerId) {
      return res.status(400).json({ ok: false, error: 'El dueño no se agrega como miembro' });
    }

    try {
      const member = await addMember(baseId, user.id, role);
      return res.status(201).json({ ok: true, member });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return res.status(409).json({ ok: false, error: 'El usuario ya es miembro de esta base' });
      }
      throw e;
    }
  } catch (e) {
    console.error('[addMemberCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo agregar miembro' });
  }
}

// PATCH /bases/:baseId/members/:memberId  { role }
export async function updateMemberRoleCtrl(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const memberId = Number(req.params.memberId);
    const { role } = req.body as { role?: BaseRole };

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ ok: false, error: 'memberId inválido' });
    }
    if (!role || !['EDITOR', 'COMMENTER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'role inválido' });
    }

    const updated = await updateMemberRole(memberId, baseId, role);

    if (updated.baseId !== baseId) {
      return res.status(400).json({ ok: false, error: 'Miembro no pertenece a esta base' });
    }

    return res.json({ ok: true, member: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Miembro no encontrado' });
    }
    console.error('[updateMemberRoleCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el rol' });
  }
}

// DELETE /bases/:baseId/members/:memberId
export async function removeMemberCtrl(req: Request, res: Response) {
  try {
    const baseId = Number(req.params.baseId);
    const memberId = Number(req.params.memberId);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ ok: false, error: 'memberId inválido' });
    }

    await removeMember(memberId, baseId);
    return res.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 404) {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Miembro no encontrado' });
    }
    console.error('[removeMemberCtrl]', e);
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar miembro' });
  }
}