import * as Y from 'yjs'
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

export enum CollabState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  CONNECTING = 'connecting',
  SYNCING = 'syncing',
  READY = 'ready',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface CollabStateChange {
  oldState: CollabState
  newState: CollabState
  reason?: string
}

type StateHandler = (state: CollabState) => void
type StateChangeHandler = (change: CollabStateChange) => void
type MessageHandler = (message: CollabMessage) => void
type CRDTUpdateHandler = (update: Uint8Array) => void
type UserListHandler = (users: UserInfo[]) => void

const MESSAGE_COMPRESSION_THRESHOLD = 1024
const HEARTBEAT_INTERVAL = 30000
const HEARTBEAT_TIMEOUT = 10000
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000

function decompressData(data: Uint8Array): Uint8Array {
  if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
    try {
      return pako.ungzip(data)
    } catch (err) {
      console.warn('解压缩失败，使用原始数据:', err)
    }
  }
  return data
}

class CollabManager {
  private static instance: CollabManager
  private state: CollabState = CollabState.IDLE
  private ws: WebSocket | null = null
  private doc: Y.Doc | null = null
  private ydocObserver: ((update: Uint8Array, origin: unknown) => void) | null = null
  private projectId: string | null = null
  private userId: string
  private userName: string = '用户'
  private token: string | null = null
  private reconnectAttempts: number = 0
  private isManualDisconnect: boolean = false
  private heartbeatInterval: number | null = null
  private heartbeatTimeout: number | null = null
  private users: UserInfo[] = []
  
  private stateHandlers: Set<StateHandler> = new Set()
  private stateChangeHandlers: Set<StateChangeHandler> = new Set()
  private messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map()
  private crdtUpdateHandlers: Set<CRDTUpdateHandler> = new Set()
  private userListHandlers: Set<UserListHandler> = new Set()
  
  private constructor() {
    this.userId = 'user_' + Math.random().toString(36).substr(2, 9)
  }
  
  static getInstance(): CollabManager {
    if (!CollabManager.instance) {
      CollabManager.instance = new CollabManager()
    }
    return CollabManager.instance
  }
  
  getState(): CollabState {
    return this.state
  }
  
  getProjectId(): string | null {
    return this.projectId
  }
  
  getUserId(): string {
    return this.userId
  }
  
  setUserId(userId: string): void {
    this.userId = userId
  }
  
  setToken(token: string): void {
    this.token = token
  }
  
  getUsers(): UserInfo[] {
    return [...this.users]
  }
  
  private setState(newState: CollabState, reason?: string): void {
    const oldState = this.state
    if (oldState === newState) return
    
    this.state = newState
    console.log(`[CollabManager] 状态变化: ${oldState} -> ${newState}${reason ? ` (${reason})` : ''}`)
    
    const change: CollabStateChange = { oldState, newState, reason }
    
    this.stateHandlers.forEach(handler => handler(newState))
    this.stateChangeHandlers.forEach(handler => handler(change))
  }
  
  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler)
    handler(this.state)
    return () => this.stateHandlers.delete(handler)
  }
  
  onStateChangeDetailed(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler)
    return () => this.stateChangeHandlers.delete(handler)
  }
  
  onMessage(type: MessageType, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler)
    return () => this.messageHandlers.get(type)?.delete(handler)
  }
  
  onCRDTUpdate(handler: CRDTUpdateHandler): () => void {
    this.crdtUpdateHandlers.add(handler)
    return () => this.crdtUpdateHandlers.delete(handler)
  }
  
  onUserListChange(handler: UserListHandler): () => void {
    this.userListHandlers.add(handler)
    handler([...this.users])
    return () => this.userListHandlers.delete(handler)
  }
  
  getDoc(): Y.Doc | null {
    return this.doc
  }
  
  async start(projectId: string, userName: string, token?: string): Promise<void> {
    if (this.state === CollabState.READY || this.state === CollabState.CONNECTING || this.state === CollabState.INITIALIZING) {
      console.warn('[CollabManager] 已在运行中，跳过 start')
      return
    }
    
    this.projectId = projectId
    this.userName = userName
    if (token) {
      this.token = token
    }
    this.isManualDisconnect = false
    this.reconnectAttempts = 0
    
    this.setState(CollabState.INITIALIZING, '开始初始化协作')
    console.log(`[CollabManager] 启动协作: projectId=${projectId}, userName=${userName}`)
    
    this.initCRDT()
    
    this.setState(CollabState.CONNECTING, '连接服务器')
    
    try {
      await this.connect()
    } catch (error) {
      this.setState(CollabState.ERROR, `连接失败: ${(error as Error).message}`)
      throw error
    }
  }
  
  private initCRDT(): void {
    if (this.doc) {
      this.destroyCRDT()
    }
    
    this.doc = new Y.Doc()
    
    this.ydocObserver = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        this.crdtUpdateHandlers.forEach(handler => handler(update))
        this.sendCRDTUpdate(update)
      }
    }
    
    this.doc.on('update', this.ydocObserver)
  }
  
  private destroyCRDT(): void {
    if (this.doc && this.ydocObserver) {
      this.doc.off('update', this.ydocObserver)
    }
    this.doc?.destroy()
    this.doc = null
  }
  
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.hostname
        const port = 3001
        
        let wsUrl = `${protocol}//${host}:${port}/ws/collab?projectId=${this.projectId}&userId=${this.userId}&userName=${encodeURIComponent(this.userName)}`
        
        if (this.token) {
          wsUrl += `&token=${encodeURIComponent(this.token)}`
        }
        
        console.log('[CollabManager] WebSocket URL:', wsUrl)
        
        this.ws = new WebSocket(wsUrl)
        this.ws.binaryType = 'arraybuffer'
        
        this.ws.onopen = () => {
          console.log('[CollabManager] WebSocket 连接成功')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.requestSync()
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
        
        this.ws.onerror = (error) => {
          console.error('[CollabManager] WebSocket 错误:', error)
          reject(error)
        }
        
        this.ws.onclose = (event) => {
          console.log('[CollabManager] WebSocket 关闭:', event.code, event.reason)
          this.stopHeartbeat()
          this.handleDisconnect(event.reason)
        }
      } catch (error) {
        reject(error)
      }
    })
  }
  
  private handleDisconnect(reason?: string): void {
    if (this.isManualDisconnect) {
      this.setState(CollabState.DISCONNECTED, '主动断开')
      return
    }
    
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setState(CollabState.ERROR, `重连次数达到上限 (${MAX_RECONNECT_ATTEMPTS})`)
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      30000
    )
    
    this.setState(CollabState.RECONNECTING, `第 ${this.reconnectAttempts} 次重连 (${delay}ms)`)
    console.log(`[CollabManager] 尝试第 ${this.reconnectAttempts} 次重连，延迟 ${delay}ms`)
    
    setTimeout(() => {
      if (!this.isManualDisconnect && this.projectId) {
        this.connect().catch(err => {
          console.error('[CollabManager] 重连失败:', err)
        })
      }
    }, delay)
  }
  
  private handleMessage(data: any): void {
    try {
      let message: CollabMessage
      
      if (data instanceof ArrayBuffer) {
        const decompressed = decompressData(new Uint8Array(data))
        message = unpack(decompressed) as CollabMessage
      } else {
        message = JSON.parse(data)
      }
      
      if (message.type === MessageType.PONG) {
        this.handlePong()
        return
      }
      
      this.dispatchMessage(message)
      
      switch (message.type) {
        case MessageType.USER_LIST:
          this.handleUserList(message.data || [])
          break
        case MessageType.USER_JOIN:
          this.handleUserJoin(message.data)
          break
        case MessageType.USER_LEAVE:
          this.handleUserLeave(message.data)
          break
        case MessageType.SYNC_RESPONSE:
          this.handleSyncResponse(message.data)
          break
        case MessageType.OP_UPDATE:
          this.handleRemoteUpdate(message.data)
          break
      }
    } catch (err) {
      console.error('[CollabManager] 消息解析失败:', err)
    }
  }
  
  private dispatchMessage(message: CollabMessage): void {
    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }
  }
  
  private handleUserList(users: UserInfo[]): void {
    this.users = users.map(user => ({
      ...user,
      color: this.generateUserColor(user.id)
    }))
    this.userListHandlers.forEach(handler => handler([...this.users]))
  }
  
  private handleUserJoin(user: UserInfo): void {
    const existingIndex = this.users.findIndex(u => u.id === user.id)
    if (existingIndex === -1) {
      this.users.push({
        ...user,
        color: this.generateUserColor(user.id)
      })
    } else {
      this.users[existingIndex] = {
        ...this.users[existingIndex],
        ...user,
        color: this.generateUserColor(user.id)
      }
    }
    this.userListHandlers.forEach(handler => handler([...this.users]))
  }
  
  private handleUserLeave(user: { id: string }): void {
    this.users = this.users.filter(u => u.id !== user.id)
    this.userListHandlers.forEach(handler => handler([...this.users]))
  }
  
  private handleSyncResponse(data: any): void {
    if (!this.doc || !data?.state) {
      return
    }
    
    try {
      const state = new Uint8Array(data.state)
      Y.applyUpdate(this.doc, state, 'remote')
      this.setState(CollabState.READY, '同步完成')
      console.log('[CollabManager] 初始同步完成')
    } catch (err) {
      console.error('[CollabManager] 同步失败:', err)
      this.setState(CollabState.ERROR, '同步失败')
    }
  }
  
  private handleRemoteUpdate(data: any): void {
    if (!this.doc || !data?.update) {
      return
    }
    
    try {
      const update = new Uint8Array(data.update)
      Y.applyUpdate(this.doc, update, 'remote')
    } catch (err) {
      console.error('[CollabManager] 应用远程更新失败:', err)
    }
  }
  
  private generateUserColor(userId: string): string {
    const colors = [
      '#f5222d', '#fa541c', '#fa8c16', '#faad14', '#fadb14',
      '#a0d911', '#52c41a', '#13c2c2', '#1890ff', '#2f54eb',
      '#722ed1', '#eb2f96'
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }
  
  private requestSync(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    
    this.setState(CollabState.SYNCING, '请求同步')
    
    const message: CollabMessage = {
      type: MessageType.SYNC_REQUEST,
      projectId: this.projectId!,
      userId: this.userId,
      timestamp: Date.now()
    }
    
    const binaryData = pack(message)
    if (binaryData.length > MESSAGE_COMPRESSION_THRESHOLD) {
      this.ws.send(pako.gzip(binaryData))
    } else {
      this.ws.send(binaryData)
    }
  }
  
  private sendCRDTUpdate(update: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    
    const message = {
      type: MessageType.OP_UPDATE,
      projectId: this.projectId!,
      userId: this.userId,
      data: { update: Array.from(update) },
      timestamp: Date.now()
    }
    
    const binaryData = pack(message)
    if (binaryData.length > MESSAGE_COMPRESSION_THRESHOLD) {
      this.ws.send(pako.gzip(binaryData))
    } else {
      this.ws.send(binaryData)
    }
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMessage: CollabMessage = {
          type: MessageType.PING,
          projectId: this.projectId!,
          userId: this.userId,
          timestamp: Date.now()
        }
        this.ws.send(JSON.stringify(pingMessage))
        
        this.heartbeatTimeout = window.setTimeout(() => {
          console.warn('[CollabManager] 心跳超时，关闭连接')
          this.ws?.close()
        }, HEARTBEAT_TIMEOUT)
      }
    }, HEARTBEAT_INTERVAL)
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }
  
  private handlePong(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }
  
  stop(): void {
    console.log('[CollabManager] 停止协作')
    this.isManualDisconnect = true
    this.stopHeartbeat()
    
    if (this.ws) {
      try {
        this.ws.close()
      } catch (err) {
        console.warn('[CollabManager] 关闭 WebSocket 失败:', err)
      }
      this.ws = null
    }
    
    this.destroyCRDT()
    this.users = []
    this.setState(CollabState.IDLE, '停止协作')
  }
  
  async switchProject(projectId: string, userName: string, token?: string): Promise<void> {
    this.stop()
    await this.start(projectId, userName, token)
  }
}

export const collabManager = CollabManager.getInstance()
