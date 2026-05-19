import { Request, Response } from 'express'
import { sqliteReaderService } from '../services/sqliteReaderService'
import * as path from 'path'
import * as fs from 'fs'

const TMP_DIR = path.join(process.cwd(), 'tmp')

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
}

export const sqliteReaderController = {
  async readFromUpload(req: Request, res: Response) {
    try {
      const file = req.file
      if (!file) {
        res.status(400).json({ success: false, error: '未上传文件' })
        return
      }

      if (!file.originalname.endsWith('.db') && !file.originalname.endsWith('.sqlite') && !file.originalname.endsWith('.sqlite3')) {
        fs.unlinkSync(file.path)
        res.status(400).json({ success: false, error: '仅支持 .db / .sqlite / .sqlite3 文件' })
        return
      }

      const result = sqliteReaderService.readFromFile(file.path)

      try { fs.unlinkSync(file.path) } catch { /* ignore */ }

      if (result.success) {
        res.json({ success: true, data: result })
      } else {
        res.status(400).json({ success: false, error: result.message })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async readFromPath(req: Request, res: Response) {
    try {
      const { filePath } = req.body
      if (!filePath) {
        res.status(400).json({ success: false, error: '未提供文件路径' })
        return
      }

      const result = sqliteReaderService.readFromFile(filePath)

      if (result.success) {
        res.json({ success: true, data: result })
      } else {
        res.status(400).json({ success: false, error: result.message })
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}