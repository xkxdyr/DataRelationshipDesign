import { Request, Response } from 'express'
import { sessionService, UpdateSessionSettingsRequest } from '../services/sessionService'
import { AuthenticatedRequest } from '../middleware/auth'

export const sessionController = {
  async getActiveSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await sessionService.getActiveSessions(req.user?.userId || '')
      res.json({ success: true, data: sessions })
    } catch (error) {
      console.error('获取活跃会话失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getAllSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await sessionService.getAllSessions(req.user?.userId || '')
      res.json({ success: true, data: sessions })
    } catch (error) {
      console.error('获取所有会话失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getSessionSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const settings = await sessionService.getSessionSettings(req.user?.userId || '')
      res.json({ success: true, data: settings })
    } catch (error) {
      console.error('获取会话设置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updateSessionSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const request = req.body as UpdateSessionSettingsRequest

      if (!request.maxActiveSessions || request.maxActiveSessions < 1) {
        return res.json({ success: false, error: '最大登录设备数必须大于0' })
      }

      const success = await sessionService.updateSessionSettings(req.user?.userId || '', request)
      res.json({ success, message: success ? '设置已更新' : '更新失败' })
    } catch (error) {
      console.error('更新会话设置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async invalidateSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { sessionId } = req.params

      const success = await sessionService.invalidateSession(sessionId, req.user?.userId || '')
      res.json({ success, message: success ? '会话已失效' : '失效失败' })
    } catch (error) {
      console.error('失效会话失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async invalidateOtherSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const { keepSessionId } = req.body

      const success = await sessionService.invalidateOtherSessions(req.user?.userId || '', keepSessionId)
      res.json({ success, message: success ? '其他会话已失效' : '操作失败' })
    } catch (error) {
      console.error('失效其他会话失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async invalidateAllSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const success = await sessionService.invalidateAllSessions(req.user?.userId || '')
      res.json({ success, message: success ? '所有会话已失效' : '操作失败' })
    } catch (error) {
      console.error('失效所有会话失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}