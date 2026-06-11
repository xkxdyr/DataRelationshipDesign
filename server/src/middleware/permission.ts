import { Response, NextFunction } from 'express'
import { projectMemberService } from '../services/projectMemberService'
import { AuthenticatedRequest } from './auth'

type PermissionLevel = 'view' | 'edit' | 'manage'

const LEVEL_LABEL: Record<PermissionLevel, string> = {
  view: '查看',
  edit: '编辑',
  manage: '管理'
}

/**
 * 创建权限检查中间件
 * 从路由参数中提取 projectId，检查当前用户是否具有指定权限
 *
 * 权限层级：
 * - view: owner/editor/viewer 均可查看
 * - edit: 仅 owner/editor 可编辑
 * - manage: 仅 owner 可管理
 */
export const requirePermission = (level: PermissionLevel) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method
    const path = req.originalUrl
    try {
      const userId = req.user?.userId
      if (!userId) {
        console.warn(`[Permission] 拦截: 未认证 | ${method} ${path}`)
        return res.status(401).json({ success: false, error: '未认证' })
      }

      // 从路由参数中提取 projectId
      const projectId = req.params.projectId || req.params.id
      if (!projectId) {
        // 没有 projectId 参数的路由（如 GET /projects 列表），直接放行
        console.log(`[Permission] 放行: 无projectId | ${method} ${path} | userId=${userId}`)
        return next()
      }

      let hasPermission = false
      switch (level) {
        case 'view':
          hasPermission = await projectMemberService.canView(projectId, userId)
          break
        case 'edit':
          hasPermission = await projectMemberService.canEdit(projectId, userId)
          break
        case 'manage':
          hasPermission = await projectMemberService.canManage(projectId, userId)
          break
      }

      if (!hasPermission) {
        console.warn(`[Permission] 拦截: 无${LEVEL_LABEL[level]}权限 | ${method} ${path} | userId=${userId} | projectId=${projectId} | required=${level}`)
        return res.status(403).json({ success: false, error: `没有${LEVEL_LABEL[level]}权限` })
      }

      console.log(`[Permission] 放行: ${LEVEL_LABEL[level]}权限通过 | ${method} ${path} | userId=${userId} | projectId=${projectId} | required=${level}`)
      next()
    } catch (error) {
      console.error(`[Permission] 异常: ${method} ${path} | error=`, error)
      return res.status(500).json({ success: false, error: '权限检查失败' })
    }
  }
}

/**
 * 通过 tableId 查找 projectId 并检查权限
 * 用于路由参数中有 tableId 的场景（如 GET /tables/:tableId/columns）
 */
export const requirePermissionByTable = (level: PermissionLevel) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method
    const path = req.originalUrl
    try {
      const userId = req.user?.userId
      if (!userId) {
        console.warn(`[Permission:ByTable] 拦截: 未认证 | ${method} ${path}`)
        return res.status(401).json({ success: false, error: '未认证' })
      }

      const tableId = req.params.tableId
      if (!tableId) {
        console.log(`[Permission:ByTable] 放行: 无tableId | ${method} ${path} | userId=${userId}`)
        return next()
      }

      const { tableService } = await import('../services/tableService')
      const table = await tableService.findById(tableId)
      if (!table) {
        console.warn(`[Permission:ByTable] 拦截: 表不存在 | ${method} ${path} | tableId=${tableId}`)
        return res.status(404).json({ success: false, error: '资源不存在' })
      }

      const projectId = table.projectId
      let hasPermission = false
      switch (level) {
        case 'view':
          hasPermission = await projectMemberService.canView(projectId, userId)
          break
        case 'edit':
          hasPermission = await projectMemberService.canEdit(projectId, userId)
          break
        case 'manage':
          hasPermission = await projectMemberService.canManage(projectId, userId)
          break
      }

      if (!hasPermission) {
        console.warn(`[Permission:ByTable] 拦截: 无${LEVEL_LABEL[level]}权限 | ${method} ${path} | userId=${userId} | tableId=${tableId} | projectId=${projectId} | required=${level}`)
        return res.status(403).json({ success: false, error: `没有${LEVEL_LABEL[level]}权限` })
      }

      console.log(`[Permission:ByTable] 放行: ${LEVEL_LABEL[level]}权限通过 | ${method} ${path} | userId=${userId} | tableId=${tableId} | projectId=${projectId} | required=${level}`)
      next()
    } catch (error) {
      console.error(`[Permission:ByTable] 异常: ${method} ${path} | error=`, error)
      return res.status(500).json({ success: false, error: '权限检查失败' })
    }
  }
}

/**
 * 通过资源ID（tableId/columnId/indexId）查找所属 projectId 并检查权限
 * 自动检测参数类型并查找对应的 projectId
 */
export const requirePermissionByResource = (level: PermissionLevel, resourceType: 'table' | 'column' | 'index') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const method = req.method
    const path = req.originalUrl
    try {
      const userId = req.user?.userId
      if (!userId) {
        console.warn(`[Permission:ByResource] 拦截: 未认证 | ${method} ${path} | resourceType=${resourceType}`)
        return res.status(401).json({ success: false, error: '未认证' })
      }

      const resourceId = req.params.id
      if (!resourceId) {
        console.log(`[Permission:ByResource] 放行: 无resourceId | ${method} ${path} | userId=${userId} | resourceType=${resourceType}`)
        return next()
      }

      let projectId: string | null = null

      if (resourceType === 'table') {
        const { tableService } = await import('../services/tableService')
        const table = await tableService.findById(resourceId)
        if (!table) {
          console.warn(`[Permission:ByResource] 拦截: 表不存在 | ${method} ${path} | resourceId=${resourceId} | resourceType=table`)
          return res.status(404).json({ success: false, error: '资源不存在' })
        }
        projectId = table.projectId
      } else if (resourceType === 'column') {
        const { columnService } = await import('../services/columnService')
        const column = await columnService.findById(resourceId)
        if (!column) {
          console.warn(`[Permission:ByResource] 拦截: 列不存在 | ${method} ${path} | resourceId=${resourceId} | resourceType=column`)
          return res.status(404).json({ success: false, error: '资源不存在' })
        }
        // column 有 tableId，通过 tableId 找 projectId
        const { tableService } = await import('../services/tableService')
        const table = await tableService.findById(column.tableId)
        if (!table) {
          console.warn(`[Permission:ByResource] 拦截: 列所属表不存在 | ${method} ${path} | columnId=${resourceId} | tableId=${column.tableId}`)
          return res.status(404).json({ success: false, error: '资源不存在' })
        }
        projectId = table.projectId
      } else if (resourceType === 'index') {
        const { indexService } = await import('../services/indexService')
        const index = await indexService.findById(resourceId)
        if (!index) {
          console.warn(`[Permission:ByResource] 拦截: 索引不存在 | ${method} ${path} | resourceId=${resourceId} | resourceType=index`)
          return res.status(404).json({ success: false, error: '资源不存在' })
        }
        const { tableService } = await import('../services/tableService')
        const table = await tableService.findById(index.tableId)
        if (!table) {
          console.warn(`[Permission:ByResource] 拦截: 索引所属表不存在 | ${method} ${path} | indexId=${resourceId} | tableId=${index.tableId}`)
          return res.status(404).json({ success: false, error: '资源不存在' })
        }
        projectId = table.projectId
      }

      if (!projectId) {
        console.log(`[Permission:ByResource] 放行: 未找到projectId | ${method} ${path} | userId=${userId} | resourceType=${resourceType} | resourceId=${resourceId}`)
        return next()
      }

      let hasPermission = false
      switch (level) {
        case 'view':
          hasPermission = await projectMemberService.canView(projectId, userId)
          break
        case 'edit':
          hasPermission = await projectMemberService.canEdit(projectId, userId)
          break
        case 'manage':
          hasPermission = await projectMemberService.canManage(projectId, userId)
          break
      }

      if (!hasPermission) {
        console.warn(`[Permission:ByResource] 拦截: 无${LEVEL_LABEL[level]}权限 | ${method} ${path} | userId=${userId} | resourceType=${resourceType} | resourceId=${resourceId} | projectId=${projectId} | required=${level}`)
        return res.status(403).json({ success: false, error: `没有${LEVEL_LABEL[level]}权限` })
      }

      console.log(`[Permission:ByResource] 放行: ${LEVEL_LABEL[level]}权限通过 | ${method} ${path} | userId=${userId} | resourceType=${resourceType} | resourceId=${resourceId} | projectId=${projectId} | required=${level}`)
      next()
    } catch (error) {
      console.error(`[Permission:ByResource] 异常: ${method} ${path} | resourceType=${resourceType} | error=`, error)
      return res.status(500).json({ success: false, error: '权限检查失败' })
    }
  }
}
