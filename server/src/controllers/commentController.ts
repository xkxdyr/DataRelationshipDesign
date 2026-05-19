import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { commentService } from '../services/commentService'

export const commentController = {
  async getByTableId(req: AuthenticatedRequest, res: Response) {
    try {
      const { tableId } = req.params
      const comments = await commentService.findByTableId(tableId)
      res.json({ success: true, data: comments })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async countByTableId(req: AuthenticatedRequest, res: Response) {
    try {
      const { tableId } = req.params
      const count = await commentService.countByTableId(tableId)
      res.json({ success: true, data: { count } })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const comment = await commentService.findById(id)
      if (!comment) {
        res.status(404).json({ success: false, error: 'Comment not found' })
        return
      }
      res.json({ success: true, data: comment })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { tableId } = req.params
      const { projectId, content, parentId } = req.body
      const user = req.user!

      const comment = await commentService.create({
        projectId,
        tableId,
        userId: user.userId,
        userName: user.username,
        content,
        parentId
      })
      res.status(201).json({ success: true, data: comment })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { content, status } = req.body
      const comment = await commentService.update(id, { content, status })
      res.json({ success: true, data: comment })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      await commentService.delete(id)
      res.json({ success: true, message: 'Comment deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}