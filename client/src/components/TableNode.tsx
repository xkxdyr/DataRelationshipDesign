import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Table } from '../types'
import { DeleteOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { Modal, message } from 'antd'

interface TableNodeData {
  table: Table
  onEdit: (tableId: string | null) => void
  onDelete: (tableId: string) => void
}

const TableNode: React.FC<NodeProps<TableNodeData>> = ({ data, selected }) => {
  const { table, onEdit, onDelete } = data
  const compactMode = useAppStore(state => state.compactMode)
  const themeColor = useAppStore(state => state.themeColor)

  const nodeWidth = compactMode ? '220px' : '280px'
  const headerPadding = compactMode ? '4px 8px' : '8px 12px'
  const headerFontSize = compactMode ? '12px' : '14px'
  const rowPadding = compactMode ? '3px 8px' : '6px 12px'
  const rowFontSize = compactMode ? '11px' : '13px'
  const tagFontSize = compactMode ? '10px' : '12px'
  const dataTypeFontSize = compactMode ? '10px' : '12px'
  const maxHeight = compactMode ? '200px' : '300px'

  return (
    <div style={{
      border: selected ? `2px solid ${themeColor}` : '1px solid #ddd',
      borderRadius: '4px',
      background: '#fff',
      width: nodeWidth,
      boxShadow: selected ? `0 2px 8px rgba(24,144,255,0.2)` : '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <Handle type="target" position={Position.Top} />

      <div style={{
        background: themeColor,
        color: '#fff',
        padding: headerPadding,
        borderRadius: '4px 4px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        fontSize: headerFontSize
      }}>
        <span>{table.name}</span>
        <DeleteOutlined
          style={{ cursor: 'pointer', fontSize: tagFontSize }}
          onClick={(e) => {
            e.stopPropagation()
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

      <div style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
        {(table.columns || []).map(column => (
          <div key={column.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: rowPadding,
            borderBottom: '1px solid #f0f0f0',
            gap: '8px',
            fontSize: rowFontSize
          }}>
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
          </div>
        ))}
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
