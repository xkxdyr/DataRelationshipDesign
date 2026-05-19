import { Router } from 'express'
import { branchController } from '../controllers/branchController'

const router = Router()

router.get('/projects/:projectId/branches', branchController.getByProject)
router.get('/projects/:projectId/branches/default', branchController.getDefault)
router.get('/branches/:id', branchController.getById)
router.post('/projects/:projectId/branches', branchController.create)
router.put('/branches/:id', branchController.update)
router.delete('/branches/:id', branchController.remove)
router.post('/branches/:id/set-default', branchController.setDefault)
router.post('/branches/:id/switch', branchController.switchBranch)

export default router