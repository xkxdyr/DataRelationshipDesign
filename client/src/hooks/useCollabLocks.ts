import { useState, useEffect, useCallback } from 'react'
import { collabService, LockInfo, LockType, LockDeniedData, ConnectionState } from '../services/collabService'
import { message } from 'antd'

// 锁状态 hook
export function useCollabLocks() {
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [myLocks, setMyLocks] = useState<LockInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // 初始化
  useEffect(() => {
    // 检查连接状态
    setIsConnected(collabService.getConnectionState() === ConnectionState.CONNECTED)

    // 连接状态变化监听
    const handleConnectionChange = (state: ConnectionState) => {
      setIsConnected(state === ConnectionState.CONNECTED)
    }
    collabService.onConnectionChange(handleConnectionChange)

    // 锁状态监听
    const handleLockState = (newLocks: LockInfo[]) => {
      setLocks(newLocks)
      // 更新我的锁
      const myUserId = collabService.getUserId()
      setMyLocks(newLocks.filter(l => l.userId === myUserId))
    }

    // 锁获取成功
    const handleLockGranted = (lock: LockInfo) => {
      console.log('[useCollabLocks] 锁获取成功:', lock)
    }

    // 锁获取失败
    const handleLockDenied = (data: LockDeniedData) => {
      console.warn('[useCollabLocks] 锁获取失败:', data.reason)
      message.warning(data.reason)
    }

    collabService.onLockState(handleLockState)
    collabService.onLockGranted(handleLockGranted)
    collabService.onLockDenied(handleLockDenied)

    return () => {
      collabService.offConnectionChange(handleConnectionChange)
      collabService.offLockState()
      collabService.offLockGranted()
      collabService.offLockDenied()
    }
  }, [])

  // 获取表的锁
  const getTableLocks = useCallback((tableId: string): LockInfo[] => {
    return locks.filter(l => l.tableId === tableId)
  }, [locks])

  // 获取字段的锁
  const getColumnLocks = useCallback((tableId: string, columnId: string): LockInfo[] => {
    return locks.filter(l => l.tableId === tableId && l.columnId === columnId)
  }, [locks])

  // 检查表是否被锁
  const isTableLocked = useCallback((tableId: string): LockInfo | null => {
    const myUserId = collabService.getUserId()
    const tableLocks = locks.filter(
      l => l.tableId === tableId && l.userId !== myUserId
    )
    return tableLocks.length > 0 ? tableLocks[0] : null
  }, [locks])

  // 检查字段是否被锁
  const isColumnLocked = useCallback((tableId: string, columnId: string): LockInfo | null => {
    const myUserId = collabService.getUserId()
    return locks.find(
      l => l.tableId === tableId && l.columnId === columnId && l.userId !== myUserId
    ) || null
  }, [locks])

  // 检查我是否持有表锁
  const amIHoldingTableLock = useCallback((tableId: string): boolean => {
    return myLocks.some(l => l.tableId === tableId && l.lockType === 'table')
  }, [myLocks])

  // 检查我是否持有字段锁
  const amIHoldingColumnLock = useCallback((tableId: string, columnId: string): boolean => {
    return myLocks.some(l => l.tableId === tableId && l.columnId === columnId)
  }, [myLocks])

  // 请求表锁
  const requestTableLock = useCallback((tableId: string) => {
    if (!isConnected) {
      console.warn('[useCollabLocks] 未连接，无法请求锁')
      return
    }
    collabService.acquireLock('table', tableId)
  }, [isConnected])

  // 请求字段锁
  const requestColumnLock = useCallback((tableId: string, columnId: string) => {
    if (!isConnected) {
      console.warn('[useCollabLocks] 未连接，无法请求锁')
      return
    }
    collabService.acquireLock('column', tableId, columnId)
  }, [isConnected])

  // 释放表锁
  const releaseTableLock = useCallback((tableId: string) => {
    if (!isConnected) return
    collabService.releaseLock('table', tableId)
  }, [isConnected])

  // 释放字段锁
  const releaseColumnLock = useCallback((tableId: string, columnId: string) => {
    if (!isConnected) return
    collabService.releaseLock('column', tableId, columnId)
  }, [isConnected])

  // 释放我的所有锁
  const releaseAllMyLocks = useCallback(() => {
    if (!isConnected) return
    myLocks.forEach(lock => {
      collabService.releaseLock(lock.lockType, lock.tableId, lock.columnId)
    })
  }, [isConnected, myLocks])

  return {
    // 状态
    locks,
    myLocks,
    isConnected,

    // 查询方法
    getTableLocks,
    getColumnLocks,
    isTableLocked,
    isColumnLocked,
    amIHoldingTableLock,
    amIHoldingColumnLock,

    // 操作方法
    requestTableLock,
    requestColumnLock,
    releaseTableLock,
    releaseColumnLock,
    releaseAllMyLocks
  }
}
