import { Router } from 'express'
import { reverseEngineeringController } from '../controllers/reverseEngineeringController'

const router = Router()

router.post('/import', reverseEngineeringController.importFromDatabase)
router.post('/tables', reverseEngineeringController.getTableList)

export default router