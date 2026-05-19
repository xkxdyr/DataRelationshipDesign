import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface SessionInfo {
  id: string
  userId: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  loginTime: Date
  lastActiveAt: Date
  isActive: boolean
}

export interface UpdateSessionSettingsRequest {
  maxActiveSessions: number
}

export const sessionService = {
  async createSession(userId: string, token: string, ipAddress?: string, userAgent?: string): Promise<SessionInfo | null> {
    try {
      const settings = await prisma.userSettings.findUnique({ where: { userId } })
      const maxSessions = settings?.maxActiveSessions || 1

      const activeSessions = await prisma.userSession.count({
        where: { userId, isActive: true }
      })

      if (activeSessions >= maxSessions) {
        const oldestSession = await prisma.userSession.findFirst({
          where: { userId, isActive: true },
          orderBy: { loginTime: 'asc' }
        })

        if (oldestSession) {
          await prisma.userSession.update({
            where: { id: oldestSession.id },
            data: { isActive: false }
          })
        }
      }

      const deviceName = this.parseDeviceName(userAgent)

      const session = await prisma.userSession.create({
        data: {
          userId,
          token,
          deviceName,
          ipAddress,
          userAgent,
          loginTime: new Date(),
          lastActiveAt: new Date(),
          isActive: true
        }
      })

      return {
        id: session.id,
        userId: session.userId,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        loginTime: session.loginTime,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      return null
    }
  },

  async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: { userId, isActive: true },
        orderBy: { loginTime: 'desc' }
      })

      return sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        loginTime: session.loginTime,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive
      }))
    } catch (error) {
      console.error('获取活跃会话失败:', error)
      return []
    }
  },

  async getAllSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: { userId },
        orderBy: { loginTime: 'desc' }
      })

      return sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        loginTime: session.loginTime,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive
      }))
    } catch (error) {
      console.error('获取所有会话失败:', error)
      return []
    }
  },

  async invalidateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { id: sessionId }
      })

      if (!session || session.userId !== userId) {
        return false
      }

      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      })

      return true
    } catch (error) {
      console.error('失效会话失败:', error)
      return false
    }
  },

  async invalidateOtherSessions(userId: string, keepSessionId: string): Promise<boolean> {
    try {
      await prisma.userSession.updateMany({
        where: { userId, isActive: true, id: { not: keepSessionId } },
        data: { isActive: false }
      })

      return true
    } catch (error) {
      console.error('失效其他会话失败:', error)
      return false
    }
  },

  async invalidateAllSessions(userId: string): Promise<boolean> {
    try {
      await prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      })

      return true
    } catch (error) {
      console.error('失效所有会话失败:', error)
      return false
    }
  },

  async updateLastActive(token: string): Promise<boolean> {
    try {
      const result = await prisma.userSession.updateMany({
        where: { token, isActive: true },
        data: { lastActiveAt: new Date() }
      })

      return result.count > 0
    } catch (error) {
      console.error('更新最后活跃时间失败:', error)
      return false
    }
  },

  async getSessionByToken(token: string): Promise<SessionInfo | null> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { token, isActive: true }
      })

      if (!session) return null

      return {
        id: session.id,
        userId: session.userId,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        loginTime: session.loginTime,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive
      }
    } catch (error) {
      console.error('获取会话失败:', error)
      return null
    }
  },

  async getSessionSettings(userId: string): Promise<{ maxActiveSessions: number }> {
    try {
      const settings = await prisma.userSettings.findUnique({ where: { userId } })

      if (!settings) {
        const newSettings = await prisma.userSettings.create({
          data: { userId, maxActiveSessions: 1 }
        })
        return { maxActiveSessions: newSettings.maxActiveSessions }
      }

      return { maxActiveSessions: settings.maxActiveSessions }
    } catch (error) {
      console.error('获取会话设置失败:', error)
      return { maxActiveSessions: 1 }
    }
  },

  async updateSessionSettings(userId: string, request: UpdateSessionSettingsRequest): Promise<boolean> {
    try {
      await prisma.userSettings.upsert({
        where: { userId },
        update: { maxActiveSessions: request.maxActiveSessions },
        create: { userId, maxActiveSessions: request.maxActiveSessions }
      })

      const maxSessions = request.maxActiveSessions
      const activeSessions = await prisma.userSession.count({
        where: { userId, isActive: true }
      })

      if (activeSessions > maxSessions) {
        const sessionsToInvalidate = await prisma.userSession.findMany({
          where: { userId, isActive: true },
          orderBy: { loginTime: 'asc' },
          take: activeSessions - maxSessions
        })

        const idsToInvalidate = sessionsToInvalidate.map(s => s.id)
        await prisma.userSession.updateMany({
          where: { id: { in: idsToInvalidate } },
          data: { isActive: false }
        })
      }

      return true
    } catch (error) {
      console.error('更新会话设置失败:', error)
      return false
    }
  },

  parseDeviceName(userAgent?: string): string | null {
    if (!userAgent) return null

    if (userAgent.includes('Mobile') || userAgent.includes('Android') && userAgent.includes('Mobile')) {
      return '移动设备'
    } else if (userAgent.includes('iPad')) {
      return 'iPad'
    } else if (userAgent.includes('iPhone')) {
      return 'iPhone'
    } else if (userAgent.includes('Windows')) {
      return 'Windows 桌面'
    } else if (userAgent.includes('Mac OS')) {
      return 'Mac 桌面'
    } else if (userAgent.includes('Linux')) {
      return 'Linux 桌面'
    } else {
      return '未知设备'
    }
  }
}