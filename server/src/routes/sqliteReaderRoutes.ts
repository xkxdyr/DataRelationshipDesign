import { Router } from 'express'
import multer from 'multer'
import * as path from 'path'
import { sqliteReaderController } from '../controllers/sqliteReaderController'

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'tmp'),
  filename: (req, file, cb) => {
    const uniqueName = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.db', '.sqlite', '.sqlite3'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 SQLite 数据库文件 (.db/.sqlite/.sqlite3)'))
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }
})

const router = Router()

router.post('/read', upload.single('file'), sqliteReaderController.readFromUpload)
router.post('/read-path', sqliteReaderController.readFromPath)

export default router