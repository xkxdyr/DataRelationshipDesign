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
    console.log('[AuthMiddleware] 收到请求:', req.method, req.path)
    const authHeader = req.headers.authorization
    console.log('[AuthMiddleware] Authorization header:', authHeader ? '存在' : '不存在')
    
    if (!authHeader) {
      return res.status(401).json({ success: false, error: '未提供认证信息' })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('[AuthMiddleware] Token:', token ? '存在' : '不存在')
    
    const decoded = userService.verifyToken(token)
    console.log('[AuthMiddleware] Token解码成功:', decoded)

    const session = await sessionService.getSessionByToken(token)
    console.log('[AuthMiddleware] 会话:', session ? '存在' : '不存在')
    
    if (!session) {
      return res.status(401).json({ success: false, error: '会话已失效，请重新登录' })
    }

    await sessionService.updateLastActive(token)
    console.log('[AuthMiddleware] 最后活跃时间更新成功')
    
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
