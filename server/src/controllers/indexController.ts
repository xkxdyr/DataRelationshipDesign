import { Request, Response } from 'express'
import { indexService } from '../services/indexService'

// 辅助函数：解析indexes的columns字段为数组
function parseIndex(index: any): any {
  if (!index) return null
  return {
    ...index,
    columns: index.columns ? JSON.parse(index.columns) : []
  }
}

export const indexController = {
  async getAll(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const indexes = await indexService.findByTableId(tableId)
      const parsedIndexes = indexes.map(idx => parseIndex(idx))
      res.json({ success: true, data: parsedIndexes })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const index = await indexService.findById(id)
      if (!index) {
        res.status(404).json({ success: false, error: 'Index not found' })
        return
      }
      res.json({ success: true, data: parseIndex(index) })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      // 将columns数组转换为JSON字符串
      const data = {
        ...req.body,
        columns: Array.isArray(req.body.columns) ? JSON.stringify(req.body.columns) : req.body.columns
      }
      const index = await indexService.create(tableId, data)
      res.status(201).json({ success: true, data: parseIndex(index) })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      // 将columns数组转换为JSON字符串
      const data = {
        ...req.body
      }
      if (req.body.columns !== undefined) {
        data.columns = Array.isArray(req.body.columns) ? JSON.stringify(req.body.columns) : req.body.columns
      }
      const index = await indexService.update(id, data)
      res.json({ success: true, data: parseIndex(index) })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await indexService.delete(id)
      res.json({ success: true, message: 'Index deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
