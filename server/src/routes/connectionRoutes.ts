import { Router } from 'express'
import { connectionController } from '../controllers/connectionController'
import { connectionTestController } from '../controllers/connectionTestController'

const router = Router()

router.get('/', connectionController.getAll)
router.get('/:id', connectionController.getById)
router.post('/', connectionController.create)
router.put('/:id', connectionController.update)
router.delete('/:id', connectionController.delete)
router.post('/test', connectionTestController.testConnection)

export default router