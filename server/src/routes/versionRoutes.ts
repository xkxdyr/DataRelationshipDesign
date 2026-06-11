import { Router } from 'express'
import { versionController } from '../controllers/versionController'
import { requirePermission } from '../middleware/permission'

const router = Router()

// 按 projectId 查询版本需要 view 权限
router.get('/projects/:projectId/versions', requirePermission('view'), versionController.getAll)
// 创建版本需要 edit 权限
router.post('/projects/:projectId/versions', requirePermission('edit'), versionController.create)
// 按 id 操作版本（controller 内部检查）
router.get('/versions/:id', versionController.getById)
router.put('/versions/:id', versionController.update)
router.delete('/versions/:id', versionController.delete)
router.get('/versions/compare/:versionId1/:versionId2', versionController.compare)

export default router
