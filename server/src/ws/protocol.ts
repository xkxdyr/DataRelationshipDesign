import { pack, unpack } from 'msgpackr'
import { createGzip, createGunzip } from 'zlib'

export enum MessageType {
  // 用户相关
  USER_JOIN = 'user:join',
  USER_LEAVE = 'user:leave',
  USER_LIST = 'user:list',

  // 操作相关
  OP_CREATE = 'op:create',
  OP_UPDATE = 'op:update',
  OP_DELETE = 'op:delete',

  // 同步相关
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response',

  // 系统相关
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

  // 光标同步
  CURSOR_UPDATE = 'cursor:update',
}

// 消息压缩阈值（1KB）
export const MESSAGE_COMPRESSION_THRESHOLD = 1024

// 消息头标志
export interface MessageHeader {
  compressed: boolean    // 是否压缩
  msgpack: boolean       // 是否使用 MessagePack 格式
  size: number           // 原始消息大小
}

// 消息包装器（用于添加元数据）
export interface WrappedMessage {
  header: MessageHeader
  payload: Buffer | Uint8Array
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

// 锁响应数据
export interface LockResponseData {
  lockType: LockType
  lockId: string
  tableId: string
  columnId?: string
  userId: string
  userName: string
  acquiredAt: number
  expiresAt: number
}

// 预设用户颜色
export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#FF8C42'
]

export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

// ==================== 消息序列化/反序列化 ====================

/**
 * 序列化消息为 Buffer
 * 自动判断是否需要压缩（超过阈值则压缩）
 */
export function serializeMessage(message: CollabMessage): Buffer {
  // 使用 msgpackr 序列化
  const packed = pack(message)

  // 检查是否需要压缩
  if (packed.length > MESSAGE_COMPRESSION_THRESHOLD) {
    return compressMessage(packed)
  }

  return packed
}

/**
 * 反序列化 Buffer 为消息对象
 */
export function deserializeMessage(data: Buffer | Uint8Array): CollabMessage {
  // 检查是否是压缩消息（通过第一个字节判断）
  // 压缩数据通常以 0x1f 0x8b 开头（gzip magic number）
  if (isCompressedData(data)) {
    return decompressAndUnpack(data)
  }

  // 直接解包
  return unpack(data as Buffer) as CollabMessage
}

// ==================== 消息压缩/解压缩 ====================

/**
 * 检查数据是否是压缩数据（gzip 格式）
 */
function isCompressedData(data: Buffer | Uint8Array): boolean {
  if (data.length < 2) return false
  // Gzip magic number: 0x1f 0x8b
  return data[0] === 0x1f && data[1] === 0x8b
}

/**
 * 压缩消息（gzip）
 */
function compressMessage(data: Buffer | Uint8Array): Buffer {
  return new Promise<Buffer>((resolve, reject) => {
    const input = data instanceof Buffer ? data : Buffer.from(data)
    const gzip = createGzip({ level: 6 }) // 中等压缩级别

    const chunks: Buffer[] = []

    gzip.on('data', (chunk) => {
      chunks.push(chunk)
    })

    gzip.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    gzip.on('error', (err) => {
      reject(err)
    })

    gzip.write(input)
    gzip.end()
  }) as unknown as Buffer
}

/**
 * 同步压缩（使用回调方式）
 */
export function compressMessageSync(data: Buffer | Uint8Array): Buffer {
  const input = data instanceof Buffer ? data : Buffer.from(data)

  // 使用 gzip.sync 方法（Node.js 11+）
  const zlib = require('zlib')
  return zlib.gzipSync(input, { level: 6 })
}

/**
 * 解压缩并解包消息
 */
function decompressAndUnpack(data: Buffer | Uint8Array): CollabMessage {
  const zlib = require('zlib')
  const decompressed = zlib.gunzipSync(data instanceof Buffer ? data : Buffer.from(data))
  return unpack(decompressed) as CollabMessage
}

/**
 * 解压缩数据
 */
export function decompressData(data: Buffer | Uint8Array): Buffer {
  const zlib = require('zlib')
  return zlib.gunzipSync(data instanceof Buffer ? data : Buffer.from(data))
}

// ==================== 批量消息处理 ====================

/**
 * 批量序列化消息
 */
export function serializeMessages(messages: CollabMessage[]): Buffer {
  return pack(messages)
}

/**
 * 批量反序列化消息
 */
export function deserializeMessages(data: Buffer | Uint8Array): CollabMessage[] {
  return unpack(data as Buffer) as CollabMessage[]
}

// ==================== 消息验证 ====================

/**
 * 验证消息格式是否正确
 */
export function validateMessage(message: any): message is CollabMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    typeof message.projectId === 'string' &&
    typeof message.userId === 'string' &&
    typeof message.timestamp === 'number'
  )
}

/**
 * 获取消息大小（用于日志和调试）
 */
export function getMessageSize(message: CollabMessage): number {
  const packed = pack(message)
  return packed.length
}
