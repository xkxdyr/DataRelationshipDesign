import { Request, Response } from 'express'
import { columnService } from '../services/columnService'

export const columnController = {
  async getAll(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const columns = await columnService.findByTableId(tableId)
      res.json({ success: true, data: columns })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const column = await columnService.findById(id)
      if (!column) {
        res.status(404).json({ success: false, error: 'Column not found' })
        return
      }
      res.json({ success: true, data: column })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const column = await columnService.create(tableId, req.body)
      res.status(201).json({ success: true, data: column })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const column = await columnService.update(id, req.body)
      res.json({ success: true, data: column })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updateOrder(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const { columnOrders } = req.body
      const columns = await columnService.updateOrder(tableId, columnOrders)
      res.json({ success: true, data: columns })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await columnService.delete(id)
      res.json({ success: true, message: 'Column deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async bulkCreate(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const { columns } = req.body
      const created = await columnService.bulkCreate(tableId, columns)
      res.status(201).json({ success: true, data: created })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
