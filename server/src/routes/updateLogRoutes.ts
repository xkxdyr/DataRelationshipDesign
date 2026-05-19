import { Router } from 'express'
import { updateLogController } from '../controllers/updateLogController'

const router = Router()

router.get('/', updateLogController.getLogs)
router.post('/', updateLogController.addLog)

export default router
