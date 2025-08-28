import { Router } from 'express';
import { requireAuth, requireSuperadmin } from '../middlewares/auth.middleware.js';
import { listUsersCtrl, setCanCreateBasesCtrl } from '../controllers/users.controller.js';

const router = Router();

// Sólo superusuario puede listar y modificar permisos globales
router.get('/', requireAuth, requireSuperadmin, listUsersCtrl);
router.patch('/:id/can-create-bases', requireAuth, requireSuperadmin, setCanCreateBasesCtrl);

export default router;