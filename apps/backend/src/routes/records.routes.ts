import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  listRecords,
  createRecord,
  patchRecord,
  deleteRecord,
} from '../controllers/records.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', listRecords);                 // GET /bases/:baseId/tables/:tableId/records?page=&pageSize=
router.post('/', createRecord);               // POST /bases/:baseId/tables/:tableId/records
router.patch('/:recordId', patchRecord);      // PATCH /bases/:baseId/tables/:tableId/records/:recordId
router.delete('/:recordId', deleteRecord);    // DELETE /bases/:baseId/tables/:tableId/records/:recordId

export default router;