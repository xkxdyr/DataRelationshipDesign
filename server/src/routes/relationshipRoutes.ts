import { Router } from 'express'
import { relationshipController } from '../controllers/relationshipController'
import { requirePermission } from '../middleware/permission'

const router = Router()

// 按 projectId 查询关系需要 view 权限
router.get('/projects/:projectId/relationships', requirePermission('view'), relationshipController.getAll)
// 创建关系需要 edit 权限
router.post('/projects/:projectId/relationships', requirePermission('edit'), relationshipController.create)
// 按 id 操作关系：需要先查找 projectId，这里简化处理，在 controller 中检查
router.get('/relationships/:id', relationshipController.getById)
router.put('/relationships/:id', relationshipController.update)
router.delete('/relationships/:id', relationshipController.delete)

export default router
