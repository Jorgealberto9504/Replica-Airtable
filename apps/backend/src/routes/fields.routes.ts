import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  // fields
  listFields,
  createField,
  updateField,
  deleteField,
  restoreField,
  deleteFieldPermanent,
  listTrashedFields,
  emptyFieldTrash,
  purgeFieldTrash,
  // options
  listOptions,
  listTrashedOptions,
  createOption,
  updateOption,
  reorderOptions,
  deleteOption,
  restoreOption,
  deleteOptionPermanent,
} from '../controllers/fields.controller.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

/* FIELDS (dentro de una tabla) */
router.get('/', listFields);                     // GET    /bases/:baseId/tables/:tableId/fields
router.post('/', createField);                   // POST   /bases/:baseId/tables/:tableId/fields
router.patch('/:fieldId', updateField);          // PATCH  /bases/:baseId/tables/:tableId/fields/:fieldId
router.delete('/:fieldId', deleteField);         // DELETE /bases/:baseId/tables/:tableId/fields/:fieldId (soft)

router.post('/:fieldId/restore', restoreField);  // POST   /.../fields/:fieldId/restore
router.delete('/:fieldId/permanent', deleteFieldPermanent); // DELETE /.../fields/:fieldId/permanent

router.get('/trash', listTrashedFields);         // GET    /.../fields/trash
router.post('/trash/empty', emptyFieldTrash);    // POST   /.../fields/trash/empty
router.post('/trash/purge', purgeFieldTrash);    // POST   /.../fields/trash/purge?days=30

/* OPTIONS (para fieldId) */
router.get('/:fieldId/options', listOptions);                         // GET    /.../fields/:fieldId/options
router.get('/:fieldId/options/trash', listTrashedOptions);            // GET    /.../fields/:fieldId/options/trash
router.post('/:fieldId/options', createOption);                       // POST   /.../fields/:fieldId/options
router.patch('/:fieldId/options/reorder', reorderOptions);            // PATCH  /.../fields/:fieldId/options/reorder
router.patch('/:fieldId/options/:optionId', updateOption);            // PATCH  /.../fields/:fieldId/options/:optionId
router.delete('/:fieldId/options/:optionId', deleteOption);           // DELETE /.../fields/:fieldId/options/:optionId (soft)
router.post('/:fieldId/options/:optionId/restore', restoreOption);    // POST   /.../fields/:fieldId/options/:optionId/restore
router.delete('/:fieldId/options/:optionId/permanent', deleteOptionPermanent); // DELETE permanente

export default router;