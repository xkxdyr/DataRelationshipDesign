import React from 'react'
import { UsergroupAddOutlined, UserOutlined } from '@ant-design/icons'
import { Tooltip, Badge } from 'antd'
import { useCollab } from '../providers/CollabProvider'

interface CollabUsersProps {
  className?: string
}

export function CollabUsers({ className }: CollabUsersProps) {
  const { isConnected, onlineUsers, startCollaboration, stopCollaboration } = useCollab()

  const toggleConnection = async () => {
    if (isConnected) {
      stopCollaboration()
    } else {
      await startCollaboration()
    }
  }

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Tooltip title={isConnected ? '断开协作连接' : '开启协作模式'}>
        <Badge dot={isConnected} offset={[-2, 2]}>
          <button
            onClick={toggleConnection}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: isConnected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
              fontSize: 14
            }}
          >
            <UsergroupAddOutlined />
            {isConnected && onlineUsers.length > 0 && (
              <span style={{ fontSize: 12 }}>{onlineUsers.length}</span>
            )}
          </button>
        </Badge>
      </Tooltip>

      {isConnected && onlineUsers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onlineUsers.map(user => (
            <Tooltip key={user.id} title={user.name}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: user.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              >
                <UserOutlined />
              </div>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  )
}
