import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Table } from '../types'
import { DeleteOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useCollabLocks } from '../hooks/useCollabLocks'
import { Modal, message, Tooltip } from 'antd'

interface TableNodeData {
  table: Table
  onEdit: (tableId: string | null) => void
  onDelete: (tableId: string) => void
}

const TableNode: React.FC<NodeProps<TableNodeData>> = ({ data, selected }) => {
  const { table, onEdit, onDelete } = data
  const compactMode = useAppStore(state => state.compactMode)
  const themeColor = useAppStore(state => state.themeColor)
  const { isTableLocked, isColumnLocked, amIHoldingTableLock, requestTableLock, releaseTableLock, isConnected } = useCollabLocks()

  const tableLock = isTableLocked(table.id)
  const holdingTableLock = amIHoldingTableLock(table.id)

  const nodeWidth = compactMode ? '220px' : '280px'
  const headerPadding = compactMode ? '4px 8px' : '8px 12px'
  const headerFontSize = compactMode ? '12px' : '14px'
  const rowPadding = compactMode ? '3px 8px' : '6px 12px'
  const rowFontSize = compactMode ? '11px' : '13px'
  const tagFontSize = compactMode ? '10px' : '12px'
  const dataTypeFontSize = compactMode ? '10px' : '12px'
  const maxHeight = compactMode ? '200px' : '300px'

  const getTableBorderColor = () => {
    if (holdingTableLock) return '#52c41a'
    if (tableLock) return '#ff4d4f'
    return selected ? themeColor : '#ddd'
  }

  const getHeaderBackground = () => {
    if (holdingTableLock) return '#52c41a'
    if (tableLock) return '#ff4d4f'
    return themeColor
  }

  const handleTableClick = (e: React.MouseEvent) => {
    if (tableLock) {
      e.stopPropagation()
      message.warning(`${tableLock.userName} 正在编辑该表`)
    }
  }

  const formatLockTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    return `${hours}小时前`
  }

  return (
    <div 
      style={{
        border: selected ? `2px solid ${getTableBorderColor()}` : `1px solid ${getTableBorderColor()}`,
        borderRadius: '4px',
        background: '#fff',
        width: nodeWidth,
        boxShadow: tableLock 
          ? `0 2px 8px rgba(255,77,79,0.3)` 
          : selected 
            ? `0 2px 8px rgba(24,144,255,0.2)` 
            : '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative'
      }}
      onClick={handleTableClick}
    >
      <Handle type="target" position={Position.Top} />

      <div style={{
        background: getHeaderBackground(),
        color: '#fff',
        padding: headerPadding,
        borderRadius: '4px 4px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: headerFontSize
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          {tableLock && (
            <Tooltip title={`${tableLock.userName} 正在编辑此表 (${formatLockTime(tableLock.acquiredAt)})`}>
              <LockOutlined style={{ fontSize: tagFontSize, animation: 'pulse 1.5s infinite' }} />
            </Tooltip>
          )}
          {holdingTableLock && (
            <Tooltip title="您正在编辑此表">
              <LockOutlined style={{ fontSize: tagFontSize }} />
            </Tooltip>
          )}
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap'
          }}>{table.name}</span>
        </div>
        <DeleteOutlined
          style={{ 
            cursor: tableLock ? 'not-allowed' : 'pointer', 
            fontSize: tagFontSize,
            opacity: tableLock ? 0.5 : 1
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (tableLock) {
              message.warning(`${tableLock.userName} 正在编辑该表`)
              return
            }
            Modal.confirm({
              title: '确认删除',
              content: `您确定要删除表「${table.name}」吗？此操作不可撤销。`,
              okText: '确定删除',
              cancelText: '取消',
              okType: 'danger',
              onOk: async () => {
                await onDelete(table.id)
                message.success('表已删除')
              }
            })
          }}
        />
      </div>

      {tableLock && (
        <div style={{
          background: '#fff2f0',
          borderBottom: '1px solid #ffccc7',
          padding: '4px 8px',
          fontSize: '11px',
          color: '#cf1322',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <UserOutlined />
          <span style={{ fontWeight: 500 }}>{tableLock.userName}</span>
          <span>正在编辑</span>
        </div>
      )}

      <div style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
        {(table.columns || []).map(column => {
          const columnLock = isColumnLocked(table.id, column.id)
          return (
            <div key={column.id} style={{
              display: 'flex',
              alignItems: 'center',
              padding: rowPadding,
              borderBottom: '1px solid #f0f0f0',
              gap: '8px',
              fontSize: rowFontSize,
              background: columnLock ? '#fff2f0' : 'transparent',
              cursor: columnLock ? 'not-allowed' : 'default'
            }}
            onClick={(e) => {
              if (columnLock) {
                e.stopPropagation()
                message.warning(`${columnLock.userName} 正在编辑该字段`)
              }
            }}
            >
              {column.primaryKey && (
                <span style={{
                  fontSize: tagFontSize,
                  padding: '0 2px',
                  background: '#52c41a',
                  color: '#fff',
                  borderRadius: '2px'
                }}>PK</span>
              )}
              {column.unique && !column.primaryKey && (
                <span style={{
                  fontSize: tagFontSize,
                  padding: '0 2px',
                  background: '#faad14',
                  color: '#fff',
                  borderRadius: '2px'
                }}>UQ</span>
              )}
              <span style={{ flex: 1, fontWeight: '500', fontSize: rowFontSize }}>{column.name}</span>
              <span style={{
                color: '#666',
                fontSize: dataTypeFontSize,
                fontFamily: 'monospace'
              }}>
                {column.dataType.toUpperCase()}
              </span>
              {column.nullable && (
                <span style={{
                  color: '#999',
                  fontSize: tagFontSize
                }}>?</span>
              )}
              {columnLock && (
                <Tooltip title={`${columnLock.userName} 正在编辑此字段`}>
                  <LockOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                </Tooltip>
              )}
            </div>
          )
        })}
        {(table.columns || []).length === 0 && (
          <div style={{
            padding: '12px',
            textAlign: 'center',
            color: '#999',
            fontSize: rowFontSize
          }}>
            暂无列
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default TableNode
