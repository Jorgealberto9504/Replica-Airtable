// apps/backend/src/routes/db.routes.ts
import { Router } from 'express';
import { checkDb, infoDb, writeUser } from '../controllers/db.controller.js';

const router = Router();

router.get('/check', checkDb);   // Liveness de BD
router.get('/info', infoDb);     // Versión de Postgres
router.post('/write', writeUser); // Prueba de escritura

export default router;