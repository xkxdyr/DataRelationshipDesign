import { Router } from 'express'
import { tableController } from '../controllers/tableController'
import { requirePermission, requirePermissionByTable, requirePermissionByResource } from '../middleware/permission'

const router = Router()

// 按 projectId 查询表需要 view 权限
router.get('/projects/:projectId/tables', requirePermission('view'), tableController.getAll)
// 创建表需要 edit 权限
router.post('/projects/:projectId/tables', requirePermission('edit'), tableController.create)
// 按 tableId 操作需要通过 tableId 查找 projectId 后检查权限
router.get('/tables/:id', requirePermissionByResource('view', 'table'), tableController.getById)
router.put('/tables/:id', requirePermissionByResource('edit', 'table'), tableController.update)
router.patch('/tables/:id/position', requirePermissionByResource('edit', 'table'), tableController.updatePosition)
router.delete('/tables/:id', requirePermissionByResource('edit', 'table'), tableController.delete)

export default router
