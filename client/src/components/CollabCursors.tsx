import React from 'react'
import { useStore } from 'reactflow'
import { useCollab } from '../providers/CollabProvider'

const CollabCursors: React.FC = () => {
  const { onlineUsers } = useCollab()
  const transform = useStore(state => state.transform)
  // transform = [tx, ty, zoom]  — ReactFlow 内部 viewport 变换参数

  const remoteUsers = onlineUsers.filter(u => u.cursor)

  return (
    <>
      {remoteUsers.map(user => {
        // 将 flow 坐标转换为屏幕坐标，使光标随画布平移/缩放移动
        const screenX = user.cursor!.x * transform[2] + transform[0]
        const screenY = user.cursor!.y * transform[2] + transform[1]
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
              background: 'rgba(255,255,255,0.85)'
            }}>
              {user.name}
            </span>
          </div>
        )
      })}
    </>
  )
}

export default CollabCursors