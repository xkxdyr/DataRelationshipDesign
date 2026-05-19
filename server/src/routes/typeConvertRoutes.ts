import { Router } from 'express'
import { typeConvertController } from '../controllers/typeConvertController'

const router = Router()

router.post('/convert', typeConvertController.convert)
router.post('/table', typeConvertController.convertTable)
router.get('/mappings', typeConvertController.getMappings)
router.get('/database-types', typeConvertController.getDatabaseTypes)

export default router