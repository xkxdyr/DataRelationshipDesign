import { Router } from 'express'
import { commentController } from '../controllers/commentController'

const router = Router()

router.get('/tables/:tableId/comments', commentController.getByTableId)
router.get('/tables/:tableId/comments/count', commentController.countByTableId)
router.get('/comments/:id', commentController.getById)
router.post('/tables/:tableId/comments', commentController.create)
router.put('/comments/:id', commentController.update)
router.delete('/comments/:id', commentController.delete)

export default router