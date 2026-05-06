import { Request, Response } from 'express'
import { reverseEngineeringService } from '../services/reverseEngineeringService'

export const reverseEngineeringController = {
  async importFromDatabase(req: Request, res: Response) {
    try {
      const { databaseType, host, port, databaseName, username, password, sslEnabled, tables } = req.body
      const result = await reverseEngineeringService.importFromDatabase({
        databaseType,
        host,
        port,
        databaseName,
        username,
        password,
        sslEnabled,
        tables
      })
      
      if (result.success) {
        res.json({ success: true, data: { message: result.message, tables: result.tables } })
      } else {
        res.json({ success: false, message: result.message })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getTableList(req: Request, res: Response) {
    try {
      const { databaseType, host, port, databaseName, username, password, sslEnabled } = req.body
      
      const result = await reverseEngineeringService.importFromDatabase({
        databaseType,
        host,
        port,
        databaseName,
        username,
        password,
        sslEnabled,
        tables: []
      })
      
      if (result.success && result.tables) {
        const tableNames = result.tables.map(t => t.name)
        res.json({ success: true, data: tableNames })
      } else {
        res.json({ success: false, error: result.message })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}