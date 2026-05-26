import { Request, Response } from 'express'
import { projectMemberService, AddMemberRequest, UpdateMemberRoleRequest } from '../services/projectMemberService'
import { AuthenticatedRequest } from '../middleware/auth'

export const projectMemberController = {
  async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params
      const request = req.body as AddMemberRequest
      request.projectId = projectId

      if (!request.userId) {
        return res.json({ success: false, error: '缺少用户ID' })
      }

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, error: '没有权限添加成员' })
      }

      const result = await projectMemberService.addMember(request)

      if (result.success && result.data) {
        res.json({ success: true, data: result.data })
      } else {
        res.json({ success: false, error: result.error || '添加成员失败' })
      }
    } catch (error) {
      console.error('添加成员失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId, userId } = req.params

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, error: '没有权限移除成员' })
      }

      const success = await projectMemberService.removeMember(projectId, userId)
      res.json({ success, message: success ? '成员已移除' : '移除失败' })
    } catch (error) {
      console.error('移除成员失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId, userId } = req.params
      const request = req.body as UpdateMemberRoleRequest

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, error: '没有权限更新成员角色' })
      }

      const result = await projectMemberService.updateMemberRole(projectId, userId, request)

      if (result) {
        res.json({ success: true, data: result })
      } else {
        res.json({ success: false, error: '更新角色失败' })
      }
    } catch (error) {
      console.error('更新角色失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getProjectMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params

      const canView = await projectMemberService.canView(projectId, req.user?.userId || '')
      if (!canView) {
        return res.status(403).json({ success: false, error: '没有权限查看项目成员' })
      }

      const members = await projectMemberService.getProjectMembers(projectId)
      res.json({ success: true, data: members })
    } catch (error) {
      console.error('获取项目成员失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserProjects(req: AuthenticatedRequest, res: Response) {
    try {
      const projects = await projectMemberService.getUserProjects(req.user?.userId || '')
      res.json({ success: true, data: projects })
    } catch (error) {
      console.error('获取用户项目失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async checkPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params
      const { permission } = req.query as { permission?: string }

      let hasPermission = false

      switch (permission) {
        case 'view':
          hasPermission = await projectMemberService.canView(projectId, req.user?.userId || '')
          break
        case 'edit':
          hasPermission = await projectMemberService.canEdit(projectId, req.user?.userId || '')
          break
        case 'manage':
          hasPermission = await projectMemberService.canManage(projectId, req.user?.userId || '')
          break
        default:
          hasPermission = await projectMemberService.isMember(projectId, req.user?.userId || '')
      }

      res.json({ success: true, data: { hasPermission } })
    } catch (error) {
      console.error('检查权限失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}