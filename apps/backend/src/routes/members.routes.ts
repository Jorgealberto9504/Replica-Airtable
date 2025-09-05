import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guard } from '../permissions/guard.js';
import {
  listMembersCtrl,
  addMemberCtrl,
  updateMemberRoleCtrl,
  removeMemberCtrl,
} from '../controllers/members.controller.js';

const router = Router();

// Todas requieren: autenticado + permiso de "members:manage" en ESA base
// GET /bases/:baseId/members
//LISTAR MIEMBROS
router.get('/:baseId/members', requireAuth, guard('members:manage'), listMembersCtrl);

// POST /bases/:baseId/members  { email, role }
//AGREGAR UN MIEMBRO
router.post('/:baseId/members', requireAuth, guard('members:manage'), addMemberCtrl);

// PATCH /bases/:baseId/members/:memberId  { role }
//ACTUALIZAR ROL DE UN MIEMBRO
router.patch('/:baseId/members/:memberId', requireAuth, guard('members:manage'), updateMemberRoleCtrl);

// DELETE /bases/:baseId/members/:memberId
//ELIMINAR UN MIEMBRO
router.delete('/:baseId/members/:memberId', requireAuth, guard('members:manage'), removeMemberCtrl);

export default router;