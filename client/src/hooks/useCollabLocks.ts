import { useState, useEffect, useCallback, useRef } from 'react'
import { collabManager, LockInfo, LockDeniedData, CollabState, LockType } from '../services/collabManager'
import { message } from 'antd'

const RENEW_INTERVAL_MS = 60 * 1000

export function useCollabLocks() {
  const [locks, setLocks] = useState<LockInfo[]>([])
  const [myLocks, setMyLocks] = useState<LockInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const renewalTimersRef = useRef<Map<string, number>>(new Map())

  const startRenewalTimer = useCallback((lockId: string) => {
    if (renewalTimersRef.current.has(lockId)) return
    const timerId = window.setInterval(() => {
      collabManager.sendLockRenewal(lockId)
    }, RENEW_INTERVAL_MS)
    renewalTimersRef.current.set(lockId, timerId)
  }, [])

  const stopRenewalTimer = useCallback((lockId: string) => {
    const timerId = renewalTimersRef.current.get(lockId)
    if (timerId) {
      clearInterval(timerId)
      renewalTimersRef.current.delete(lockId)
    }
  }, [])

  const stopAllRenewalTimers = useCallback(() => {
    renewalTimersRef.current.forEach(timerId => clearInterval(timerId))
    renewalTimersRef.current.clear()
  }, [])

  useEffect(() => {
    const unsubscribeState = collabManager.onStateChange((state) => {
      setIsConnected(state === CollabState.READY)
    })

    const unsubscribeLockState = collabManager.onLockState((newLocks) => {
      setLocks(newLocks)
      setMyLocks(collabManager.getMyLocks())
    })

    const unsubscribeLockGranted = collabManager.onLockGranted((lock) => {
      setLocks(collabManager.getLocks())
      setMyLocks(collabManager.getMyLocks())
      startRenewalTimer(lock.lockId)
    })

    const unsubscribeLockDenied = collabManager.onLockDenied((data) => {
      console.warn('[useCollabLocks] 锁获取失败:', data.reason)
      message.warning(data.reason)
    })

    const unsubscribeLockTimeout = collabManager.onLockTimeout((data) => {
      const resourceDesc = data.lockType === 'table' ? '表' : '字段'
      message.warning(`您的${resourceDesc}锁已超时`)
      stopRenewalTimer(data.lockId)
      setLocks(collabManager.getLocks())
      setMyLocks(collabManager.getMyLocks())
    })

    setIsConnected(collabManager.getState() === CollabState.READY)
    setLocks(collabManager.getLocks())
    setMyLocks(collabManager.getMyLocks())

    return () => {
      unsubscribeState()
      unsubscribeLockState()
      unsubscribeLockGranted()
      unsubscribeLockDenied()
      unsubscribeLockTimeout()
      stopAllRenewalTimers()
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
    const currentMyLocks = collabManager.getMyLocks()
    const lock = currentMyLocks.find(l => l.tableId === tableId && l.lockType === 'table')
    if (lock) {
      stopRenewalTimer(lock.lockId)
    }
    collabManager.releaseLock('table', tableId)
  }, [isConnected, stopRenewalTimer])

  const releaseColumnLock = useCallback((tableId: string, columnId: string) => {
    if (!isConnected) return
    const currentMyLocks = collabManager.getMyLocks()
    const lock = currentMyLocks.find(l => l.tableId === tableId && l.columnId === columnId && l.lockType === 'column')
    if (lock) {
      stopRenewalTimer(lock.lockId)
    }
    collabManager.releaseLock('column', tableId, columnId)
  }, [isConnected, stopRenewalTimer])

  const releaseAllMyLocks = useCallback(() => {
    if (!isConnected) return
    stopAllRenewalTimers()
    collabManager.releaseAllMyLocks()
  }, [isConnected, stopAllRenewalTimers])

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