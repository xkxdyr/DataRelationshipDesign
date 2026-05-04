import { Request, Response } from 'express'
import { tableService } from '../services/tableService'

export const tableController = {
  async getAll(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const tables = await tableService.findByProjectId(projectId)
      res.json({ success: true, data: tables })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const table = await tableService.findById(id)
      if (!table) {
        res.status(404).json({ success: false, error: 'Table not found' })
        return
      }
      res.json({ success: true, data: table })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { name, comment, positionX, positionY } = req.body
      const table = await tableService.create(projectId, { name, comment, positionX, positionY })
      res.status(201).json({ success: true, data: table })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, comment, positionX, positionY } = req.body
      const table = await tableService.update(id, { name, comment, positionX, positionY })
      res.json({ success: true, data: table })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updatePosition(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { positionX, positionY } = req.body
      const table = await tableService.updatePosition(id, positionX, positionY)
      res.json({ success: true, data: table })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await tableService.delete(id)
      res.json({ success: true, message: 'Table deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
