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
  CURSOR_UPDATE = 'cursor:update',
  LOCK_ACQUIRE = 'lock:acquire',
  LOCK_RELEASE = 'lock:release',
  LOCK_GRANTED = 'lock:granted',
  LOCK_DENIED = 'lock:denied',
  LOCK_STATE = 'lock:state',
  LOCK_TIMEOUT = 'lock:timeout',
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

export type LockType = 'table' | 'column'

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

export interface LockRequestData {
  lockType: LockType
  tableId: string
  columnId?: string
}

export interface LockDeniedData {
  reason: string
  existingLock: LockInfo
}

type LockCallback = (lock: LockInfo) => void
type LockDeniedCallback = (data: LockDeniedData) => void
type LockStateCallback = (locks: LockInfo[]) => void
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

export interface SyncFullStateInput {
  tables: Array<{
    id: string
    name: string
    comment?: string
    positionX: number
    positionY: number
    projectId: string
  }>
  columns: Array<{
    id: string
    tableId: string
    name: string
    dataType: string
    length?: number
    precision?: number
    scale?: number
    nullable: boolean
    defaultValue?: string
    autoIncrement: boolean
    primaryKey: boolean
    unique: boolean
    comment?: string
    order: number
  }>
  relationships: Array<{
    id: string
    projectId: string
    sourceTableId: string
    sourceColumnId: string
    targetTableId: string
    targetColumnId: string
    relationshipType: string
    onUpdate?: string
    onDelete?: string
  }>
  indexes: Array<{
    id: string
    tableId: string
    name: string
    columns: string[]
    unique: boolean
    type: string
  }>
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
  private lockGrantedCallbacks: Set<LockCallback> = new Set()
  private lockDeniedCallbacks: Set<LockDeniedCallback> = new Set()
  private lockStateCallbacks: Set<LockStateCallback> = new Set()
  private locks: LockInfo[] = []
  private myLocks: LockInfo[] = []
  
  private constructor() {
    this.userId = 'user_' + Math.random().toString(36).substring(2)
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
  
  onLockGranted(callback: LockCallback): () => void {
    this.lockGrantedCallbacks.add(callback)
    return () => this.lockGrantedCallbacks.delete(callback)
  }
  
  onLockDenied(callback: LockDeniedCallback): () => void {
    this.lockDeniedCallbacks.add(callback)
    return () => this.lockDeniedCallbacks.delete(callback)
  }
  
  onLockState(callback: LockStateCallback): () => void {
    this.lockStateCallbacks.add(callback)
    callback([...this.locks])
    return () => this.lockStateCallbacks.delete(callback)
  }
  
  getLocks(): LockInfo[] {
    return [...this.locks]
  }
  
  getMyLocks(): LockInfo[] {
    return [...this.myLocks]
  }
  
  getTableLocks(tableId: string): LockInfo[] {
    return this.locks.filter(l => l.tableId === tableId)
  }
  
  getColumnLocks(tableId: string, columnId: string): LockInfo[] {
    return this.locks.filter(l => l.tableId === tableId && l.columnId === columnId)
  }
  
  isTableLocked(tableId: string): LockInfo | undefined {
    return this.locks.find(l => l.tableId === tableId && l.userId !== this.userId)
  }
  
  isColumnLocked(tableId: string, columnId: string): LockInfo | undefined {
    return this.locks.find(l => l.tableId === tableId && l.columnId === columnId && l.userId !== this.userId)
  }
  
  amIHoldingTableLock(tableId: string): boolean {
    return this.myLocks.some(l => l.tableId === tableId && l.lockType === 'table')
  }
  
  amIHoldingColumnLock(tableId: string, columnId: string): boolean {
    return this.myLocks.some(l => l.tableId === tableId && l.columnId === columnId && l.lockType === 'column')
  }
  
  acquireLock(lockType: LockType, tableId: string, columnId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const message = {
      type: MessageType.LOCK_ACQUIRE,
      projectId: this.projectId!,
      userId: this.userId,
      data: { lockType, tableId, columnId },
      timestamp: Date.now()
    }
    this.ws.send(JSON.stringify(message))
  }
  
  releaseLock(lockType: LockType, tableId: string, columnId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const message = {
      type: MessageType.LOCK_RELEASE,
      projectId: this.projectId!,
      userId: this.userId,
      data: { lockType, tableId, columnId },
      timestamp: Date.now()
    }
    this.ws.send(JSON.stringify(message))
  }
  
  releaseAllMyLocks(): void {
    this.myLocks.forEach(lock => {
      this.releaseLock(lock.lockType, lock.tableId, lock.columnId)
    })
  }
  
  getDoc(): Y.Doc | null {
    return this.doc
  }
  
  async start(projectId: string, userName: string, token?: string): Promise<void> {
    if (this.state === CollabState.READY || this.state === CollabState.CONNECTING || this.state === CollabState.INITIALIZING) {
      console.warn('[CollabManager] 已在运行中，跳过 start')
      return
    }
    
    if (this.state === CollabState.RECONNECTING) {
      this.stop()
    }
    
    this.projectId = projectId
    this.userName = userName
    if (token) {
      this.token = token
    }
    this.isManualDisconnect = false
    this.reconnectAttempts = 0
    
    this.setState(CollabState.INITIALIZING, '开始初始化协作')

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
    
    this.loadSnapshot()
    
    this.ydocObserver = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        this.sendCRDTUpdate(update)
      }
      // 仅远程更新才触发处理器（同步到 appStore），避免 appstore 同步写 CRDT 时形成闭环
      if (origin === 'remote') {
        this.crdtUpdateHandlers.forEach(handler => handler(update))
      }
      this.scheduleSnapshotSave()
    }
    
    this.doc.on('update', this.ydocObserver)
  }
  
  private destroyCRDT(): void {
    this.saveSnapshot()
    if (this.doc && this.ydocObserver) {
      this.doc.off('update', this.ydocObserver)
    }
    this.doc?.destroy()
    this.doc = null
    this.cancelSnapshotSave()
  }

  private getSnapshotKey(): string {
    return `collab_snapshot_${this.projectId}`
  }

  private snapshotTimer: number | null = null

  private scheduleSnapshotSave(): void {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer)
    }
    this.snapshotTimer = window.setTimeout(() => {
      this.saveSnapshot()
      this.snapshotTimer = null
    }, 5000)
  }

  private cancelSnapshotSave(): void {
    if (this.snapshotTimer) {
      clearTimeout(this.snapshotTimer)
      this.snapshotTimer = null
    }
  }

  private saveSnapshot(): void {
    if (!this.doc || !this.projectId) return
    try {
      const state = Y.encodeStateAsUpdate(this.doc)
      const key = this.getSnapshotKey()
      const base64 = this.arrayBufferToBase64(state)
      localStorage.setItem(key, base64)
    } catch (err) {
      console.warn('[CollabManager] 保存快照失败:', err)
    }
  }

  private loadSnapshot(): void {
    if (!this.doc || !this.projectId) return
    try {
      const key = this.getSnapshotKey()
      const base64 = localStorage.getItem(key)
      if (base64) {
        const state = this.base64ToArrayBuffer(base64)
        Y.applyUpdate(this.doc, new Uint8Array(state), 'snapshot')
      }
    } catch (err) {
      console.warn('[CollabManager] 加载快照失败:', err)
    }
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
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

        this.ws = new WebSocket(wsUrl)
        this.ws.binaryType = 'arraybuffer'
        let resolved = false
        
        this.ws.onopen = () => {
          if (resolved) return
          resolved = true
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.requestSync()
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
        
        this.ws.onerror = (_error) => {
          console.error('[CollabManager] WebSocket 连接错误')
        }
        
        this.ws.onclose = (event) => {
          console.warn('[CollabManager] WebSocket 关闭:', event.code, event.reason)
          this.stopHeartbeat()
          if (!resolved) {
            resolved = true
            reject(new Error(`连接失败: ${event.reason || '无法连接到服务器'} (code: ${event.code})`))
            return
          }
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
        case MessageType.CURSOR_UPDATE:
          this.handleCursorUpdate(message.userId, message.data)
          break
        case MessageType.LOCK_GRANTED:
          this.handleLockGranted(message.data)
          break
        case MessageType.LOCK_DENIED:
          this.handleLockDenied(message.data)
          break
        case MessageType.LOCK_STATE:
          this.handleLockState(message.data)
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

  private handleCursorUpdate(userId: string, data: { x: number; y: number } | null): void {
    if (!data) return
    const userIndex = this.users.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      this.users[userIndex] = {
        ...this.users[userIndex],
        cursor: { x: data.x, y: data.y }
      }
      this.userListHandlers.forEach(handler => handler([...this.users]))
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

  private handleLockGranted(data: LockInfo): void {
    if (!data) return
    this.locks = this.locks.filter(l => !(l.lockType === data.lockType && l.tableId === data.tableId && l.columnId === data.columnId))
    this.locks.push(data)
    this.myLocks = this.locks.filter(l => l.userId === this.userId)
    this.lockGrantedCallbacks.forEach(cb => cb(data))
  }

  private handleLockDenied(data: LockDeniedData): void {
    if (!data) return
    this.lockDeniedCallbacks.forEach(cb => cb(data))
  }

  private handleLockState(data: LockInfo[]): void {
    if (!data) return
    this.locks = data
    this.myLocks = data.filter(l => l.userId === this.userId)
    this.lockStateCallbacks.forEach(cb => cb([...this.locks]))
  }
  
  stop(): void {
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

  sendCursorUpdate(x: number, y: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    const message = {
      type: MessageType.CURSOR_UPDATE,
      projectId: this.projectId!,
      userId: this.userId,
      data: { x, y },
      timestamp: Date.now()
    }
    try {
      this.ws.send(JSON.stringify(message))
    } catch (err) {
    }
  }

  /**
   * 将 appStore 的完整状态写入 Y.Doc，触发 CRDT 广播到其他协作用户
   * 应在 REST API 写操作成功后调用（createTable/updateTable/deleteTable 等）
   */
  syncFullState(syncData: SyncFullStateInput): void {
    const doc = this.doc
    if (!doc) return

    doc.transact(() => {
      const root = doc.getMap('root')

      // --- Tables (增量更新) ---
      let tablesMap = root.get('tables') as Y.Map<Y.Map<any>>
      if (!tablesMap) {
        tablesMap = new Y.Map()
        root.set('tables', tablesMap)
      }

      syncData.tables.forEach(t => {
        let tm = tablesMap.get(t.id)
        if (!tm) {
          tm = new Y.Map()
          tablesMap.set(t.id, tm)
        }
        tm.set('id', t.id)
        tm.set('name', t.name)
        tm.set('comment', t.comment || '')
        tm.set('positionX', t.positionX)
        tm.set('positionY', t.positionY)
        tm.set('projectId', t.projectId)
      })

      // 注意：不在此处删除不在 syncData 中的条目
      // 原因：syncData 是从 appStore 快照生成的，可能在 doc.transact() 执行前
      // 远程 CRDT 已经写入了新增数据，此时删除会导致远程新增数据丢失
      // 删除操作应由独立的 delete 事件驱动，而非通过"不在快照中"推断

      // --- Columns (增量更新) ---
      let columnsMap = root.get('columns') as Y.Map<Y.Map<any>>
      if (!columnsMap) {
        columnsMap = new Y.Map()
        root.set('columns', columnsMap)
      }

      syncData.columns.forEach(c => {
        let cm = columnsMap.get(c.id)
        if (!cm) {
          cm = new Y.Map()
          columnsMap.set(c.id, cm)
        }
        cm.set('id', c.id)
        cm.set('tableId', c.tableId)
        cm.set('name', c.name)
        cm.set('type', c.dataType)
        if (c.length) cm.set('length', c.length)
        if (c.precision != null) cm.set('precision', c.precision)
        if (c.scale != null) cm.set('scale', c.scale)
        cm.set('isNotNull', c.nullable === false)
        if (c.defaultValue) cm.set('defaultValue', c.defaultValue)
        cm.set('isAutoIncrement', c.autoIncrement || false)
        cm.set('isPrimaryKey', c.primaryKey || false)
        cm.set('isUnique', c.unique || false)
        if (c.comment) cm.set('comment', c.comment)
        cm.set('order', c.order || 0)
      })

      // 同 tables 删除逻辑：不在此处删除，避免误删远程新增数据

      // --- Relationships (增量更新) ---
      let relsMap = root.get('relationships') as Y.Map<Y.Map<any>>
      if (!relsMap) {
        relsMap = new Y.Map()
        root.set('relationships', relsMap)
      }

      syncData.relationships.forEach(r => {
        let rm = relsMap.get(r.id)
        if (!rm) {
          rm = new Y.Map()
          relsMap.set(r.id, rm)
        }
        rm.set('id', r.id)
        rm.set('projectId', r.projectId)
        rm.set('sourceTableId', r.sourceTableId)
        rm.set('sourceColumnId', r.sourceColumnId)
        rm.set('targetTableId', r.targetTableId)
        rm.set('targetColumnId', r.targetColumnId)
        rm.set('relationshipType', r.relationshipType)
        rm.set('onUpdate', r.onUpdate || 'NO ACTION')
        rm.set('onDelete', r.onDelete || 'NO ACTION')
      })

      // 同 tables 删除逻辑：不在此处删除，避免误删远程新增数据

      // --- Indexes (增量更新) ---
      let indexesMap = root.get('indexes') as Y.Map<Y.Map<any>>
      if (!indexesMap) {
        indexesMap = new Y.Map()
        root.set('indexes', indexesMap)
      }

      syncData.indexes.forEach(idx => {
        let im = indexesMap.get(idx.id)
        if (!im) {
          im = new Y.Map()
          indexesMap.set(idx.id, im)
        }
        im.set('id', idx.id)
        im.set('tableId', idx.tableId)
        im.set('name', idx.name)
        im.set('columns', idx.columns || [])
        im.set('isUnique', idx.unique || false)
        im.set('indexType', idx.type || 'BTREE')
      })

      // 同 tables 删除逻辑：不在此处删除，避免误删远程新增数据
    }, 'appstore-sync')
  }

  /**
   * 从 CRDT 中删除指定表（独立删除事件驱动）
   * 应在 REST API deleteTable 成功后调用
   */
  syncDeleteTable(tableId: string): void {
    const doc = this.doc
    if (!doc) return
    doc.transact(() => {
      const root = doc.getMap('root')
      const tablesMap = root.get('tables') as Y.Map<Y.Map<any>>
      if (tablesMap) {
        tablesMap.delete(tableId)
      }
    }, 'appstore-sync')
  }

  /**
   * 从 CRDT 中删除指定列（独立删除事件驱动）
   * 应在 REST API deleteColumn 成功后调用
   */
  syncDeleteColumn(columnId: string): void {
    const doc = this.doc
    if (!doc) return
    doc.transact(() => {
      const root = doc.getMap('root')
      const columnsMap = root.get('columns') as Y.Map<Y.Map<any>>
      if (columnsMap) {
        columnsMap.delete(columnId)
      }
    }, 'appstore-sync')
  }

  /**
   * 从 CRDT 中删除指定关系（独立删除事件驱动）
   * 应在 REST API deleteRelationship 成功后调用
   */
  syncDeleteRelationship(relationshipId: string): void {
    const doc = this.doc
    if (!doc) return
    doc.transact(() => {
      const root = doc.getMap('root')
      const relsMap = root.get('relationships') as Y.Map<Y.Map<any>>
      if (relsMap) {
        relsMap.delete(relationshipId)
      }
    }, 'appstore-sync')
  }

  /**
   * 从 CRDT 中删除指定索引（独立删除事件驱动）
   * 应在 REST API deleteIndex 成功后调用
   */
  syncDeleteIndex(indexId: string): void {
    const doc = this.doc
    if (!doc) return
    doc.transact(() => {
      const root = doc.getMap('root')
      const indexesMap = root.get('indexes') as Y.Map<Y.Map<any>>
      if (indexesMap) {
        indexesMap.delete(indexId)
      }
    }, 'appstore-sync')
  }
}

export const collabManager = CollabManager.getInstance()
