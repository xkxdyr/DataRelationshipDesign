import { Request, Response } from 'express'
import { gitConfigService } from '../services/gitConfigService'

export const gitConfigController = {
  async get(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const config = await gitConfigService.get(projectId)
      res.json({ success: true, data: config })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async upsert(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const config = await gitConfigService.upsert(projectId, req.body)
      res.json({ success: true, data: config })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const result = await gitConfigService.remove(projectId)
      res.json({ success: true, ...result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}