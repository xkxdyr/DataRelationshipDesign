import { Request, Response } from 'express'
import { databaseSyncService, SyncConnection, TableSchema } from '../services/databaseSyncService'

export const databaseSyncController = {
  async syncToDatabase(req: Request, res: Response) {
    try {
      const { connection, tables } = req.body as { connection: SyncConnection; tables: TableSchema[] }
      
      if (!connection || !tables || tables.length === 0) {
        return res.json({ success: false, error: '请提供连接信息和表结构' })
      }
      
      const result = await databaseSyncService.syncToDatabase(connection, tables)
      
      if (result.success) {
        res.json({ success: true, data: result })
      } else {
        res.json({ success: false, error: result.message, errors: result.errors })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async dryRun(req: Request, res: Response) {
    try {
      const { connection, tables } = req.body as { connection: SyncConnection; tables: TableSchema[] }
      
      if (!connection || !tables || tables.length === 0) {
        return res.json({ success: false, error: '请提供连接信息和表结构' })
      }
      
      const result = await databaseSyncService.dryRun(connection, tables)
      
      if (result.success) {
        res.json({ success: true, data: result })
      } else {
        res.json({ success: false, error: result.message })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}