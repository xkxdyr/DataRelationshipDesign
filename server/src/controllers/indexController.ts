import { Request, Response } from 'express'
import { indexService } from '../services/indexService'

export const indexController = {
  async getAll(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const indexes = await indexService.findByTableId(tableId)
      res.json({ success: true, data: indexes })
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
      res.json({ success: true, data: index })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const index = await indexService.create(tableId, req.body)
      res.status(201).json({ success: true, data: index })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const index = await indexService.update(id, req.body)
      res.json({ success: true, data: index })
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
