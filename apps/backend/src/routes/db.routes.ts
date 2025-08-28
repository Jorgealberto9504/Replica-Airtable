// apps/backend/src/routes/db.routes.ts
import { Router } from 'express';
import { checkDb, infoDb } from '../controllers/db.controller.js';

const router = Router();

router.get('/check', checkDb);
router.get('/info', infoDb);

// Elimina (o comenta) la línea si la tenías:
// router.post('/write', writeUser);

export default router;