import { pack, unpack } from 'msgpackr'
import pako from 'pako'

export enum MessageType {
  USER_JOIN = 'user:join',
  USER_LEAVE = 'user:leave',
  USER_LIST = 'user:list',
  OP_CREATE = 'op:create',
  OP_UPDATE = 'op:update',
  OP_DELETE = 'op:delete',
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response',
  PING = 'system:ping',
  PONG = 'system:pong',
  ERROR = 'system:error',

  // 锁相关
  LOCK_ACQUIRE = 'lock:acquire',
  LOCK_RELEASE = 'lock:release',
  LOCK_GRANTED = 'lock:granted',
  LOCK_DENIED = 'lock:denied',
  LOCK_STATE = 'lock:state',
  LOCK_TIMEOUT = 'lock:timeout',
}

// 锁类型
export type LockType = 'table' | 'column'

// 锁信息
export interface LockInfo {
  lockType: LockType
  lockId: string
  userId: string
  userName: string
  tableId: string
  columnId?: string
  acquiredAt: number
  expiresAt: number
}

// 锁请求数据
export interface LockRequestData {
  lockType: LockType
  tableId: string
  columnId?: string
}

// 锁被拒绝数据
export interface LockDeniedData {
  reason: string
  existingLock: LockInfo
}

export interface CollabMessage {
  type: MessageType
  projectId: string
  userId: string
  data?: any
  timestamp: number
}

export interface UserInfo {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
}

// 消息压缩阈值（1KB）
const MESSAGE_COMPRESSION_THRESHOLD = 1024

// 连接状态
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

type MessageHandler = (message: CollabMessage) => void
type BinaryMessageHandler = (data: Uint8Array, message: CollabMessage) => void
type ConnectionHandler = (state: ConnectionState) => void

export class CollabService {
  private ws: WebSocket | null = null
  private projectId: string | null = null
  private userId: string | null = null
  private userName: string = '用户'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private baseReconnectDelay = 1000 // 1秒基础延迟
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map()
  private binaryHandlers: BinaryMessageHandler[] = []
  private connectionHandlers: ConnectionHandler[] = []
  private isManualClose = false
  private pingInterval: number | null = null
  private heartbeatInterval: number | null = null
  private heartbeatTimeout: number | null = null
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED

  constructor() {
    // 生成临时用户 ID
    this.userId = 'user_' + Math.random().toString(36).substring(2)
  }

  // 获取当前连接状态
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  // 通知连接状态变化
  private notifyConnectionState(state: ConnectionState) {
    this.connectionState = state
    this.connectionHandlers.forEach(handler => handler(state))
  }

  // 注册连接状态处理器
  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler)
  }

  // 移除连接状态处理器
  offConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler)
  }

  connect(projectId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.projectId = projectId
      this.userName = userName
      this.isManualClose = false
      this.notifyConnectionState(ConnectionState.CONNECTING)

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname
      const port = 3001
      const wsUrl = `${protocol}//${host}:${port}/ws/collab?projectId=${projectId}&userId=${this.userId}&userName=${encodeURIComponent(userName)}`

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.notifyConnectionState(ConnectionState.CONNECTED)
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            // 检查是否是二进制消息
            if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
              this.handleBinaryMessage(event.data)
            } else {
              const message: CollabMessage = JSON.parse(event.data)
              // 处理 pong 消息 - 清除心跳超时
              if (message.type === MessageType.PONG) {
                if (this.heartbeatTimeout) {
                  clearTimeout(this.heartbeatTimeout)
                  this.heartbeatTimeout = null
                }
              }
              this.handleMessage(message)
            }
          } catch (err) {
            console.error('消息解析失败:', err)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.warn('协作服务连接关闭')
          this.stopHeartbeat()
          this.notifyConnectionState(ConnectionState.DISCONNECTED)
          if (!this.isManualClose) {
            this.tryReconnect()
          }
        }
      } catch (err) {
        this.notifyConnectionState(ConnectionState.DISCONNECTED)
        reject(err)
      }
    })
  }

  disconnect() {
    this.isManualClose = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.notifyConnectionState(ConnectionState.DISCONNECTED)
  }

  send(message: Omit<CollabMessage, 'userId' | 'timestamp'>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket 未连接')
      return
    }

    const fullMessage: CollabMessage = {
      ...message,
      userId: this.userId!,
      timestamp: Date.now()
    }

    this.ws.send(JSON.stringify(fullMessage))
  }

  // 发送二进制消息（用于 CRDT 更新）
  sendBinary(type: MessageType, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket 未连接')
      return
    }

    const message = {
      type,
      projectId: this.projectId!,
      userId: this.userId!,
      data,
      timestamp: Date.now()
    }

    const binaryData = pack(message)

    // 如果数据过大，先压缩
    if (binaryData.length > MESSAGE_COMPRESSION_THRESHOLD) {
      this.compressAndSend(binaryData)
    } else {
      this.ws.send(binaryData)
    }
  }

  // 压缩并发送数据
  private compressAndSend(data: Uint8Array) {
    try {
      // 使用 pako 进行 gzip 压缩
      const compressed = pako.gzip(data)
      this.ws?.send(compressed)
    } catch (err) {
      console.warn('压缩失败，发送未压缩数据:', err)
      this.ws?.send(data)
    }
  }

  // 解压缩数据
  private decompressData(data: Uint8Array): Uint8Array {
    // 检查是否是 gzip 压缩数据（magic number 0x1f 0x8b）
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
      try {
        return pako.ungzip(data)
      } catch (err) {
        console.warn('解压缩失败，使用原始数据:', err)
      }
    }
    return data
  }

  on(type: MessageType, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)!.push(handler)
  }

  off(type: MessageType, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      this.messageHandlers.set(type, handlers.filter(h => h !== handler))
    }
  }

  // 注册二进制消息处理器
  onBinary(handler: BinaryMessageHandler) {
    this.binaryHandlers.push(handler)
  }

  // 移除二进制消息处理器
  offBinary(handler: BinaryMessageHandler) {
    this.binaryHandlers = this.binaryHandlers.filter(h => h !== handler)
  }

  getUserId(): string {
    return this.userId!
  }

  // ================== 锁相关方法 ==================

  // 请求获取锁
  acquireLock(lockType: LockType, tableId: string, columnId?: string): void {
    if (!this.projectId) return

    const data: LockRequestData = {
      lockType,
      tableId,
      columnId
    }

    this.send({
      type: MessageType.LOCK_ACQUIRE,
      projectId: this.projectId,
      data
    })
  }

  // 释放锁
  releaseLock(lockType: LockType, tableId: string, columnId?: string): void {
    if (!this.projectId) return

    const data: LockRequestData = {
      lockType,
      tableId,
      columnId
    }

    this.send({
      type: MessageType.LOCK_RELEASE,
      projectId: this.projectId,
      data
    })
  }

  // 锁回调
  private lockGrantedCallback: ((lock: LockInfo) => void) | null = null
  private lockDeniedCallback: ((data: LockDeniedData) => void) | null = null
  private lockStateCallback: ((locks: LockInfo[]) => void) | null = null

  onLockGranted(callback: (lock: LockInfo) => void) {
    this.lockGrantedCallback = callback
  }

  onLockDenied(callback: (data: LockDeniedData) => void) {
    this.lockDeniedCallback = callback
  }

  onLockState(callback: (locks: LockInfo[]) => void) {
    this.lockStateCallback = callback
  }

  offLockGranted() {
    this.lockGrantedCallback = null
  }

  offLockDenied() {
    this.lockDeniedCallback = null
  }

  offLockState() {
    this.lockStateCallback = null
  }

  private handleMessage(message: CollabMessage) {
    // 处理锁相关消息
    switch (message.type) {
      case MessageType.LOCK_GRANTED:
        if (this.lockGrantedCallback && message.data) {
          this.lockGrantedCallback(message.data as LockInfo)
        }
        break
      case MessageType.LOCK_DENIED:
        if (this.lockDeniedCallback && message.data) {
          this.lockDeniedCallback(message.data as LockDeniedData)
        }
        break
      case MessageType.LOCK_STATE:
        if (this.lockStateCallback && message.data) {
          this.lockStateCallback(message.data as LockInfo[])
        }
        break
    }

    // 继续处理其他消息
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }
  }

  // 处理二进制消息
  private handleBinaryMessage(data: ArrayBuffer | Blob) {
    // 将 Blob 转换为 ArrayBuffer
    if (data instanceof Blob) {
      data.arrayBuffer().then(buffer => {
        this.processBinaryData(new Uint8Array(buffer))
      })
    } else {
      this.processBinaryData(new Uint8Array(data))
    }
  }

  private processBinaryData(data: Uint8Array) {
    try {
      // 检查是否压缩数据并解压缩
      const decompressed = this.decompressData(data)

      const message = unpack(decompressed) as CollabMessage

      // 如果是 JSON 消息，交给 handleMessage 处理
      if (typeof message === 'object' && message.type) {
        this.handleMessage(message)
        return
      }

      // 二进制消息分发给所有处理器
      this.binaryHandlers.forEach(handler => handler(data, message as CollabMessage))
    } catch (err) {
      console.error('二进制消息解析失败:', err)
    }
  }

  // 智能心跳机制（30秒间隔）
  private startHeartbeat() {
    this.stopHeartbeat()

    // 使用自定义 ping/pong 消息（浏览器 WebSocket 不支持原生 ping()）
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // 发送自定义 ping 消息
        this.send({
          type: MessageType.PING,
          projectId: this.projectId!
        })

        // 设置超时，如果在 10 秒内没有收到 pong，则认为连接断开
        this.heartbeatTimeout = window.setTimeout(() => {
          console.warn('心跳超时，尝试重连')
          if (this.ws) {
            this.ws.close()
          }
        }, 10000)
      }
    }, 30000) // 30秒间隔
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }

    // 停止旧的 ping 定时器（兼容旧代码）
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // 指数退避重连策略
  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('重连次数达到上限，放弃重连')
      this.notifyConnectionState(ConnectionState.DISCONNECTED)
      return
    }

    // 计算延迟：1s, 2s, 4s, 8s, 16s（指数退避）
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // 最大30秒
    )

    this.reconnectAttempts++
    this.notifyConnectionState(ConnectionState.RECONNECTING)

    setTimeout(() => {
      if (this.projectId && !this.isManualClose) {
        this.connect(this.projectId, this.userName).catch(err => {
          console.error('重连失败:', err)
        })
      }
    }, delay)
  }

  // 获取重连信息
  getReconnectInfo() {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      nextDelay: Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
        30000
      )
    }
  }
}

export const collabService = new CollabService()
