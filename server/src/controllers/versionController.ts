import { Request, Response } from 'express'
import { versionService } from '../services/versionService'

export const versionController = {
  async getAll(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const versions = await versionService.findByProjectId(projectId)
      res.json({ success: true, data: versions })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const version = await versionService.findById(id)
      if (!version) {
        res.status(404).json({ success: false, error: 'Version not found' })
        return
      }
      res.json({ success: true, data: version })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const version = await versionService.create(projectId, req.body)
      res.status(201).json({ success: true, data: version })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const version = await versionService.update(id, req.body)
      res.json({ success: true, data: version })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await versionService.delete(id)
      res.json({ success: true, message: 'Version deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
