import { LockInfo, LockType } from './protocol'

// 锁超时时间：5分钟（300秒）
const LOCK_TIMEOUT_MS = 5 * 60 * 1000
// 清理间隔：1分钟
const CLEANUP_INTERVAL_MS = 60 * 1000

export interface AcquireLockResult {
  success: boolean
  lockInfo?: LockInfo
  existingLock?: LockInfo
  reason?: string
}

class LockService {
  // 锁映射表：projectId -> Map<lockId, LockInfo>
  private projectLocks: Map<string, Map<string, LockInfo>> = new Map()
  // 锁用户映射：projectId -> Map<userId, Set<lockId>>
  private userLocks: Map<string, Map<string, Set<string>>> = new Map()
  // 锁表映射：projectId -> Map<tableId, Set<lockId>>
  private tableLocks: Map<string, Map<string, Set<string>>> = new Map()
  // 清理定时器
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupTimer()
  }

  // 生成锁ID
  private generateLockId(lockType: LockType, tableId: string, columnId?: string): string {
    if (lockType === 'column' && columnId) {
      return `column:${columnId}`
    }
    return `table:${tableId}`
  }

  // 获取项目锁映射
  private getProjectLocks(projectId: string): Map<string, LockInfo> {
    let locks = this.projectLocks.get(projectId)
    if (!locks) {
      locks = new Map()
      this.projectLocks.set(projectId, locks)
    }
    return locks
  }

  // 获取用户锁映射
  private getUserLocks(projectId: string): Map<string, Set<string>> {
    let locks = this.userLocks.get(projectId)
    if (!locks) {
      locks = new Map()
      this.userLocks.set(projectId, locks)
    }
    return locks
  }

  // 获取表锁映射
  private getTableLocks(projectId: string): Map<string, Set<string>> {
    let locks = this.tableLocks.get(projectId)
    if (!locks) {
      locks = new Map()
      this.tableLocks.set(projectId, locks)
    }
    return locks
  }

  // 检查是否存在表锁冲突
  private hasTableLockConflict(
    projectId: string,
    tableId: string,
    excludeUserId: string
  ): LockInfo | null {
    const locks = this.getProjectLocks(projectId)
    
    for (const lock of locks.values()) {
      // 跳过当前用户的锁
      if (lock.userId === excludeUserId) continue
      // 检查是否过期
      if (lock.expiresAt < Date.now()) continue
      // 检查是否是同一表的锁（表锁或字段锁）
      if (lock.tableId === tableId) {
        return lock
      }
    }
    return null
  }

  // 检查是否存在字段锁冲突
  private hasColumnLockConflict(
    projectId: string,
    tableId: string,
    columnId: string,
    excludeUserId: string
  ): LockInfo | null {
    const locks = this.getProjectLocks(projectId)
    const lockId = this.generateLockId('column', tableId, columnId)
    
    const lock = locks.get(lockId)
    if (lock && lock.userId !== excludeUserId && lock.expiresAt > Date.now()) {
      return lock
    }
    return null
  }

  // 尝试获取锁
  acquireLock(
    projectId: string,
    lockType: LockType,
    tableId: string,
    userId: string,
    userName: string,
    columnId?: string
  ): AcquireLockResult {
    const now = Date.now()
    const lockId = this.generateLockId(lockType, tableId, columnId)
    const projectLocks = this.getProjectLocks(projectId)

    // 检查是否已持有该锁
    const existingLock = projectLocks.get(lockId)
    if (existingLock && existingLock.userId === userId) {
      // 更新过期时间
      existingLock.expiresAt = now + LOCK_TIMEOUT_MS
      return { success: true, lockInfo: existingLock }
    }

    // 检查冲突
    if (lockType === 'table') {
      // 表级锁：检查同一表的所有锁
      const conflict = this.hasTableLockConflict(projectId, tableId, userId)
      if (conflict) {
        return {
          success: false,
          existingLock: conflict,
          reason: `${conflict.userName} 正在编辑该表`
        }
      }
    } else if (lockType === 'column') {
      // 字段级锁：检查表锁冲突
      const tableConflict = this.hasTableLockConflict(projectId, tableId, userId)
      if (tableConflict && tableConflict.lockType === 'table') {
        return {
          success: false,
          existingLock: tableConflict,
          reason: `${tableConflict.userName} 正在编辑该表`
        }
      }
      // 检查字段锁冲突
      const columnConflict = this.hasColumnLockConflict(projectId, tableId, columnId!, userId)
      if (columnConflict) {
        return {
          success: false,
          existingLock: columnConflict,
          reason: `${columnConflict.userName} 正在编辑该字段`
        }
      }
    }

    // 创建新锁
    const lockInfo: LockInfo = {
      lockType,
      lockId,
      userId,
      userName,
      tableId,
      columnId,
      acquiredAt: now,
      expiresAt: now + LOCK_TIMEOUT_MS
    }

    // 存储锁信息
    projectLocks.set(lockId, lockInfo)

    // 更新用户锁映射
    const userLocks = this.getUserLocks(projectId)
    let userLockSet = userLocks.get(userId)
    if (!userLockSet) {
      userLockSet = new Set()
      userLocks.set(userId, userLockSet)
    }
    userLockSet.add(lockId)

    // 更新表锁映射
    const tableLocks = this.getTableLocks(projectId)
    let tableLockSet = tableLocks.get(tableId)
    if (!tableLockSet) {
      tableLockSet = new Set()
      tableLocks.set(tableId, tableLockSet)
    }
    tableLockSet.add(lockId)

    console.log(`[LockService] 锁获取成功: project=${projectId}, type=${lockType}, table=${tableId}, column=${columnId || '-'}, user=${userName}`)

    return { success: true, lockInfo }
  }

  // 释放锁
  releaseLock(
    projectId: string,
    lockType: LockType,
    tableId: string,
    userId: string,
    columnId?: string
  ): boolean {
    const lockId = this.generateLockId(lockType, tableId, columnId)
    const projectLocks = this.getProjectLocks(projectId)

    const lock = projectLocks.get(lockId)
    if (!lock) return true // 锁不存在，视为已释放

    // 只能释放自己的锁
    if (lock.userId !== userId) {
      console.warn(`[LockService] 尝试释放他人的锁: lockId=${lockId}, owner=${lock.userId}, requester=${userId}`)
      return false
    }

    // 移除锁
    projectLocks.delete(lockId)

    // 从用户锁映射移除
    const userLocks = this.getUserLocks(projectId)
    const userLockSet = userLocks.get(userId)
    if (userLockSet) {
      userLockSet.delete(lockId)
      if (userLockSet.size === 0) {
        userLocks.delete(userId)
      }
    }

    // 从表锁映射移除
    const tableLocks = this.getTableLocks(projectId)
    const tableLockSet = tableLocks.get(tableId)
    if (tableLockSet) {
      tableLockSet.delete(lockId)
      if (tableLockSet.size === 0) {
        tableLocks.delete(tableId)
      }
    }

    console.log(`[LockService] 锁释放成功: project=${projectId}, type=${lockType}, table=${tableId}, user=${userId}`)

    return true
  }

  // 释放用户所有锁
  releaseUserLocks(projectId: string, userId: string): void {
    const projectLocks = this.getProjectLocks(projectId)
    const userLocks = this.getUserLocks(projectId)
    const tableLocks = this.getTableLocks(projectId)

    const userLockSet = userLocks.get(userId)
    if (!userLockSet || userLockSet.size === 0) return

    const locksToRelease = Array.from(userLockSet)
    
    for (const lockId of locksToRelease) {
      const lock = projectLocks.get(lockId)
      if (lock) {
        // 移除锁
        projectLocks.delete(lockId)

        // 从表锁映射移除
        const tableLockSet = tableLocks.get(lock.tableId)
        if (tableLockSet) {
          tableLockSet.delete(lockId)
          if (tableLockSet.size === 0) {
            tableLocks.delete(lock.tableId)
          }
        }
      }
    }

    // 清空用户锁
    userLocks.delete(userId)

    console.log(`[LockService] 释放用户 ${userId} 所有锁: ${locksToRelease.length} 个`)
  }

  // 续租锁（更新过期时间）
  renewLock(
    projectId: string,
    lockType: LockType,
    tableId: string,
    userId: string,
    columnId?: string
  ): boolean {
    const lockId = this.generateLockId(lockType, tableId, columnId)
    const projectLocks = this.getProjectLocks(projectId)

    const lock = projectLocks.get(lockId)
    if (!lock || lock.userId !== userId) {
      return false
    }

    lock.expiresAt = Date.now() + LOCK_TIMEOUT_MS
    return true
  }

  // 获取项目所有锁
  getProjectLocksInfo(projectId: string): LockInfo[] {
    const projectLocks = this.getProjectLocks(projectId)
    const now = Date.now()

    return Array.from(projectLocks.values()).filter(lock => lock.expiresAt > now)
  }

  // 获取表锁
  getTableLocksInfo(projectId: string, tableId: string): LockInfo[] {
    const tableLocks = this.getTableLocks(projectId)
    const tableLockSet = tableLocks.get(tableId)
    if (!tableLockSet) return []

    const projectLocks = this.getProjectLocks(projectId)
    const now = Date.now()

    return Array.from(tableLockSet)
      .map(lockId => projectLocks.get(lockId))
      .filter((lock): lock is LockInfo => lock !== undefined && lock.expiresAt > now)
  }

  // 检查是否被锁
  isLocked(
    projectId: string,
    lockType: LockType,
    tableId: string,
    userId: string,
    columnId?: string
  ): LockInfo | null {
    const lockId = this.generateLockId(lockType, tableId, columnId)
    const projectLocks = this.getProjectLocks(projectId)

    const lock = projectLocks.get(lockId)
    if (lock && lock.userId !== userId && lock.expiresAt > Date.now()) {
      return lock
    }
    return null
  }

  // 清理过期锁
  private cleanupExpiredLocks(): void {
    const now = Date.now()

    for (const [projectId, projectLocks] of this.projectLocks) {
      const locksToRemove: string[] = []

      for (const [lockId, lock] of projectLocks) {
        if (lock.expiresAt < now) {
          locksToRemove.push(lockId)
        }
      }

      if (locksToRemove.length > 0) {
        console.log(`[LockService] 清理 ${projectId} 的过期锁: ${locksToRemove.length} 个`)

        const userLocks = this.getUserLocks(projectId)
        const tableLocks = this.getTableLocks(projectId)

        for (const lockId of locksToRemove) {
          const lock = projectLocks.get(lockId)
          if (lock) {
            // 从用户锁映射移除
            const userLockSet = userLocks.get(lock.userId)
            if (userLockSet) {
              userLockSet.delete(lockId)
              if (userLockSet.size === 0) {
                userLocks.delete(lock.userId)
              }
            }

            // 从表锁映射移除
            const tableLockSet = tableLocks.get(lock.tableId)
            if (tableLockSet) {
              tableLockSet.delete(lockId)
              if (tableLockSet.size === 0) {
                tableLocks.delete(lock.tableId)
              }
            }

            // 移除锁
            projectLocks.delete(lockId)
          }
        }
      }

      // 清理空的项目
      if (projectLocks.size === 0) {
        this.projectLocks.delete(projectId)
        this.userLocks.delete(projectId)
        this.tableLocks.delete(projectId)
      }
    }
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredLocks()
    }, CLEANUP_INTERVAL_MS)
  }

  // 停止清理定时器
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  // 清理项目锁（项目关闭时调用）
  clearProjectLocks(projectId: string): void {
    this.projectLocks.delete(projectId)
    this.userLocks.delete(projectId)
    this.tableLocks.delete(projectId)
    console.log(`[LockService] 清理项目 ${projectId} 所有锁`)
  }
}

export const lockService = new LockService()
