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

/**
 * Crear base
 * - Auth
 * - Permiso GLOBAL: 'bases:create' (SYSADMIN o canCreateBases=true)
 */
router.post('/', requireAuth, guardGlobal('bases:create'), createBaseCtrl);

/**
 * Listar bases accesibles para el usuario autenticado
 * - Auth (sin guard específico: listamos públicas + dueño + membresías)
 */
router.get('/', requireAuth, listMyBasesCtrl);

/**
 * Obtener una base por id
 * - Auth
 * - Permiso en ESA base: 'base:view'
 */
router.get('/:baseId', requireAuth, guard('base:view'), getBaseCtrl);

/**
 * Actualizar base (nombre y/o visibilidad)
 * - Auth
 * - Sólo dueño (owner) mediante acción de administración de base.
 *   Usamos 'schema:manage' para cubrir cambios de metadatos como el name.
 */
router.patch('/:baseId', requireAuth, guard('schema:manage'), updateBaseCtrl);

/**
 * Eliminar base
 * - Auth
 * - Sólo dueño: 'base:delete'
 */
router.delete('/:baseId', requireAuth, guard('base:delete'), deleteBaseCtrl);

export default router;