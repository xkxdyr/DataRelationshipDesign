import { Request, Response } from 'express'
import { projectService } from '../services/projectService'
import { teamService } from '../services/teamService'
import { AuthenticatedRequest } from '../middleware/auth'

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
      const parsedProject = {
        ...project,
        tables: (project.tables || []).map((table: any) => ({
          ...table,
          indexes: (table.indexes || []).map((idx: any) => ({
            ...idx,
            columns: idx.columns ? JSON.parse(idx.columns) : []
          }))
        }))
      }
      res.json({ success: true, data: parsedProject })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description, databaseType } = req.body
      const createdBy = req.user?.userId || ''
      const project = await projectService.create({ name, description, databaseType, createdBy })
      res.status(201).json({ success: true, data: project })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, description, databaseType, status, collaborationEnabled } = req.body
      const project = await projectService.update(id, { name, description, databaseType, status, collaborationEnabled })
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
  },

  async toggleCollaboration(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params
      const { enabled } = req.body

      const userId = req.user?.userId || ''

      const project = await projectService.findWithMembers(projectId)

      if (!project) {
        return res.status(404).json({ success: false, message: '项目不存在' })
      }

      const isProjectOwner = project.createdBy === userId
      const isMemberOwner = project.projectMembers.some(
        m => m.userId === userId && m.role === 'owner'
      )

      if (!isProjectOwner && !isMemberOwner) {
        return res.status(403).json({ success: false, message: '只有项目所有者可以切换协作模式' })
      }

      const updatedProject = await projectService.update(projectId, { collaborationEnabled: enabled })

      res.json({
        success: true,
        message: enabled ? '协作模式已开启' : '协作模式已关闭',
        data: { collaborationEnabled: updatedProject.collaborationEnabled }
      })
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async getCollaborationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params

      const project = await projectService.getCollaborationStatus(projectId)

      if (!project) {
        return res.status(404).json({ success: false, message: '项目不存在' })
      }

      res.json({
        success: true,
        data: { collaborationEnabled: project.collaborationEnabled }
      })
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message })
    }
  },

  async convertToTeamProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params
      const { targetTeamId } = req.body
      const userId = req.user?.userId || ''

      if (!targetTeamId) {
        return res.status(400).json({ success: false, message: '请选择目标团队' })
      }

      const result = await teamService.convertPersonalToTeamProject(
        projectId,
        targetTeamId,
        userId
      )

      if (result.success) {
        res.json({
          success: true,
          message: `项目已成功转换为团队项目，归属团队: ${result.data?.teamName}`,
          data: result.data
        })
      } else {
        res.status(400).json({ success: false, message: result.error || '转换失败' })
      }
    } catch (error) {
      console.error('转换项目类型失败:', error)
      res.status(500).json({ success: false, message: '转换失败: ' + (error as Error).message })
    }
  }
}