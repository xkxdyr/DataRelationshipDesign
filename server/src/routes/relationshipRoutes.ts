import { Router } from 'express'
import { relationshipController } from '../controllers/relationshipController'

const router = Router()

router.get('/projects/:projectId/relationships', relationshipController.getAll)
router.get('/relationships/:id', relationshipController.getById)
router.post('/projects/:projectId/relationships', relationshipController.create)
router.put('/relationships/:id', relationshipController.update)
router.delete('/relationships/:id', relationshipController.delete)

export default router
