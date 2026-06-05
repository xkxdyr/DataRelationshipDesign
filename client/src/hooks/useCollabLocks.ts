import { useState, useEffect, useCallback } from 'react'
import { collabManager, LockInfo, LockDeniedData, CollabState } from '../services/collabManager'
import { message } from 'antd'

export function useCollabLocks() {
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [myLocks, setMyLocks] = useState<LockInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const unsubscribeState = collabManager.onStateChange((state) => {
      setIsConnected(state === CollabState.READY)
    })

    const unsubscribeLockState = collabManager.onLockState((newLocks) => {
      setLocks(newLocks)
      setMyLocks(collabManager.getMyLocks())
    })

    const unsubscribeLockGranted = collabManager.onLockGranted((_lock) => {
      setLocks(collabManager.getLocks())
      setMyLocks(collabManager.getMyLocks())
    })

    const unsubscribeLockDenied = collabManager.onLockDenied((data) => {
      console.warn('[useCollabLocks] 锁获取失败:', data.reason)
      message.warning(data.reason)
    })

    setIsConnected(collabManager.getState() === CollabState.READY)
    setLocks(collabManager.getLocks())
    setMyLocks(collabManager.getMyLocks())

    return () => {
      unsubscribeState()
      unsubscribeLockState()
      unsubscribeLockGranted()
      unsubscribeLockDenied()
    }
  }, [])

  const getTableLocks = useCallback((tableId: string): LockInfo[] => {
    return collabManager.getTableLocks(tableId)
  }, [])

  const getColumnLocks = useCallback((tableId: string, columnId: string): LockInfo[] => {
    return collabManager.getColumnLocks(tableId, columnId)
  }, [])

  const isTableLocked = useCallback((tableId: string): LockInfo | undefined => {
    return collabManager.isTableLocked(tableId)
  }, [])

  const isColumnLocked = useCallback((tableId: string, columnId: string): LockInfo | undefined => {
    return collabManager.isColumnLocked(tableId, columnId)
  }, [])

  const amIHoldingTableLock = useCallback((tableId: string): boolean => {
    return collabManager.amIHoldingTableLock(tableId)
  }, [])

  const amIHoldingColumnLock = useCallback((tableId: string, columnId: string): boolean => {
    return collabManager.amIHoldingColumnLock(tableId, columnId)
  }, [])

  const requestTableLock = useCallback((tableId: string) => {
    if (!isConnected) {
      console.warn('[useCollabLocks] 未连接，无法请求锁')
      return
    }
    collabManager.acquireLock('table', tableId)
  }, [isConnected])

  const requestColumnLock = useCallback((tableId: string, columnId: string) => {
    if (!isConnected) {
      console.warn('[useCollabLocks] 未连接，无法请求锁')
      return
    }
    collabManager.acquireLock('column', tableId, columnId)
  }, [isConnected])

  const releaseTableLock = useCallback((tableId: string) => {
    if (!isConnected) return
    collabManager.releaseLock('table', tableId)
  }, [isConnected])

  const releaseColumnLock = useCallback((tableId: string, columnId: string) => {
    if (!isConnected) return
    collabManager.releaseLock('column', tableId, columnId)
  }, [isConnected])

  const releaseAllMyLocks = useCallback(() => {
    if (!isConnected) return
    collabManager.releaseAllMyLocks()
  }, [isConnected])

  return {
    locks,
    myLocks,
    isConnected,

    getTableLocks,
    getColumnLocks,
    isTableLocked,
    isColumnLocked,
    amIHoldingTableLock,
    amIHoldingColumnLock,

    requestTableLock,
    requestColumnLock,
    releaseTableLock,
    releaseColumnLock,
    releaseAllMyLocks
  }
}