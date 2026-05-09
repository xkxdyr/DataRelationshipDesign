import React from 'react'
import { Switch, Tooltip, Typography, Modal, message } from 'antd'
import { DatabaseOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

const { Text } = Typography

export const ModeSwitch: React.FC = () => {
  const { isLocalMode, setLocalMode, isOnline, syncAllToServer } = useAppStore()

  const handleChange = (checked: boolean) => {
    if (checked) {
      Modal.confirm({
        title: '切换到本地模式',
        content: '切换后数据将仅存储在本地浏览器中，不会实时同步到服务器。是否继续？',
        okText: '确认切换',
        cancelText: '取消',
        onOk: () => {
          setLocalMode(true)
          message.success('已切换到本地模式')
        }
      })
    } else {
      if (!isOnline) {
        message.warning('当前网络离线，无法切换到在线模式')
        return
      }

      Modal.confirm({
        title: '切换到在线模式',
        content: '切换后将同步本地数据到服务器。是否继续？',
        okText: '确认切换',
        cancelText: '取消',
        onOk: async () => {
          setLocalMode(false)
          try {
            const result = await syncAllToServer()
            if (result) {
              if (result.failed > 0) {
                message.warning(`已切换到在线模式，成功同步 ${result.success}/${result.total} 项，失败 ${result.failed} 项`)
              } else if (result.success > 0) {
                message.success(`已切换到在线模式，成功同步 ${result.success} 项`)
              } else {
                message.success('已切换到在线模式，无待同步数据')
              }
            }
          } catch (error) {
            console.error('同步失败:', error)
            message.warning('已切换到在线模式，但同步过程出错')
          }
        }
      })
    }
  }

  return (
    <Tooltip
      title={
        isLocalMode
          ? '本地模式：所有数据仅存储在浏览器本地'
          : '在线模式：数据同步到服务器'
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Switch
          checked={isLocalMode}
          onChange={handleChange}
          checkedChildren="本地"
          unCheckedChildren="在线"
          disabled={!isOnline && !isLocalMode}
        />
      </div>
    </Tooltip>
  )
}

export default ModeSwitch