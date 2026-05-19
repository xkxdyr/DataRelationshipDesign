import { Request, Response } from 'express'
import { teamService, CreateTeamRequest, UpdateTeamRequest, AddMemberRequest, UpdateMemberRoleRequest } from '../services/teamService'
import { userService } from '../services/userService'

function getCurrentUserId(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  try {
    const token = authHeader.replace('Bearer ', '')
    const decoded = userService.verifyToken(token)
    return decoded.userId
  } catch {
    return null
  }
}

export const teamController = {
  async createTeam(req: Request, res: Response) {
    try {
      const request = req.body as CreateTeamRequest
      
      if (!request.name || !request.ownerId) {
        return res.json({ success: false, error: '请提供团队名称和所有者ID' })
      }
      
      const team = await teamService.createTeam(request)
      res.json({ success: true, data: team })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getTeamById(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const team = await teamService.getTeamById(teamId)
      
      if (team) {
        res.json({ success: true, data: team })
      } else {
        res.json({ success: false, error: '团队不存在' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getAllTeams(req: Request, res: Response) {
    try {
      const teams = await teamService.getAllTeams()
      res.json({ success: true, data: teams })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getTeamsByUserId(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const teams = await teamService.getTeamsByUserId(userId)
      res.json({ success: true, data: teams })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updateTeam(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const request = req.body as UpdateTeamRequest
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.canManageTeam(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '无权修改团队信息' })
      }
      
      const team = await teamService.updateTeam(teamId, request)
      
      if (team) {
        res.json({ success: true, data: team })
      } else {
        res.json({ success: false, error: '团队不存在' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async deleteTeam(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.isOwner(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '只有团队所有者可以删除团队' })
      }
      
      const success = await teamService.deleteTeam(teamId)
      
      if (success) {
        res.json({ success: true, message: '团队删除成功' })
      } else {
        res.json({ success: false, error: '团队不存在' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async addMember(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const request = req.body as AddMemberRequest
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.canManageMembers(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '无权添加团队成员' })
      }
      
      if (!request.userId || !request.userName) {
        return res.json({ success: false, error: '请提供用户ID和用户名' })
      }
      
      const team = await teamService.addMember(teamId, request)
      
      if (team) {
        res.json({ success: true, data: team })
      } else {
        res.json({ success: false, error: '团队不存在' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async removeMember(req: Request, res: Response) {
    try {
      const { teamId, userId } = req.params
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.canManageMembers(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '无权移除团队成员' })
      }
      
      const team = await teamService.removeMember(teamId, userId)
      
      if (team) {
        res.json({ success: true, data: team })
      } else {
        res.json({ success: false, error: '团队不存在或无法移除所有者' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updateMemberRole(req: Request, res: Response) {
    try {
      const { teamId, userId } = req.params
      const request = req.body as UpdateMemberRoleRequest
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.canManageMembers(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '无权修改成员角色' })
      }
      
      if (!request.role) {
        return res.json({ success: false, error: '请提供角色' })
      }
      
      const team = await teamService.updateMemberRole(teamId, userId, request)
      
      if (team) {
        res.json({ success: true, data: team })
      } else {
        res.json({ success: false, error: '团队不存在' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async isMember(req: Request, res: Response) {
    try {
      const { teamId, userId } = req.params
      const isMember = await teamService.isMember(teamId, userId)
      res.json({ success: true, data: { isMember } })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async isAdmin(req: Request, res: Response) {
    try {
      const { teamId, userId } = req.params
      const isAdmin = await teamService.isAdmin(teamId, userId)
      res.json({ success: true, data: { isAdmin } })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async addProjectToTeam(req: Request, res: Response) {
    try {
      const { teamId, projectId } = req.params
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.canManageProjects(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '无权管理团队项目' })
      }
      
      await teamService.addProjectToTeam(teamId, projectId)
      res.json({ success: true, message: '项目已添加到团队' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async removeProjectFromTeam(req: Request, res: Response) {
    try {
      const { teamId, projectId } = req.params
      const currentUserId = getCurrentUserId(req)
      
      if (!currentUserId) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      if (!await teamService.canManageProjects(teamId, currentUserId)) {
        return res.status(403).json({ success: false, error: '无权管理团队项目' })
      }
      
      await teamService.removeProjectFromTeam(teamId, projectId)
      res.json({ success: true, message: '项目已从团队移除' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getTeamProjects(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const projects = await teamService.getTeamProjects(teamId)
      res.json({ success: true, data: projects })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}