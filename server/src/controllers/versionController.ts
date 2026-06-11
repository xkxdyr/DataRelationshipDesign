import { Request, Response } from 'express'
import { versionService } from '../services/versionService'
import { projectMemberService } from '../services/projectMemberService'
import { AuthenticatedRequest } from '../middleware/auth'

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

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const version = await versionService.findById(id)
      if (!version) {
        res.status(404).json({ success: false, error: 'Version not found' })
        return
      }
      // 权限检查：查看版本需要 view 权限
      const userId = req.user?.userId || ''
      const canView = await projectMemberService.canView(version.projectId, userId)
      if (!canView) {
        console.warn(`[VersionCtrl] getById 拦截: 无查看权限 | versionId=${id} | userId=${userId} | projectId=${version.projectId}`)
        res.status(403).json({ success: false, error: '没有查看权限' })
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

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const version = await versionService.findById(id)
      if (!version) {
        res.status(404).json({ success: false, error: 'Version not found' })
        return
      }
      // 权限检查：编辑版本需要 edit 权限
      const userId = req.user?.userId || ''
      const canEdit = await projectMemberService.canEdit(version.projectId, userId)
      if (!canEdit) {
        console.warn(`[VersionCtrl] update 拦截: 无编辑权限 | versionId=${id} | userId=${userId} | projectId=${version.projectId}`)
        res.status(403).json({ success: false, error: '没有编辑权限' })
        return
      }
      const updated = await versionService.update(id, req.body)
      res.json({ success: true, data: updated })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const version = await versionService.findById(id)
      if (!version) {
        res.status(404).json({ success: false, error: 'Version not found' })
        return
      }
      // 权限检查：删除版本需要 manage 权限
      const userId = req.user?.userId || ''
      const canManage = await projectMemberService.canManage(version.projectId, userId)
      if (!canManage) {
        console.warn(`[VersionCtrl] delete 拦截: 无管理权限 | versionId=${id} | userId=${userId} | projectId=${version.projectId}`)
        res.status(403).json({ success: false, error: '没有管理权限' })
        return
      }
      await versionService.delete(id)
      res.json({ success: true, message: 'Version deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async compare(req: AuthenticatedRequest, res: Response) {
    try {
      const { versionId1, versionId2 } = req.params
      const version1 = await versionService.findById(versionId1)
      if (!version1) {
        res.status(404).json({ success: false, error: 'Version 1 not found' })
        return
      }
      // 权限检查：对比版本需要 view 权限
      const userId = req.user?.userId || ''
      const canView = await projectMemberService.canView(version1.projectId, userId)
      if (!canView) {
        console.warn(`[VersionCtrl] compare 拦截: 无查看权限 | versionId1=${versionId1} | userId=${userId} | projectId=${version1.projectId}`)
        res.status(403).json({ success: false, error: '没有查看权限' })
        return
      }
      const result = await versionService.compare(versionId1, versionId2)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
