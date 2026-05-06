import { Request, Response } from 'express'
import { teamService, CreateTeamRequest, UpdateTeamRequest, AddMemberRequest, UpdateMemberRoleRequest } from '../services/teamService'

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
  }
}