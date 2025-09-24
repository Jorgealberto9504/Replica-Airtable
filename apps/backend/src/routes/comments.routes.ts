import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  listComments,
  createComment,
  updateComment,
  softDeleteComment,
  // trash
  listTrashedComments,
  restoreComment,
  deleteCommentPermanent,
  emptyCommentTrash,
  purgeCommentTrash,
} from '../controllers/comments.controller.js';

// Muy importante: mergeParams para heredar baseId/tableId/recordId del parent
const router = Router({ mergeParams: true });
router.use(requireAuth);

// Base absoluta (montado): /bases/:baseId/tables/:tableId/records/:recordId/comments

// Listar/crear
router.get('/', listComments);        // GET    .../comments
router.post('/', createComment);      // POST   .../comments

// Papelera (rutas estáticas primero)
router.get('/trash', listTrashedComments);          // GET  .../comments/trash
router.post('/trash/empty', emptyCommentTrash);     // POST .../comments/trash/empty
router.post('/trash/purge', purgeCommentTrash);     // POST .../comments/trash/purge?days=30

// Operar comentario puntual
router.patch('/:commentId', updateComment);                 // PATCH  .../comments/:commentId
router.delete('/:commentId', softDeleteComment);            // DELETE .../comments/:commentId (soft)
router.post('/:commentId/restore', restoreComment);         // POST   .../comments/:commentId/restore
router.delete('/:commentId/permanent', deleteCommentPermanent); // DELETE permanente

export default router;