// apps/backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';

const router = Router();

// POST /auth/register
router.post('/register', register);

export default router;