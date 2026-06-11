import { Router } from 'express'
import { indexController } from '../controllers/indexController'
import { requirePermissionByTable, requirePermissionByResource } from '../middleware/permission'

const router = Router()

// 按 tableId 查询/创建索引
router.get('/tables/:tableId/indexes', requirePermissionByTable('view'), indexController.getAll)
router.post('/tables/:tableId/indexes', requirePermissionByTable('edit'), indexController.create)
// 按 indexId 操作
router.get('/indexes/:id', requirePermissionByResource('view', 'index'), indexController.getById)
router.put('/indexes/:id', requirePermissionByResource('edit', 'index'), indexController.update)
router.delete('/indexes/:id', requirePermissionByResource('edit', 'index'), indexController.delete)

export default router
