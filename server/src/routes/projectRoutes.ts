import { Router } from 'express'
import { projectController } from '../controllers/projectController'

const router = Router()

router.get('/', projectController.getAll)
router.get('/:id', projectController.getById)
router.post('/', projectController.create)
router.put('/:id', projectController.update)
router.delete('/:id', projectController.delete)
router.post('/:id/duplicate', projectController.duplicate)

export default router
