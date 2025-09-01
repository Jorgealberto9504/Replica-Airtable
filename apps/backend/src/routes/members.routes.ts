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
router.get('/:baseId/members', requireAuth, guard('members:manage'), listMembersCtrl);
router.post('/:baseId/members', requireAuth, guard('members:manage'), addMemberCtrl);
router.patch('/:baseId/members/:memberId', requireAuth, guard('members:manage'), updateMemberRoleCtrl);
router.delete('/:baseId/members/:memberId', requireAuth, guard('members:manage'), removeMemberCtrl);

export default router;