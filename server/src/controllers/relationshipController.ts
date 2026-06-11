import { Request, Response } from 'express'
import { relationshipService } from '../services/relationshipService'
import { projectMemberService } from '../services/projectMemberService'
import { AuthenticatedRequest } from '../middleware/auth'

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

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const relationship = await relationshipService.findById(id)
      if (!relationship) {
        res.status(404).json({ success: false, error: 'Relationship not found' })
        return
      }
      // 权限检查：查看关系需要 view 权限
      const userId = req.user?.userId || ''
      const canView = await projectMemberService.canView(relationship.projectId, userId)
      if (!canView) {
        console.warn(`[RelationshipCtrl] getById 拦截: 无查看权限 | relId=${id} | userId=${userId} | projectId=${relationship.projectId}`)
        res.status(403).json({ success: false, error: '没有查看权限' })
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

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const relationship = await relationshipService.findById(id)
      if (!relationship) {
        res.status(404).json({ success: false, error: 'Relationship not found' })
        return
      }
      // 权限检查：编辑关系需要 edit 权限
      const userId = req.user?.userId || ''
      const canEdit = await projectMemberService.canEdit(relationship.projectId, userId)
      if (!canEdit) {
        console.warn(`[RelationshipCtrl] update 拦截: 无编辑权限 | relId=${id} | userId=${userId} | projectId=${relationship.projectId}`)
        res.status(403).json({ success: false, error: '没有编辑权限' })
        return
      }
      const updated = await relationshipService.update(id, req.body)
      res.json({ success: true, data: updated })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const relationship = await relationshipService.findById(id)
      if (!relationship) {
        res.status(404).json({ success: false, error: 'Relationship not found' })
        return
      }
      // 权限检查：删除关系需要 edit 权限
      const userId = req.user?.userId || ''
      const canEdit = await projectMemberService.canEdit(relationship.projectId, userId)
      if (!canEdit) {
        console.warn(`[RelationshipCtrl] delete 拦截: 无编辑权限 | relId=${id} | userId=${userId} | projectId=${relationship.projectId}`)
        res.status(403).json({ success: false, error: '没有编辑权限' })
        return
      }
      await relationshipService.delete(id)
      res.json({ success: true, message: 'Relationship deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
