import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from 'reactflow'
import { useCollab } from '../providers/CollabProvider'
import { useCollabLocks } from '../hooks/useCollabLocks'
import { LockInfo } from '../services/collabManager'

const CURSOR_TIMEOUT_MS = 30_000  // 30秒无活动自动隐藏
const CHECK_INTERVAL_MS = 5_000   // 每5秒检查一次

const CollabCursors: React.FC = () => {
  const { onlineUsers } = useCollab()
  const { locks } = useCollabLocks()
  const transform = useStore(state => state.transform)

  // 追踪每个用户的最后活动时间
  const [lastActiveMap, setLastActiveMap] = useState<Record<string, number>>({})
  const prevCursorRef = useRef<Record<string, { x: number; y: number }>>({})

  const remoteUsers = onlineUsers.filter(u => u.cursor)

  // 当光标位置变化时更新最后活动时间
  useEffect(() => {
    const now = Date.now()
    const updates: Record<string, number> = {}
    let changed = false

    for (const user of remoteUsers) {
      const prev = prevCursorRef.current[user.id]
      const cur = user.cursor!
      if (!prev || prev.x !== cur.x || prev.y !== cur.y) {
        updates[user.id] = now
        changed = true
      }
    }

    if (changed) {
      setLastActiveMap(prev => ({ ...prev, ...updates }))
    }

    // 更新 prev ref
    const next: Record<string, { x: number; y: number }> = {}
    for (const user of remoteUsers) {
      next[user.id] = { x: user.cursor!.x, y: user.cursor!.y }
    }
    prevCursorRef.current = next
  }, [remoteUsers])

  // 定时检查超时光标
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      setLastActiveMap(prev => {
        const next = { ...prev }
        let changed = false
        for (const userId of Object.keys(next)) {
          if (now - next[userId] > CURSOR_TIMEOUT_MS) {
            // 不删除记录，保持 stale 时间戳，渲染时判断隐藏
            if (next[userId] !== 0) {
              next[userId] = 0  // 标记为超时
              changed = true
            }
          }
        }
        return changed ? next : prev
      })
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [])

  // 构建用户ID -> 持有锁的映射
  const userLockMap = useMemo(() => {
    const map: Record<string, LockInfo[]> = {}
    for (const lock of locks) {
      if (!map[lock.userId]) {
        map[lock.userId] = []
      }
      map[lock.userId].push(lock)
    }
    return map
  }, [locks])

  return (
    <>
      {remoteUsers.map(user => {
        const lastActive = lastActiveMap[user.id]
        // 如果从未记录活动时间（首次渲染），默认显示
        // 如果标记为 0，表示已超时，隐藏
        if (lastActive === 0) return null

        const screenX = user.cursor!.x * transform[2] + transform[0]
        const screenY = user.cursor!.y * transform[2] + transform[1]
        const userLocks = userLockMap[user.id]
        const hasLock = userLocks && userLocks.length > 0

        return (
          <div
            key={user.id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              pointerEvents: 'none',
              zIndex: 9999,
              willChange: 'left, top'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              style={{ display: 'block' }}
            >
              <path
                d="M1 1l4.5 12 2.5-5.5L13.5 3 1 1z"
                fill={user.color}
                stroke="#fff"
                strokeWidth="0.8"
              />
            </svg>
            <span style={{
              marginLeft: 4,
              fontSize: 11,
              fontWeight: 500,
              color: user.color,
              textShadow: '0 1px 2px rgba(255,255,255,0.9)',
              whiteSpace: 'nowrap',
              padding: '1px 4px',
              borderRadius: 2,
              background: 'rgba(255,255,255,0.85)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3
            }}>
              {user.name}
              {hasLock && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 16 16"
                  fill={user.color}
                  style={{ flexShrink: 0 }}
                >
                  <path d="M8 1a3 3 0 0 0-3 3v2H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V4a3 3 0 0 0-3-3zm2 5H6V4a2 2 0 1 1 4 0v2z"/>
                </svg>
              )}
            </span>
          </div>
        )
      })}
    </>
  )
}

export default CollabCursors
