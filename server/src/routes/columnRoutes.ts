import { Router } from 'express'
import { columnController } from '../controllers/columnController'

const router = Router()

router.get('/tables/:tableId/columns', columnController.getAll)
router.get('/columns/:id', columnController.getById)
router.post('/tables/:tableId/columns', columnController.create)
router.post('/tables/:tableId/columns/bulk', columnController.bulkCreate)
router.put('/columns/:id', columnController.update)
router.patch('/tables/:tableId/columns/order', columnController.updateOrder)
router.delete('/columns/:id', columnController.delete)

export default router
