import React, { useEffect, useState } from 'react'
import { Modal, List, Tag, Button, Empty, Spin, message, Tooltip } from 'antd'
import { ClockCircleOutlined, DeleteOutlined, ReloadOutlined, CloudSyncOutlined, DatabaseOutlined, CloudOutlined, TableOutlined, AppstoreOutlined, LinkOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { localStorageService } from '../services/localStorageService'

interface SyncQueueModalProps {
  visible: boolean
  onClose: () => void
}

const entityNames: Record<string, string> = {
  project: '项目',
  table: '表',
  column: '列',
  relationship: '关系',
  index: '索引',
  version: '版本'
}

const typeNames: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除'
}

const typeColors: Record<string, string> = {
  create: 'success',
  update: 'warning',
  delete: 'error'
}

const entityIcons: Record<string, React.ReactNode> = {
  project: <DatabaseOutlined />,
  table: <TableOutlined />,
  column: <AppstoreOutlined />,
  relationship: <LinkOutlined />,
  index: <DatabaseOutlined />,
  version: <ReloadOutlined />
}

const SyncQueueModal: React.FC<SyncQueueModalProps> = ({ visible, onClose }) => {
  const { isOnline, isSyncing, syncToServer, refreshSyncQueueCount } = useAppStore()
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadQueue = async () => {
    setLoading(true)
    try {
      const q = await localStorageService.getSyncQueue()
      setQueue(q)
    } catch (error) {
      console.error('Failed to load sync queue:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (visible) {
      loadQueue()
    }
  }, [visible])

  const handleSync = async () => {
    if (!isOnline) {
      message.warning('当前离线，无法同步')
      return
    }
    try {
      const result = await syncToServer()
      if (result.success > 0) {
        message.success(`成功同步 ${result.success} 项`)
      }
      if (result.failed > 0) {
        message.warning(`同步失败 ${result.failed} 项`)
      }
      await loadQueue()
      await refreshSyncQueueCount()
    } catch (error) {
      message.error('同步失败')
    }
  }

  const handleClear = async () => {
    try {
      await localStorageService.clearSyncQueue()
      setQueue([])
      await refreshSyncQueueCount()
      message.success('已清空同步队列')
    } catch (error) {
      message.error('清空失败')
    }
  }

  const handleDeleteItem = async (id: number) => {
    try {
      await localStorageService.removeSyncQueueItem(id)
      await loadQueue()
      await refreshSyncQueueCount()
      message.success('已删除')
    } catch (error) {
      message.error('删除失败')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  }

  const renderItem = (item: any) => (
    <List.Item
      actions={[
        <Tooltip title="删除" key="delete">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(item.id)}
          />
        </Tooltip>
      ]}
    >
      <List.Item.Meta
        avatar={entityIcons[item.entity] || <CloudOutlined />}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={typeColors[item.type]}>
              {typeNames[item.type]}
            </Tag>
            <span>{entityNames[item.entity] || item.entity}</span>
          </span>
        }
        description={
          <span style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--theme-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ClockCircleOutlined />
              {formatTime(item.timestamp)}
            </span>
            <span>ID: {item.entityId}</span>
          </span>
        }
      />
    </List.Item>
  )

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudSyncOutlined />
          待同步事项
          {queue.length > 0 && (
            <Tag color="blue">{queue.length} 项</Tag>
          )}
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="clear" danger onClick={handleClear} disabled={queue.length === 0}>
          清空队列
        </Button>,
        <Button key="sync" type="primary" onClick={handleSync} loading={isSyncing} disabled={!isOnline || queue.length === 0} icon={<CloudSyncOutlined />}>
          {isOnline ? '立即同步' : '离线中'}
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        {queue.length === 0 ? (
          <Empty description="暂无待同步事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={queue}
            renderItem={renderItem}
            bordered
            style={{ maxHeight: 400, overflow: 'auto' }}
          />
        )}
      </Spin>
    </Modal>
  )
}

export default SyncQueueModal
