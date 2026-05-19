import { Request, Response } from 'express'
import { projectMemberService, AddMemberRequest, ProjectRole } from '../services/projectMemberService'
import { AuthenticatedRequest } from '../middleware/auth'
import { inviteService } from '../services/inviteService'

interface InviteInfo {
  code: string
  projectId: string
  projectName: string
  role: ProjectRole
  maxUses: number
  usedCount: number
  createdBy: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
}

export const inviteController = {
  async createInvite(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params
      const { role = 'editor', maxUses = 1, expiresInDays = 7 } = req.body

      const projectRole: ProjectRole = ['owner', 'editor', 'viewer'].includes(role)
        ? (role as ProjectRole)
        : 'editor'

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, message: '没有权限创建邀请码' })
      }

      const project = await inviteService.findProjectName(projectId)

      if (!project) {
        return res.status(404).json({ success: false, message: '项目不存在' })
      }

      const invite = await inviteService.create({
        projectId,
        role: projectRole,
        maxUses,
        expiresInDays,
        createdBy: req.user?.userId || ''
      })

      res.json({
        success: true,
        data: {
          inviteCode: invite.code,
          projectName: project.name,
          role: invite.role,
          maxUses: invite.maxUses,
          expiresAt: invite.expiresAt
        }
      })
    } catch (error) {
      console.error('创建邀请码失败:', error)
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async validateInvite(req: AuthenticatedRequest, res: Response) {
    try {
      const { inviteCode } = req.body

      if (!inviteCode) {
        return res.status(400).json({ success: false, message: '请输入邀请码' })
      }

      const cleanCode = inviteCode.replace(/-/g, '').toUpperCase().trim()

      const invite = await inviteService.findByCode(cleanCode)

      if (!invite) {
        return res.status(404).json({ success: false, message: '邀请码无效' })
      }

      if (!invite.isActive) {
        return res.status(400).json({ success: false, message: '邀请码已失效' })
      }

      if (invite.usedCount >= invite.maxUses) {
        return res.status(400).json({ success: false, message: '邀请码使用次数已满' })
      }

      const now = new Date()
      if (invite.expiresAt < now) {
        return res.status(400).json({ success: false, message: '邀请码已过期' })
      }

      const userId = req.user?.userId || ''
      const isMember = await projectMemberService.isMember(invite.projectId, userId)
      if (isMember) {
        return res.status(400).json({ success: false, message: '您已经是该项目的成员了' })
      }

      res.json({
        success: true,
        data: {
          projectId: invite.projectId,
          projectName: invite.project.name,
          role: invite.role as ProjectRole,
          maxUses: invite.maxUses,
          usedCount: invite.usedCount,
          expiresAt: invite.expiresAt
        }
      })
    } catch (error) {
      console.error('验证邀请码失败:', error)
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async joinProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { inviteCode } = req.body

      if (!inviteCode) {
        return res.status(400).json({ success: false, message: '请输入邀请码' })
      }

      const cleanCode = inviteCode.replace(/-/g, '').toUpperCase().trim()

      const invite = await inviteService.findByCodeWithProject(cleanCode)

      if (!invite) {
        return res.status(404).json({ success: false, message: '邀请码无效' })
      }

      if (!invite.isActive) {
        return res.status(400).json({ success: false, message: '邀请码已失效' })
      }

      if (invite.usedCount >= invite.maxUses) {
        return res.status(400).json({ success: false, message: '邀请码使用次数已满' })
      }

      const now = new Date()
      if (invite.expiresAt < now) {
        return res.status(400).json({ success: false, message: '邀请码已过期' })
      }

      const userId = req.user?.userId || ''
      const userName = req.user?.username || 'Unknown'
      const isMember = await projectMemberService.isMember(invite.projectId, userId)
      if (isMember) {
        return res.status(400).json({ success: false, message: '您已经是该项目的成员了' })
      }

      const hasReachedLimit = await projectMemberService.hasReachedPersonalLimit(invite.projectId)
      if (hasReachedLimit) {
        return res.status(400).json({
          success: false,
          message: '个人项目成员已达上限 (最多5人)，请升级为团队项目'
        })
      }

      const request: AddMemberRequest = {
        projectId: invite.projectId,
        userId,
        userName,
        role: invite.role as ProjectRole
      }

      const result = await projectMemberService.addMember(request)

      if (!result.success) {
        return res.json({ success: false, message: result.error || '加入项目失败' })
      }

      await inviteService.incrementUsage(invite.id, invite.usedCount, invite.maxUses)

      res.json({
        success: true,
        message: '加入项目成功',
        data: invite.project
      })
    } catch (error) {
      console.error('加入项目失败:', error)
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async getInvites(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, message: '没有权限查看邀请码' })
      }

      const invites = await inviteService.findActiveByProject(projectId)

      const formattedInvites: InviteInfo[] = invites.map(invite => ({
        code: invite.code,
        projectId: invite.projectId,
        projectName: invite.project.name,
        role: invite.role as ProjectRole,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
        createdBy: invite.createdBy,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        isActive: invite.isActive
      }))

      res.json({ success: true, data: formattedInvites })
    } catch (error) {
      console.error('获取邀请码列表失败:', error)
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async revokeInvite(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId, inviteCode } = req.params

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, message: '没有权限撤销邀请码' })
      }

      const invite = await inviteService.findByCodeForRevoke(inviteCode)

      if (!invite || invite.projectId !== projectId) {
        return res.status(404).json({ success: false, message: '邀请码不存在' })
      }

      if (!invite.isActive) {
        return res.status(400).json({ success: false, message: '邀请码已失效' })
      }

      await inviteService.revoke(inviteCode)

      res.json({ success: true, message: '邀请码已撤销' })
    } catch (error) {
      console.error('撤销邀请码失败:', error)
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async getInviteHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params

      const isOwner = await projectMemberService.isOwner(projectId, req.user?.userId || '')
      if (!isOwner) {
        return res.status(403).json({ success: false, message: '没有权限查看邀请记录' })
      }

      const invites = await inviteService.findHistoryByProject(projectId)

      res.json({ success: true, data: invites })
    } catch (error) {
      console.error('获取邀请记录失败:', error)
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  }
}