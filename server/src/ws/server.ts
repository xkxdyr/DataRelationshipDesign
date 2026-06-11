import { WebSocket, WebSocketServer } from 'ws'
import { Server } from 'http'
import { pack, unpack } from 'msgpackr'
import * as Y from 'yjs'
import { CollabMessage, MessageType, serializeMessage, deserializeMessage, compressMessageSync, decompressData, MESSAGE_COMPRESSION_THRESHOLD } from './protocol'
import { CollabRoom } from './room'
import { lockService } from './lockService'
import { collabPersistence } from './persistence'
import { collabHistoryService } from '../services/collabHistoryService'
import { PrismaClient } from '@prisma/client'
import * as jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'

interface DecodedToken {
  userId: string
  username: string
}

function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken
  } catch (error) {
    return null
  }
}

const HEARTBEAT_INTERVAL = 30000
const HEARTBEAT_TIMEOUT = 10000

interface ProjectData {
  tables: any[]
  columns: any[]
  relationships: any[]
  indexes: any[]
}

async function loadProjectDataFromDB(projectId: string): Promise<ProjectData> {
  const tables = await prisma.table.findMany({
    where: { projectId },
    include: {
      columns: true,
      indexes: true
    }
  })

  const relationships = await prisma.relationship.findMany({
    where: { projectId }
  })

  const allColumns: any[] = []
  const allIndexes: any[] = []

  tables.forEach(table => {
    table.columns.forEach(col => {
      allColumns.push({
        id: col.id,
        tableId: col.tableId,
        name: col.name,
        type: col.dataType,
        comment: col.comment || '',
        isPrimaryKey: col.primaryKey,
        isUnique: col.unique,
        isNotNull: !col.nullable,
        isAutoIncrement: col.autoIncrement,
        defaultValue: col.defaultValue || '',
        order: col.order,
        length: col.length,
        precision: col.precision,
        scale: col.scale
      })
    })

    table.indexes.forEach(idx => {
      let columns: string[] = []
      try {
        columns = JSON.parse(idx.columns || '[]')
      } catch {
        columns = []
      }
      allIndexes.push({
        id: idx.id,
        tableId: idx.tableId,
        name: idx.name,
        columns,
        isUnique: idx.unique,
        indexType: idx.type as any
      })
    })
  })

  const formattedTables = tables.map(table => ({
    id: table.id,
    name: table.name,
    comment: table.comment || '',
    positionX: table.positionX,
    positionY: table.positionY,
    projectId: table.projectId,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString()
  }))

  const formattedRelationships = relationships.map(rel => ({
    id: rel.id,
    projectId: rel.projectId,
    sourceTableId: rel.sourceTableId,
    sourceColumnId: rel.sourceColumnId,
    targetTableId: rel.targetTableId,
    targetColumnId: rel.targetColumnId,
    relationshipType: rel.relationshipType,
    onUpdate: rel.onUpdate,
    onDelete: rel.onDelete
  }))

  return {
    tables: formattedTables,
    columns: allColumns,
    relationships: formattedRelationships,
    indexes: allIndexes
  }
}

function populateCRDTDoc(doc: Y.Doc, data: ProjectData): void {
  const root = doc.getMap('root')
  
  const tablesMap = new Y.Map()
  data.tables.forEach(table => {
    const tableMap = new Y.Map()
    Object.entries(table).forEach(([key, value]) => {
      if (value !== undefined) {
        tableMap.set(key, value)
      }
    })
    tablesMap.set(table.id, tableMap)
  })
  root.set('tables', tablesMap)

  const columnsMap = new Y.Map()
  data.columns.forEach(column => {
    const columnMap = new Y.Map()
    Object.entries(column).forEach(([key, value]) => {
      if (value !== undefined) {
        columnMap.set(key, value)
      }
    })
    columnsMap.set(column.id, columnMap)
  })
  root.set('columns', columnsMap)

  const relationshipsMap = new Y.Map()
  data.relationships.forEach(rel => {
    const relMap = new Y.Map()
    Object.entries(rel).forEach(([key, value]) => {
      if (value !== undefined) {
        relMap.set(key, value)
      }
    })
    relationshipsMap.set(rel.id, relMap)
  })
  root.set('relationships', relationshipsMap)

  const indexesMap = new Y.Map()
  data.indexes.forEach(index => {
    const indexMap = new Y.Map()
    Object.entries(index).forEach(([key, value]) => {
      if (value !== undefined) {
        indexMap.set(key, value)
      }
    })
    indexesMap.set(index.id, indexMap)
  })
  root.set('indexes', indexesMap)
}

function detectOperationType(update: Uint8Array): string {
  // 简单判断：大于 500 字节的更新可能是批量操作
  if (update.length > 500) return 'bulk_update'
  return 'update'
}

export class CollabWebSocketServer {
  private static instance: CollabWebSocketServer | null = null
  private wss: WebSocketServer
  private rooms: Map<string, CollabRoom> = new Map()
  private heartbeatIntervals: Map<WebSocket, NodeJS.Timeout> = new Map()
  private heartbeatTimeouts: Map<WebSocket, NodeJS.Timeout> = new Map()

  constructor(server: Server) {
    CollabWebSocketServer.instance = this
    this.wss = new WebSocketServer({ server, path: '/ws/collab' })
    this.setupLockExpiredCallback()
    this.init()
  }

  static getInstance(): CollabWebSocketServer | null {
    return CollabWebSocketServer.instance
  }

  getRoom(projectId: string): CollabRoom | undefined {
    return this.rooms.get(projectId)
  }

  private setupLockExpiredCallback() {
    lockService.setOnLockExpired((projectId, expiredLocks) => {
      const room = this.rooms.get(projectId)
      if (!room) return
      for (const lock of expiredLocks) {
        room.sendToUser(lock.userId, {
          type: MessageType.LOCK_TIMEOUT,
          projectId,
          userId: 'system',
          data: {
            lockId: lock.lockId,
            lockType: lock.lockType,
            tableId: lock.tableId,
            columnId: lock.columnId
          },
          timestamp: Date.now()
        })
      }
      room.broadcastLockState()
    })
  }

  private init() {
    this.wss.on('connection', async (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const projectId = url.searchParams.get('projectId')
      const userId = url.searchParams.get('userId')
      const userName = decodeURIComponent(url.searchParams.get('userName') || '匿名用户')
      const token = url.searchParams.get('token')

      if (!projectId || !userId) {
        ws.close(1008, '缺少必要参数')
        return
      }

      let effectiveUserId = userId
      let effectiveUserName = userName

      if (token) {
        const decoded = verifyToken(token)
        if (decoded) {
          effectiveUserId = decoded.userId
          effectiveUserName = decoded.username || userName
        }
      }

      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { collaborationEnabled: true, id: true }
        })

        if (!project) {
          ws.close(1008, '项目不存在')
          return
        }

        if (!project.collaborationEnabled) {
          ws.close(1008, '该项目未开启协作模式')
          return
        }
      } catch (error) {
        console.error('检查项目协作状态失败:', error)
        ws.close(1011, '服务器内部错误')
        return
      }

      let room = this.rooms.get(projectId)
      if (!room) {
        room = new CollabRoom(projectId)
        this.rooms.set(projectId, room)
        
        try {
          const projectData = await loadProjectDataFromDB(projectId)
          const crdtManager = room.getCRDTManager()
          const doc = crdtManager.getDoc()
          populateCRDTDoc(doc, projectData)
          console.warn(`[WebSocket] 项目数据已加载到 CRDT`)
        } catch (error) {
          console.error('加载项目数据失败:', error)
        }
        
        collabPersistence.loadProject(projectId)
        collabPersistence.startAutoSave(projectId)
      }

      room.addClient({ ws, userId: effectiveUserId, userName: effectiveUserName, projectId })

      this.startHeartbeat(ws)

      const userListMsg = this.createMessage(MessageType.USER_LIST, projectId, 'system', room.getUsers())
      ws.send(JSON.stringify(userListMsg))

      room.broadcast(this.createMessage(MessageType.USER_JOIN, projectId, effectiveUserId, { id: effectiveUserId, name: effectiveUserName }), effectiveUserId)

      collabHistoryService.recordOperation({
        projectId,
        userId: effectiveUserId,
        userName: effectiveUserName,
        operationType: 'join',
        targetType: 'user',
        targetId: effectiveUserId,
        targetName: effectiveUserName
      })

      ws.on('message', (data) => {
        try {
          const raw = data instanceof Buffer ? data : Buffer.from(data as any)
          const isJson = raw.length > 0 && raw[0] === 0x7b
          
          if (isJson) {
            const text = raw.toString('utf-8')
            const message: CollabMessage = JSON.parse(text)
            if (message.type === MessageType.PING) {
              const pongMsg = this.createMessage(MessageType.PONG, projectId, 'system')
              ws.send(JSON.stringify(pongMsg))
              return
            }
            this.handleMessage(message, ws, room!, effectiveUserId)
          } else {
            this.handleBinaryMessage(raw, ws, room!, effectiveUserId)
          }
        } catch (err) {
          console.error('消息解析失败:', err)
        }
      })

      ws.on('close', () => {
        console.warn('[WebSocket] 连接断开')
        this.stopHeartbeat(ws)
        room!.removeClient(effectiveUserId)

        collabHistoryService.recordOperation({
          projectId,
          userId: effectiveUserId,
          userName: effectiveUserName,
          operationType: 'leave',
          targetType: 'user',
          targetId: effectiveUserId,
          targetName: effectiveUserName
        })

        room!.broadcast(this.createMessage(MessageType.USER_LEAVE, projectId, effectiveUserId, { id: effectiveUserId }))

        if (room!.getClientCount() === 0) {
          collabPersistence.saveProject(projectId)
          collabPersistence.stopAutoSave(projectId)
          this.rooms.delete(projectId)
        }
      })

      ws.on('error', (error) => {
        console.error('WebSocket 错误:', error)
        this.stopHeartbeat(ws)
      })

      ws.on('pong', () => {
        const timeout = this.heartbeatTimeouts.get(ws)
        if (timeout) {
          clearTimeout(timeout)
          this.heartbeatTimeouts.delete(ws)
        }
      })
    })
  }

  private createMessage(type: MessageType, projectId: string, userId: string, data?: any): CollabMessage {
    return {
      type,
      projectId,
      userId,
      data,
      timestamp: Date.now()
    }
  }

  private startHeartbeat(ws: WebSocket) {
    this.stopHeartbeat(ws)

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()

        const timeout = setTimeout(() => {
          console.warn('[WebSocket] 心跳超时，关闭连接')
          ws.terminate()
        }, HEARTBEAT_TIMEOUT)

        this.heartbeatTimeouts.set(ws, timeout)
      }
    }, HEARTBEAT_INTERVAL)

    this.heartbeatIntervals.set(ws, interval)
  }

  private stopHeartbeat(ws: WebSocket) {
    const interval = this.heartbeatIntervals.get(ws)
    if (interval) {
      clearInterval(interval)
      this.heartbeatIntervals.delete(ws)
    }

    const timeout = this.heartbeatTimeouts.get(ws)
    if (timeout) {
      clearTimeout(timeout)
      this.heartbeatTimeouts.delete(ws)
    }
  }

  private handleMessage(message: CollabMessage, ws: WebSocket, room: CollabRoom, userId: string) {
    switch (message.type) {
      case MessageType.PING:
        ws.send(JSON.stringify(this.createMessage(MessageType.PONG, message.projectId, 'system')))
        break

      case MessageType.SYNC_REQUEST:
        this.handleSyncRequest(message, ws, room, userId)
        break

      case MessageType.OP_CREATE:
      case MessageType.OP_UPDATE:
      case MessageType.OP_DELETE:
        room.broadcast(message, userId)
        // 记录 create/delete 操作到历史
        if (message.type === MessageType.OP_CREATE || message.type === MessageType.OP_DELETE) {
          collabHistoryService.recordOperation({
            projectId: message.projectId,
            userId,
            userName: room.getUserName(userId) || '匿名用户',
            operationType: message.type === MessageType.OP_CREATE ? 'create' : 'delete',
            targetType: message.data?.targetType || 'project',
            targetId: message.data?.targetId || message.projectId,
            targetName: message.data?.targetName || (message.type === MessageType.OP_CREATE ? '创建操作' : '删除操作'),
            changes: message.data?.changes
          })
        }
        break

      // 锁相关消息
      case MessageType.LOCK_ACQUIRE:
        room.handleLockAcquire(userId, message.data)
        break

      case MessageType.LOCK_RELEASE:
        room.handleLockRelease(userId, message.data)
        break

      case MessageType.LOCK_RENEW:
        room.handleLockRenew(userId, message.data)
        break

      case MessageType.CURSOR_UPDATE:
        room.broadcast(message, userId)
        break

      default:
        console.warn('[WebSocket] 未知消息类型:', message.type)
    }
  }

  private handleBinaryMessage(data: Buffer | Uint8Array, ws: WebSocket, room: CollabRoom, userId: string) {
    try {
      const message = deserializeMessage(data)

      if (message.type === MessageType.SYNC_REQUEST) {
        const crdtManager = room.getCRDTManager()
        const lastUpdate = message.data?.lastUpdate || 0

        if (lastUpdate > 0) {
          const currentVersion = crdtManager.getVersion()
          if (currentVersion <= lastUpdate) {
            const response: CollabMessage = {
              type: MessageType.SYNC_RESPONSE,
              projectId: message.projectId,
              userId: 'system',
              data: { version: currentVersion, updates: [] },
              timestamp: Date.now()
            }
            const responseData = pack(response)
            if (responseData.length > MESSAGE_COMPRESSION_THRESHOLD) {
              const compressed = compressMessageSync(responseData)
              room.sendBinaryToUser(userId, compressed)
            } else {
              room.sendBinaryToUser(userId, responseData)
            }
            return
          }
        }

        const state = crdtManager.getState()

        const response: CollabMessage = {
          type: MessageType.SYNC_RESPONSE,
          projectId: message.projectId,
          userId: 'system',
          data: { version: crdtManager.getVersion(), state: Array.from(state) },
          timestamp: Date.now()
        }

        const responseData = pack(response)

        if (responseData.length > MESSAGE_COMPRESSION_THRESHOLD) {
          const compressed = compressMessageSync(responseData)
          room.sendBinaryToUser(userId, compressed)
        } else {
          room.sendBinaryToUser(userId, responseData)
        }
      } else if (message.type === MessageType.OP_UPDATE) {
        const crdtManager = room.getCRDTManager()

        if (message.data?.update) {
          const update = new Uint8Array(message.data.update)
          crdtManager.applyUpdate(update)

          const operationType = detectOperationType(update)
          collabHistoryService.recordOperation({
            projectId: message.projectId,
            userId,
            userName: room.getUserName(userId) || '匿名用户',
            operationType: operationType as any,
            targetType: 'project',
            targetId: message.projectId,
            targetName: operationType === 'bulk_update' ? '批量更新' : '项目更新',
            changes: { updateSize: message.data.update.length }
          })

          const broadcastMsg = pack({
            type: MessageType.OP_UPDATE,
            projectId: message.projectId,
            userId: userId,
            data: { update: message.data.update },
            timestamp: Date.now()
          })

          if (broadcastMsg.length > MESSAGE_COMPRESSION_THRESHOLD) {
            const compressed = compressMessageSync(broadcastMsg)
            room.broadcastBinary(compressed, userId)
          } else {
            room.broadcastBinary(broadcastMsg, userId)
          }
        }
      }
    } catch (err) {
      console.error('二进制消息处理失败:', err)
    }
  }

  private handleSyncRequest(message: CollabMessage, ws: WebSocket, room: CollabRoom, userId: string) {
    const crdtManager = room.getCRDTManager()
    const lastUpdate = message.data?.lastUpdate

    let state: Uint8Array

    if (lastUpdate) {
      state = crdtManager.getUpdate(new Uint8Array(lastUpdate))
    } else {
      state = crdtManager.getState()
    }

    const response = this.createMessage(MessageType.SYNC_RESPONSE, message.projectId, 'system', { state: Array.from(state) })

    const responseData = pack(response)
    if (responseData.length > MESSAGE_COMPRESSION_THRESHOLD) {
      const compressed = compressMessageSync(responseData)
      room.sendBinaryToUser(userId, compressed)
    } else {
      ws.send(JSON.stringify(response))
    }
  }
}
