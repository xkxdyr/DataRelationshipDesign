import { Router } from 'express'
import { columnController } from '../controllers/columnController'
import { requirePermissionByTable, requirePermissionByResource } from '../middleware/permission'

const router = Router()

// 按 tableId 查询/创建列
router.get('/tables/:tableId/columns', requirePermissionByTable('view'), columnController.getAll)
router.post('/tables/:tableId/columns', requirePermissionByTable('edit'), columnController.create)
router.post('/tables/:tableId/columns/bulk', requirePermissionByTable('edit'), columnController.bulkCreate)
router.patch('/tables/:tableId/columns/order', requirePermissionByTable('edit'), columnController.updateOrder)
// 按 columnId 操作
router.get('/columns/:id', requirePermissionByResource('view', 'column'), columnController.getById)
router.put('/columns/:id', requirePermissionByResource('edit', 'column'), columnController.update)
router.delete('/columns/:id', requirePermissionByResource('edit', 'column'), columnController.delete)

export default router
