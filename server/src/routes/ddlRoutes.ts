import { Router } from 'express'
import { ddlController } from '../controllers/ddlController'

const router = Router()

router.get('/projects/:projectId/ddl', ddlController.generateForProject)
router.get('/tables/:tableId/ddl', ddlController.generateForTable)
router.get('/ddl/databases', ddlController.getSupportedDatabases)

export default router
