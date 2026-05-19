import { Request, Response } from 'express'
import { updateLogService } from '../services/updateLogService'

export const updateLogController = {
  async getLogs(req: Request, res: Response) {
    try {
      const logs = updateLogService.getLogs()
      res.json({ success: true, data: logs })
    } catch (error) {
      console.error('读取更新日志失败:', error)
      res.status(500).json({ success: false, error: '读取更新日志失败' })
    }
  },

  async addLog(req: Request, res: Response) {
    try {
      const { type, description, operator } = req.body
      updateLogService.addLog(type, description, operator)
      res.json({ success: true, message: '日志添加成功' })
    } catch (error) {
      console.error('写入更新日志失败:', error)
      res.status(500).json({ success: false, error: '写入更新日志失败' })
    }
  }
}