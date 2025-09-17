import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { listFields, createField, updateField, deleteField } from '../controllers/fields.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', listFields);                 // GET /bases/:baseId/tables/:tableId/fields
router.post('/', createField);               // POST /bases/:baseId/tables/:tableId/fields
router.patch('/:fieldId', updateField);       // PATCH /bases/:baseId/tables/:tableId/fields/:fieldId
router.delete('/:fieldId', deleteField);     // DELETE /bases/:baseId/tables/:tableId/fields/:fieldId

export default router;