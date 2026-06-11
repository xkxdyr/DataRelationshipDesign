import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { crdtFactory } from '../ws/crdt'
import { snapshotService } from '../services/snapshotService'
import { CollabWebSocketServer } from '../ws/server'

const prisma = new PrismaClient()

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
      const userId = (req as any).user?.userId || 'unknown'

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

      // 恢复 CRDT 文档后，同步更新数据库
      const crdtData = manager.toJSON() as any
      if (crdtData && crdtData.tables) {
        // 删除现有数据
        await prisma.index.deleteMany({ where: { table: { projectId } } })
        await prisma.column.deleteMany({ where: { table: { projectId } } })
        await prisma.relationship.deleteMany({ where: { projectId } })
        await prisma.table.deleteMany({ where: { projectId } })

        // 从 CRDT 数据重建
        const tables = crdtData.tables as Record<string, any>
        for (const [, tableData] of Object.entries(tables)) {
          await prisma.table.create({
            data: {
              id: tableData.id,
              name: tableData.name,
              comment: tableData.comment || null,
              projectId,
              positionX: tableData.positionX || 0,
              positionY: tableData.positionY || 0,
              columns: {
                create: Object.values(crdtData.columns || {})
                  .filter((col: any) => col.tableId === tableData.id)
                  .map((col: any) => ({
                    id: col.id,
                    name: col.name,
                    dataType: col.type || col.dataType || 'VARCHAR',
                    nullable: col.isNotNull ? false : (col.nullable ?? true),
                    primaryKey: col.isPrimaryKey ?? false,
                    unique: col.isUnique ?? false,
                    autoIncrement: col.isAutoIncrement ?? false,
                    comment: col.comment || null,
                    order: col.order ?? 0,
                    defaultValue: col.defaultValue || null,
                    length: col.length || null,
                    precision: col.precision || null,
                    scale: col.scale || null
                  }))
              }
            }
          })
        }

        // 重建关系
        const relationships = crdtData.relationships as Record<string, any>
        if (relationships) {
          for (const [, relData] of Object.entries(relationships)) {
            await prisma.relationship.create({
              data: {
                id: relData.id,
                projectId,
                sourceTableId: relData.sourceTableId,
                sourceColumnId: relData.sourceColumnId,
                targetTableId: relData.targetTableId,
                targetColumnId: relData.targetColumnId,
                relationshipType: relData.relationshipType || 'ONE_TO_MANY',
                onUpdate: relData.onUpdate || 'NO ACTION',
                onDelete: relData.onDelete || 'NO ACTION'
              }
            })
          }
        }

        // 重建索引
        const indexes = crdtData.indexes as Record<string, any>
        if (indexes) {
          for (const [, idxData] of Object.entries(indexes)) {
            await prisma.index.create({
              data: {
                id: idxData.id,
                tableId: idxData.tableId,
                name: idxData.name,
                columns: JSON.stringify(idxData.columns || []),
                unique: idxData.isUnique ?? false,
                type: idxData.indexType || idxData.type || 'BTREE'
              }
            })
          }
        }
      }

      // 通过 WebSocket 广播回滚通知
      const wsServer = CollabWebSocketServer.getInstance()
      if (wsServer) {
        const room = wsServer.getRoom(projectId)
        if (room) {
          room.broadcast({
            type: 'snapshot_restored' as any,
            projectId,
            userId: 'system',
            data: {
              projectId,
              snapshotId: versionId,
              restoredBy: userId
            },
            timestamp: Date.now()
          })
        }
      }

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