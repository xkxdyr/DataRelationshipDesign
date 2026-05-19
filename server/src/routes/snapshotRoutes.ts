import express from 'express'
import { snapshotController } from '../controllers/snapshotController'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

router.post('/:projectId/snapshots', authMiddleware, snapshotController.createSnapshot)
router.get('/:projectId/snapshots', authMiddleware, snapshotController.listSnapshots)
router.get('/:projectId/snapshots/:versionId', authMiddleware, snapshotController.getSnapshot)
router.post('/:projectId/snapshots/:versionId/restore', authMiddleware, snapshotController.restoreSnapshot)
router.delete('/:projectId/snapshots/:versionId', authMiddleware, snapshotController.deleteSnapshot)

export default router