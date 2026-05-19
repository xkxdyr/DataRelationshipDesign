import { Request, Response } from 'express'
import { userService, RegisterRequest, LoginRequest } from '../services/userService'
import { projectMemberService } from '../services/projectMemberService'

export const userController = {
  async register(req: Request, res: Response) {
    try {
      const request = req.body as RegisterRequest
      
      if (!request.username || !request.email || !request.password) {
        return res.json({ success: false, error: '请提供用户名、邮箱和密码' })
      }
      
      const result = await userService.register(request)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async login(req: Request, res: Response) {
    try {
      const request = req.body as LoginRequest
      
      if (!request.username || !request.password) {
        return res.json({ success: false, error: '请提供用户名和密码' })
      }

      const ipAddress = req.ip || req.connection.remoteAddress || (req.headers['x-forwarded-for'] as string)?.split(',')[0]
      const userAgent = req.headers['user-agent']
      
      const result = await userService.login(request, ipAddress, userAgent)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getCurrentUser(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      const token = authHeader.replace('Bearer ', '')
      const decoded = userService.verifyToken(token)
      
      const user = await userService.getUserById(decoded.userId)
      res.json({ success: true, data: user })
    } catch (error) {
      res.status(401).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const user = await userService.getUserById(userId)
      
      res.json({ success: true, data: user })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserByUsername(req: Request, res: Response) {
    try {
      const { username } = req.params
      const user = await userService.getUserByUsername(username)
      
      if (user) {
        res.json({ success: true, data: user })
      } else {
        res.json({ success: false, error: '用户不存在' })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async searchUsers(req: Request, res: Response) {
    try {
      const { query } = req.query
      if (!query || typeof query !== 'string') {
        return res.json({ success: false, error: '请提供搜索关键词' })
      }
      
      const users = await userService.searchUsers(query)
      res.json({ success: true, data: users })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserProjects(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ success: false, error: '未提供认证信息' })
      }
      
      const token = authHeader.replace('Bearer ', '')
      const decoded = userService.verifyToken(token)
      const userId = decoded.userId
      
      const userProjects = await projectMemberService.getUserProjects(userId)
      res.json({ success: true, data: userProjects })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
