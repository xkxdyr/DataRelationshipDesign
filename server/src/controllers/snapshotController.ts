import { Request, Response } from 'express'
import { crdtFactory } from '../ws/crdt'
import { snapshotService } from '../services/snapshotService'

export const snapshotController = {
  async createSnapshot(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { name, comment } = req.body

      if (!name) {
        return res.json({ success: false, error: '请提供快照名称' })
      }

      const manager = crdtFactory.getManager(projectId)
      if (!manager) {
        return res.json({ success: false, error: '项目没有活跃的协作会话' })
      }

      const jsonState = manager.toJSON()
      const version = await snapshotService.create(projectId, name, comment || '', JSON.stringify(jsonState))

      res.json({ success: true, data: version })
    } catch (error) {
      console.error('创建快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async listSnapshots(req: Request, res: Response) {
    try {
      const { projectId } = req.params

      const versions = await snapshotService.listByProject(projectId)

      res.json({ success: true, data: versions })
    } catch (error) {
      console.error('获取快照列表失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getSnapshot(req: Request, res: Response) {
    try {
      const { projectId, versionId } = req.params

      const version = await snapshotService.findById(projectId, versionId)

      if (!version) {
        return res.json({ success: false, error: '快照不存在' })
      }

      res.json({ success: true, data: version })
    } catch (error) {
      console.error('获取快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async restoreSnapshot(req: Request, res: Response) {
    try {
      const { projectId, versionId } = req.params

      const version = await snapshotService.findById(projectId, versionId)

      if (!version) {
        return res.json({ success: false, error: '快照不存在' })
      }

      const manager = crdtFactory.getManager(projectId)
      if (!manager) {
        return res.json({ success: false, error: '项目没有活跃的协作会话' })
      }

      const data = JSON.parse(version.data)
      manager.fromJSON(data)

      res.json({ success: true, message: '快照恢复成功' })
    } catch (error) {
      console.error('恢复快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async deleteSnapshot(req: Request, res: Response) {
    try {
      const { projectId, versionId } = req.params

      await snapshotService.delete(versionId)

      res.json({ success: true, message: '快照删除成功' })
    } catch (error) {
      console.error('删除快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}