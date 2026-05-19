import { Router } from 'express'
import { incrementalDdlController } from '../controllers/incrementalDdlController'

const router = Router()

router.post('/versions/:versionId1/:versionId2', incrementalDdlController.generateFromVersions)
router.post('/tables', incrementalDdlController.generateFromTables)
router.get('/projects/:projectId/vs-version/:versionId', incrementalDdlController.generateFromCurrentVsVersion)
router.post('/projects/:projectId/versions', incrementalDdlController.generateFromProjectVersions)

export default router