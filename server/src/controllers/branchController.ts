import { Request, Response } from 'express'
import { branchService } from '../services/branchService'

export const branchController = {
  async getByProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const branches = await branchService.findByProject(projectId)
      res.json({ success: true, data: branches })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const branch = await branchService.findById(id)
      if (!branch) {
        res.status(404).json({ success: false, error: '分支不存在' })
        return
      }
      res.json({ success: true, data: branch })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { name, description, parentId } = req.body

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, error: '分支名称不能为空' })
        return
      }

      const branch = await branchService.create(projectId, { name: name.trim(), description, parentId })
      res.status(201).json({ success: true, data: branch })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, description, isActive } = req.body
      const branch = await branchService.update(id, { name, description, isActive })
      res.json({ success: true, data: branch })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const { id } = req.params
      await branchService.remove(id)
      res.json({ success: true, message: '分支已删除' })
    } catch (error) {
      const message = (error as Error).message
      if (message.includes('默认分支') || message.includes('子分支') || message.includes('不存在')) {
        res.status(400).json({ success: false, error: message })
        return
      }
      res.status(500).json({ success: false, error: message })
    }
  },

  async setDefault(req: Request, res: Response) {
    try {
      const { id } = req.params
      const branch = await branchService.setDefault(id)
      res.json({ success: true, data: branch })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async switchBranch(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { projectId } = req.body
      if (!projectId) {
        res.status(400).json({ success: false, error: '缺少 projectId' })
        return
      }
      const branch = await branchService.switchBranch(projectId, id)
      res.json({ success: true, data: branch })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getDefault(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const branch = await branchService.getDefaultBranch(projectId)
      res.json({ success: true, data: branch })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}