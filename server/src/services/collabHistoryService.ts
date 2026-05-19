import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface OperationRecord {
  id: string
  projectId: string
  userId: string
  userName: string
  operationType: OperationType
  targetType: TargetType
  targetId: string
  targetName: string
  changes?: Record<string, any>
  timestamp: Date
}

export type OperationType = 'create' | 'update' | 'delete' | 'sync' | 'join' | 'leave'
export type TargetType = 'table' | 'column' | 'relationship' | 'index' | 'project' | 'user'

export interface CreateOperationRequest {
  projectId: string
  userId: string
  userName: string
  operationType: OperationType
  targetType: TargetType
  targetId: string
  targetName: string
  changes?: Record<string, any>
}

const SIX_MONTHS_IN_MS = 180 * 24 * 60 * 60 * 1000

export interface HistoryReminder {
  projectId: string
  projectName: string
  oldestRecordDate: Date
  recordCount: number
  daysSinceOldest: number
  shouldRemind: boolean
}

class CollabHistoryService {
  private maxHistorySize = 1000

  async recordOperation(request: CreateOperationRequest): Promise<OperationRecord | null> {
    try {
      const record = await prisma.operationRecord.create({
        data: {
          projectId: request.projectId,
          userId: request.userId,
          userName: request.userName,
          operationType: request.operationType,
          targetType: request.targetType,
          targetId: request.targetId,
          targetName: request.targetName,
          changes: request.changes ? JSON.stringify(request.changes) : null
        }
      })

      await this.trimHistory(request.projectId)

      return {
        id: record.id,
        projectId: record.projectId,
        userId: record.userId,
        userName: record.userName,
        operationType: record.operationType as OperationType,
        targetType: record.targetType as TargetType,
        targetId: record.targetId,
        targetName: record.targetName,
        changes: record.changes ? JSON.parse(record.changes) : undefined,
        timestamp: record.timestamp
      }
    } catch (error) {
      console.error('记录操作失败:', error)
      return null
    }
  }

  async getProjectHistory(projectId: string, limit: number = 100): Promise<OperationRecord[]> {
    try {
      const records = await prisma.operationRecord.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
        take: limit
      })

      return records.map(record => ({
        id: record.id,
        projectId: record.projectId,
        userId: record.userId,
        userName: record.userName,
        operationType: record.operationType as OperationType,
        targetType: record.targetType as TargetType,
        targetId: record.targetId,
        targetName: record.targetName,
        changes: record.changes ? JSON.parse(record.changes) : undefined,
        timestamp: record.timestamp
      }))
    } catch (error) {
      console.error('获取操作历史失败:', error)
      return []
    }
  }

  async getUserHistory(projectId: string, userId: string, limit: number = 50): Promise<OperationRecord[]> {
    try {
      const records = await prisma.operationRecord.findMany({
        where: { projectId, userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      })

      return records.map(record => ({
        id: record.id,
        projectId: record.projectId,
        userId: record.userId,
        userName: record.userName,
        operationType: record.operationType as OperationType,
        targetType: record.targetType as TargetType,
        targetId: record.targetId,
        targetName: record.targetName,
        changes: record.changes ? JSON.parse(record.changes) : undefined,
        timestamp: record.timestamp
      }))
    } catch (error) {
      console.error('获取用户操作历史失败:', error)
      return []
    }
  }

  async getRecentActivity(projectId: string, minutes: number = 60): Promise<OperationRecord[]> {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)

      const records = await prisma.operationRecord.findMany({
        where: {
          projectId,
          timestamp: { gte: cutoffTime }
        },
        orderBy: { timestamp: 'desc' }
      })

      return records.map(record => ({
        id: record.id,
        projectId: record.projectId,
        userId: record.userId,
        userName: record.userName,
        operationType: record.operationType as OperationType,
        targetType: record.targetType as TargetType,
        targetId: record.targetId,
        targetName: record.targetName,
        changes: record.changes ? JSON.parse(record.changes) : undefined,
        timestamp: record.timestamp
      }))
    } catch (error) {
      console.error('获取最近活动失败:', error)
      return []
    }
  }

  async clearProjectHistory(projectId: string): Promise<boolean> {
    try {
      await prisma.operationRecord.deleteMany({
        where: { projectId }
      })
      return true
    } catch (error) {
      console.error('清除操作历史失败:', error)
      return false
    }
  }

  async getUserActivityCount(projectId: string, userId: string): Promise<number> {
    try {
      return await prisma.operationRecord.count({
        where: { projectId, userId }
      })
    } catch (error) {
      console.error('统计用户活动失败:', error)
      return 0
    }
  }

  private async trimHistory(projectId: string): Promise<void> {
    try {
      const count = await prisma.operationRecord.count({
        where: { projectId }
      })

      if (count > this.maxHistorySize) {
        const records = await prisma.operationRecord.findMany({
          where: { projectId },
          orderBy: { timestamp: 'asc' },
          take: count - this.maxHistorySize
        })

        const idsToDelete = records.map(r => r.id)
        await prisma.operationRecord.deleteMany({
          where: { id: { in: idsToDelete } }
        })
      }
    } catch (error) {
      console.error('清理历史记录失败:', error)
    }
  }

  async getOperationStats(projectId: string): Promise<{
    totalOperations: number
    operationsByType: Record<string, number>
    activeUsers: string[]
    recentUsers: string[]
  }> {
    try {
      const totalOperations = await prisma.operationRecord.count({
        where: { projectId }
      })

      const typeStats = await prisma.operationRecord.groupBy({
        by: ['operationType'],
        where: { projectId },
        _count: { operationType: true }
      })

      const operationsByType: Record<string, number> = {}
      typeStats.forEach(stat => {
        operationsByType[stat.operationType] = stat._count.operationType
      })

      const activeUsers = await prisma.operationRecord.findMany({
        where: { projectId },
        distinct: ['userId'],
        select: { userId: true, userName: true }
      })

      const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentUsers = await prisma.operationRecord.findMany({
        where: { projectId, timestamp: { gte: recentCutoff } },
        distinct: ['userId'],
        select: { userId: true, userName: true }
      })

      return {
        totalOperations,
        operationsByType,
        activeUsers: activeUsers.map(u => u.userId),
        recentUsers: recentUsers.map(u => u.userId)
      }
    } catch (error) {
      console.error('获取操作统计失败:', error)
      return {
        totalOperations: 0,
        operationsByType: {},
        activeUsers: [],
        recentUsers: []
      }
    }
  }

  async getHistoryReminder(projectId: string): Promise<HistoryReminder | null> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true }
      })

      if (!project) {
        return null
      }

      const oldestRecord = await prisma.operationRecord.findFirst({
        where: { projectId },
        orderBy: { timestamp: 'asc' }
      })

      const recordCount = await prisma.operationRecord.count({
        where: { projectId }
      })

      if (!oldestRecord || recordCount === 0) {
        return {
          projectId,
          projectName: project.name,
          oldestRecordDate: new Date(),
          recordCount: 0,
          daysSinceOldest: 0,
          shouldRemind: false
        }
      }

      const now = Date.now()
      const oldestDate = oldestRecord.timestamp.getTime()
      const daysSinceOldest = Math.floor((now - oldestDate) / (24 * 60 * 60 * 1000))
      const shouldRemind = daysSinceOldest >= 180

      return {
        projectId,
        projectName: project.name,
        oldestRecordDate: oldestRecord.timestamp,
        recordCount,
        daysSinceOldest,
        shouldRemind
      }
    } catch (error) {
      console.error('获取历史提醒失败:', error)
      return null
    }
  }

  async getUserHistoryReminders(userId: string): Promise<HistoryReminder[]> {
    try {
      const userProjects = await prisma.project.findMany({
        where: {
          OR: [
            { createdBy: userId },
            { projectMembers: { some: { userId } } }
          ]
        },
        select: { id: true, name: true }
      })

      const reminders: HistoryReminder[] = []

      for (const project of userProjects) {
        const reminder = await this.getHistoryReminder(project.id)
        if (reminder && reminder.shouldRemind) {
          reminders.push(reminder)
        }
      }

      return reminders
    } catch (error) {
      console.error('获取用户历史提醒失败:', error)
      return []
    }
  }
}

export const collabHistoryService = new CollabHistoryService()