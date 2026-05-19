import { Router } from 'express'
import { gitConfigController } from '../controllers/gitConfigController'

const router = Router()

router.get('/projects/:projectId/git-config', gitConfigController.get)
router.put('/projects/:projectId/git-config', gitConfigController.upsert)
router.delete('/projects/:projectId/git-config', gitConfigController.remove)

export default router