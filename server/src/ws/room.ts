import { WebSocket } from 'ws'
import { CollabMessage, UserInfo, getUserColor, LockInfo, LockRequestData } from './protocol'
import { CRDTDocumentManager, crdtFactory } from './crdt'
import { lockService } from './lockService'

export interface RoomClient {
  ws: WebSocket
  userId: string
  userName: string
  projectId: string
}

export class CollabRoom {
  private clients: Map<string, RoomClient> = new Map()
  private projectId: string
  private crdtManager: CRDTDocumentManager

  constructor(projectId: string) {
    this.projectId = projectId
    this.crdtManager = crdtFactory.getManager(projectId)
  }

  addClient(client: RoomClient) {
    this.clients.set(client.userId, client)
    this.broadcastUserList()
    // 发送当前锁状态给新加入的用户
    this.sendLockState(client.userId)
  }

  removeClient(userId: string) {
    // 释放用户所有锁
    lockService.releaseUserLocks(this.projectId, userId)
    this.clients.delete(userId)
    this.broadcastUserList()
    // 广播锁状态更新
    this.broadcastLockState()

    // 如果房间为空，清理 CRDT 文档管理器
    if (this.getClientCount() === 0) {
      crdtFactory.removeManager(this.projectId)
    }
  }

  getClient(userId: string): RoomClient | undefined {
    return this.clients.get(userId)
  }

  getClientCount(): number {
    return this.clients.size
  }

  getUserName(userId: string): string | undefined {
    const client = this.clients.get(userId)
    return client?.userName
  }

  getUsers(): UserInfo[] {
    return Array.from(this.clients.values()).map(client => ({
      id: client.userId,
      name: client.userName,
      color: getUserColor(client.userId)
    }))
  }

  // 获取 CRDT 文档管理器
  getCRDTManager(): CRDTDocumentManager {
    return this.crdtManager
  }

  broadcast(message: CollabMessage, excludeUserId?: string) {
    for (const [userId, client] of this.clients) {
      if (excludeUserId && userId === excludeUserId) continue
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message))
      }
    }
  }

  // 广播二进制消息（用于 CRDT 更新）
  broadcastBinary(data: Uint8Array, excludeUserId?: string) {
    for (const [userId, client] of this.clients) {
      if (excludeUserId && userId === excludeUserId) continue
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data)
      }
    }
  }

  // 发送消息给指定用户
  sendToUser(userId: string, message: CollabMessage) {
    const client = this.clients.get(userId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message))
    }
  }

  // 发送二进制消息给指定用户
  sendBinaryToUser(userId: string, data: Uint8Array) {
    const client = this.clients.get(userId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data)
    }
  }

  private broadcastUserList() {
    const message: CollabMessage = {
      type: 'user:list' as any,
      projectId: this.projectId,
      userId: 'system',
      data: this.getUsers(),
      timestamp: Date.now()
    }
    this.broadcast(message)
  }

  // 处理锁获取请求
  handleLockAcquire(userId: string, data: LockRequestData) {
    const client = this.getClient(userId)
    if (!client) return

    const result = lockService.acquireLock(
      this.projectId,
      data.lockType,
      data.tableId,
      userId,
      client.userName,
      data.columnId
    )

    if (result.success && result.lockInfo) {
      // 发送 LOCK_GRANTED 给请求者
      this.sendToUser(userId, {
        type: 'lock:granted' as any,
        projectId: this.projectId,
        userId,
        data: result.lockInfo,
        timestamp: Date.now()
      })

      // 广播锁状态更新给所有用户
      this.broadcastLockState()
    } else {
      // 发送 LOCK_DENIED 给请求者
      this.sendToUser(userId, {
        type: 'lock:denied' as any,
        projectId: this.projectId,
        userId,
        data: {
          reason: result.reason,
          existingLock: result.existingLock
        },
        timestamp: Date.now()
      })
    }
  }

  // 处理锁释放请求
  handleLockRelease(userId: string, data: LockRequestData) {
    const success = lockService.releaseLock(
      this.projectId,
      data.lockType,
      data.tableId,
      userId,
      data.columnId
    )

    if (success) {
      console.warn(`[CollabRoom] 锁已释放`)
      this.broadcastLockState()
    }
  }

  // 发送锁状态给指定用户
  private sendLockState(userId: string) {
    const locks = lockService.getProjectLocksInfo(this.projectId)
    this.sendToUser(userId, {
      type: 'lock:state' as any,
      projectId: this.projectId,
      userId: 'system',
      data: locks,
      timestamp: Date.now()
    })
  }

  // 广播锁状态给所有用户
  broadcastLockState() {
    const locks = lockService.getProjectLocksInfo(this.projectId)
    this.broadcast({
      type: 'lock:state' as any,
      projectId: this.projectId,
      userId: 'system',
      data: locks,
      timestamp: Date.now()
    })
  }

  // 获取表锁信息
  getTableLocks(tableId: string): LockInfo[] {
    return lockService.getTableLocksInfo(this.projectId, tableId)
  }

  // 检查是否被锁
  isLocked(lockType: 'table' | 'column', tableId: string, userId: string, columnId?: string): LockInfo | null {
    return lockService.isLocked(this.projectId, lockType, tableId, userId, columnId)
  }
}
