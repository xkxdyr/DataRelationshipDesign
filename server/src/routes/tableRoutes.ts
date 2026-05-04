import { Router } from 'express'
import { tableController } from '../controllers/tableController'

const router = Router()

router.get('/projects/:projectId/tables', tableController.getAll)
router.get('/tables/:id', tableController.getById)
router.post('/projects/:projectId/tables', tableController.create)
router.put('/tables/:id', tableController.update)
router.patch('/tables/:id/position', tableController.updatePosition)
router.delete('/tables/:id', tableController.delete)

export default router
