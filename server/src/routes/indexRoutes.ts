import { Router } from 'express'
import { indexController } from '../controllers/indexController'

const router = Router()

router.get('/tables/:tableId/indexes', indexController.getAll)
router.get('/indexes/:id', indexController.getById)
router.post('/tables/:tableId/indexes', indexController.create)
router.put('/indexes/:id', indexController.update)
router.delete('/indexes/:id', indexController.delete)

export default router
