// apps/backend/src/routes/audit.routes.ts
// -----------------------------------------------------------------------------
// Router de Auditoría
// - GET /api/bases/:baseId/audit → lista eventos con filtros/paginación
// -----------------------------------------------------------------------------
import { Router } from 'express';
import { listAuditEvents } from '../controllers/audit.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Lista eventos para una base (solo SYSADMIN o dueño)
router.get('/bases/:baseId/audit', requireAuth, listAuditEvents);

export default router;