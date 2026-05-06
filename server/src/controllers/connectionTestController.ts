import { Request, Response } from 'express'
import { connectionTestService } from '../services/connectionTestService'

export const connectionTestController = {
  async testConnection(req: Request, res: Response) {
    try {
      const { databaseType, host, port, databaseName, username, password, sslEnabled } = req.body
      const result = await connectionTestService.testConnection({
        databaseType,
        host,
        port,
        databaseName,
        username,
        password,
        sslEnabled
      })
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}