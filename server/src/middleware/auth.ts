import { Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService'
import { sessionService } from '../services/sessionService'

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    username: string
  }
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ success: false, error: '未提供认证信息' })
    }

    const token = authHeader.replace('Bearer ', '')

    const decoded = userService.verifyToken(token)

    const session = await sessionService.getSessionByToken(token)

    if (!session) {
      return res.status(401).json({ success: false, error: '会话已失效，请重新登录' })
    }

    await sessionService.updateLastActive(token)

    req.user = decoded
    next()
  } catch (error) {
    console.error('[AuthMiddleware] 认证失败:', error)
    return res.status(401).json({ success: false, error: '无效的认证信息' })
  }
}

export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const decoded = userService.verifyToken(token)
      req.user = decoded
    }
    next()
  } catch (error) {
    next()
  }
}
