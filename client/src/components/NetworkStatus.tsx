import React from 'react'
import { Alert } from 'antd'
import { DisconnectOutlined, WifiOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

export const OfflineNotice: React.FC = () => {
  const { isOnline, isLocalMode } = useAppStore()
  const [collapsed, setCollapsed] = React.useState(false)

  if (isOnline) {
    return null
  }

  return (
    <Alert
      message={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DisconnectOutlined />
          当前网络离线
        </span>
      }
      description={collapsed ? null : (
        isLocalMode
          ? '本地模式：继续使用，数据将保存在本地'
          : '请检查网络连接，或切换到本地模式继续使用'
      )}
      type="warning"
      showIcon
      closable
      onClose={() => setCollapsed(true)}
      style={{
        borderLeft: 'none',
        borderRight: 'none',
        borderRadius: 0,
        padding: collapsed ? '4px 16px' : undefined
      }}
    />
  )
}

export const OnlineNotice: React.FC = () => {
  const { isOnline, isLocalMode } = useAppStore()
  const [wasOffline, setWasOffline] = React.useState(false)
  const [showReconnected, setShowReconnected] = React.useState(false)

  React.useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline && isOnline) {
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (!showReconnected) {
    return null
  }

  return (
    <Alert
      message={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WifiOutlined />
          网络已恢复连接
        </span>
      }
      description={
        isLocalMode
          ? '可以切换到在线模式同步数据'
          : '数据将自动同步到服务器'
      }
      type="success"
      showIcon
      closable
      style={{
        borderLeft: 'none',
        borderRight: 'none',
        borderRadius: 0
      }}
    />
  )
}

export const NetworkStatus: React.FC = () => {
  return (
    <>
      <OnlineNotice />
      <OfflineNotice />
    </>
  )
}

export default NetworkStatus