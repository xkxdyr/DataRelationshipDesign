import { Request, Response } from 'express'
import { relationshipService } from '../services/relationshipService'

export const relationshipController = {
  async getAll(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const relationships = await relationshipService.findByProjectId(projectId)
      res.json({ success: true, data: relationships })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const relationship = await relationshipService.findById(id)
      if (!relationship) {
        res.status(404).json({ success: false, error: 'Relationship not found' })
        return
      }
      res.json({ success: true, data: relationship })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const relationship = await relationshipService.create(projectId, req.body)
      res.status(201).json({ success: true, data: relationship })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const relationship = await relationshipService.update(id, req.body)
      res.json({ success: true, data: relationship })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await relationshipService.delete(id)
      res.json({ success: true, message: 'Relationship deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
