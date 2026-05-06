import { Request, Response } from 'express'
import { connectionService } from '../services/connectionService'

export const connectionController = {
  async getAll(req: Request, res: Response) {
    try {
      const connections = await connectionService.findAll()
      res.json({ success: true, data: connections })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const connection = await connectionService.findById(id)
      if (!connection) {
        res.status(404).json({ success: false, error: 'Connection not found' })
        return
      }
      res.json({ success: true, data: connection })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, databaseType, host, port, databaseName, username, password, sslEnabled, description } = req.body
      const connection = await connectionService.create({
        name,
        databaseType,
        host,
        port,
        databaseName,
        username,
        password,
        sslEnabled,
        description
      })
      res.status(201).json({ success: true, data: connection })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, databaseType, host, port, databaseName, username, password, sslEnabled, description } = req.body
      const connection = await connectionService.update(id, {
        name,
        databaseType,
        host,
        port,
        databaseName,
        username,
        password,
        sslEnabled,
        description
      })
      if (!connection) {
        res.status(404).json({ success: false, error: 'Connection not found' })
        return
      }
      res.json({ success: true, data: connection })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const success = await connectionService.delete(id)
      if (!success) {
        res.status(404).json({ success: false, error: 'Connection not found' })
        return
      }
      res.json({ success: true, message: 'Connection deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}