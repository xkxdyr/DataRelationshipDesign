import React from 'react'
import { Switch, Tooltip, Typography } from 'antd'
import { DatabaseOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

const { Text } = Typography

export const ModeSwitch: React.FC = () => {
  const { isLocalMode, setLocalMode, isOnline } = useAppStore()

  const handleChange = (checked: boolean) => {
    setLocalMode(checked)
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