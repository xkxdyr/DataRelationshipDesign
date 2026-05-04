import { Request, Response } from 'express'
import { projectService } from '../services/projectService'

export const projectController = {
  async getAll(req: Request, res: Response) {
    try {
      const projects = await projectService.findAll()
      res.json({ success: true, data: projects })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const project = await projectService.findById(id)
      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' })
        return
      }
      res.json({ success: true, data: project })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, description, databaseType, createdBy } = req.body
      const project = await projectService.create({ name, description, databaseType, createdBy })
      res.status(201).json({ success: true, data: project })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, description, databaseType, status } = req.body
      const project = await projectService.update(id, { name, description, databaseType, status })
      res.json({ success: true, data: project })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await projectService.delete(id)
      res.json({ success: true, message: 'Project deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async duplicate(req: Request, res: Response) {
    try {
      const { id } = req.params
      const project = await projectService.duplicate(id)
      res.status(201).json({ success: true, data: project })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
