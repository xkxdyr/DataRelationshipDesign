import { Router } from 'express'
import { projectController } from '../controllers/projectController'
import { requirePermission } from '../middleware/permission'

const router = Router()

// 查看项目详情需要 view 权限
router.get('/:id', requirePermission('view'), projectController.getById)
// 更新/删除/复制项目需要 manage 权限
router.put('/:id', requirePermission('manage'), projectController.update)
router.delete('/:id', requirePermission('manage'), projectController.delete)
router.post('/:id/duplicate', requirePermission('manage'), projectController.duplicate)
// 协作相关
router.post('/:projectId/collaboration', projectController.toggleCollaboration)
router.get('/:projectId/collaboration', projectController.getCollaborationStatus)
router.post('/:projectId/convert-to-team', projectController.convertToTeamProject)
// 列表和创建不需要 projectId 级别权限检查
router.get('/', projectController.getAll)
router.post('/', projectController.create)

export default router
