import { Router } from 'express'
import { databaseSyncController } from '../controllers/databaseSyncController'

const router = Router()

router.post('/sync', databaseSyncController.syncToDatabase)
router.post('/dry-run', databaseSyncController.dryRun)

export default router