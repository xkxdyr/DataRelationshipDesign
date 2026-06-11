import { Request, Response } from 'express'
import { collabHistoryService, CreateOperationRequest } from '../services/collabHistoryService'

// 将记录转换为 CSV 格式
function recordsToCSV(records: any[]): string {
  if (records.length === 0) {
    return 'id,projectId,userId,userName,operationType,targetType,targetId,targetName,description,timestamp\n'
  }

  const headers = [
    'id', 'projectId', 'userId', 'userName',
    'operationType', 'targetType', 'targetId',
    'targetName', 'description', 'timestamp'
  ]

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [headers.join(',')]

  for (const record of records) {
    const line = headers.map(h => {
      if (h === 'timestamp' && record.timestamp) {
        return escapeCSV(new Date(record.timestamp).toISOString())
      }
      return escapeCSV(record[h])
    }).join(',')
    lines.push(line)
  }

  return lines.join('\n')
}

// 将记录转换为 JSON 格式
function recordsToJSON(records: any[]): string {
  return JSON.stringify({
    total: records.length,
    exportTime: new Date().toISOString(),
    records: records.map(r => ({
      id: r.id,
      projectId: r.projectId,
      userId: r.userId,
      userName: r.userName,
      operationType: r.operationType,
      targetType: r.targetType,
      targetId: r.targetId,
      targetName: r.targetName,
      description: r.description,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : null
    }))
  }, null, 2)
}

export const historyController = {
  async recordOperation(req: Request, res: Response) {
    try {
      const request = req.body as CreateOperationRequest

      if (!request.projectId || !request.userId || !request.operationType || !request.targetType) {
        return res.json({ success: false, error: '缺少必要参数' })
      }

      const record = await collabHistoryService.recordOperation(request)

      if (record) {
        res.json({ success: true, data: record })
      } else {
        res.json({ success: false, error: '记录失败' })
      }
    } catch (error) {
      console.error('记录操作失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getProjectHistory(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const limit = parseInt(req.query.limit as string) || 100

      const history = await collabHistoryService.getProjectHistory(projectId, limit)
      res.json({ success: true, data: history })
    } catch (error) {
      console.error('获取项目历史失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserHistory(req: Request, res: Response) {
    try {
      const { projectId, userId } = req.params
      const limit = parseInt(req.query.limit as string) || 50

      const history = await collabHistoryService.getUserHistory(projectId, userId, limit)
      res.json({ success: true, data: history })
    } catch (error) {
      console.error('获取用户历史失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getRecentActivity(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const minutes = parseInt(req.query.minutes as string) || 60

      const activity = await collabHistoryService.getRecentActivity(projectId, minutes)
      res.json({ success: true, data: activity })
    } catch (error) {
      console.error('获取最近活动失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getOperationStats(req: Request, res: Response) {
    try {
      const { projectId } = req.params

      const stats = await collabHistoryService.getOperationStats(projectId)
      res.json({ success: true, data: stats })
    } catch (error) {
      console.error('获取操作统计失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async clearProjectHistory(req: Request, res: Response) {
    try {
      const { projectId } = req.params

      const success = await collabHistoryService.clearProjectHistory(projectId)
      res.json({ success, message: success ? '历史记录已清除' : '清除失败' })
    } catch (error) {
      console.error('清除历史记录失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserActivityCount(req: Request, res: Response) {
    try {
      const { projectId, userId } = req.params

      const count = await collabHistoryService.getUserActivityCount(projectId, userId)
      res.json({ success: true, data: { count } })
    } catch (error) {
      console.error('获取用户活动计数失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async exportProjectHistory(req: Request, res: Response) {
    try {
      const { projectId, format } = req.params
      const limit = parseInt(req.query.limit as string) || 1000

      // 验证格式
      const validFormats = ['json', 'csv']
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: '不支持的导出格式，请使用 json 或 csv'
        })
      }

      const history = await collabHistoryService.getProjectHistory(projectId, limit)

      if (format === 'json') {
        const jsonContent = recordsToJSON(history)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="history_${projectId}_${Date.now()}.json"`
        )
        res.send(jsonContent)
      } else {
        const csvContent = recordsToCSV(history)
        // 添加 BOM 确保 Excel 正确识别中文
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="history_${projectId}_${Date.now()}.csv"`
        )
        res.send('\uFEFF' + csvContent)
      }
    } catch (error) {
      console.error('导出历史记录失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async exportUserHistory(req: Request, res: Response) {
    try {
      const { projectId, userId, format } = req.params
      const limit = parseInt(req.query.limit as string) || 1000

      // 验证格式
      const validFormats = ['json', 'csv']
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: '不支持的导出格式，请使用 json 或 csv'
        })
      }

      const history = await collabHistoryService.getUserHistory(projectId, userId, limit)

      if (format === 'json') {
        const jsonContent = recordsToJSON(history)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="history_${projectId}_user_${userId}_${Date.now()}.json"`
        )
        res.send(jsonContent)
      } else {
        const csvContent = recordsToCSV(history)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="history_${projectId}_user_${userId}_${Date.now()}.csv"`
        )
        res.send('\uFEFF' + csvContent)
      }
    } catch (error) {
      console.error('导出用户历史记录失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getProjectHistoryReminder(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const reminder = await collabHistoryService.getHistoryReminder(projectId)
      
      if (reminder) {
        res.json({ success: true, data: reminder })
      } else {
        res.json({ success: false, error: '项目不存在' })
      }
    } catch (error) {
      console.error('获取历史提醒失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getUserHistoryReminders(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const reminders = await collabHistoryService.getUserHistoryReminders(userId)
      res.json({ success: true, data: reminders })
    } catch (error) {
      console.error('获取用户历史提醒失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async importProjectHistory(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { records } = req.body
      if (!Array.isArray(records)) {
        res.status(400).json({ success: false, error: '无效的导入数据' })
        return
      }

      const imported = await collabHistoryService.importOperations(projectId, records)
      res.json({ success: true, data: { imported } })
    } catch (error) {
      console.error('导入操作日志失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}