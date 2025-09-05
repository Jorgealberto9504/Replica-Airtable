// apps/backend/src/routes/bases.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { guard, guardGlobal } from '../permissions/guard.js';
import {
  createBaseCtrl,
  listMyBasesCtrl,
  getBaseCtrl,
  updateBaseCtrl,
  deleteBaseCtrl,
} from '../controllers/bases.controller.js';

const router = Router();

// POST /bases  { name, visibility }
//CREAR BASE
router.post('/', requireAuth, guardGlobal('bases:create'), createBaseCtrl);

// GET /bases
//LISTAR MIS BASES
router.get('/', requireAuth, listMyBasesCtrl);

// GET /bases/:baseId
//VER UNA BASE POR ID
router.get('/:baseId', requireAuth, guard('base:view'), getBaseCtrl);

// PATCH /bases/:baseId  { name, visibility }
//ACTUALIZAR BASE
router.patch('/:baseId', requireAuth, guard('schema:manage'), updateBaseCtrl);

// DELETE /bases/:baseId
//ELIMINAR BASE
router.delete('/:baseId', requireAuth, guard('base:delete'), deleteBaseCtrl);

export default router;