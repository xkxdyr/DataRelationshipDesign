import { Router } from 'express'
import { versionController } from '../controllers/versionController'

const router = Router()

router.get('/projects/:projectId/versions', versionController.getAll)
router.get('/versions/:id', versionController.getById)
router.post('/projects/:projectId/versions', versionController.create)
router.put('/versions/:id', versionController.update)
router.delete('/versions/:id', versionController.delete)

export default router
