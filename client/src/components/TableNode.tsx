import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Table } from '../types'
import { DeleteOutlined, CommentOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

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
        flexDirection: 'column',
        fontWeight: 'bold',
        fontSize: headerFontSize
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{table.name}</span>
          <DeleteOutlined
            style={{ cursor: 'pointer', fontSize: tagFontSize }}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(table.id)
            }}
          />
        </div>
        {table.comment && (
          <div style={{
            fontSize: compactMode ? '9px' : '11px',
            fontWeight: 'normal',
            opacity: 0.9,
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {table.comment}
          </div>
        )}
      </div>

      <div style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
        {(table.columns || []).map(column => (
          <div key={column.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: rowPadding,
            borderBottom: '1px solid #f0f0f0',
            gap: '4px',
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
            {column.comment && (
              <span
                title={column.comment}
                style={{
                  color: '#1890ff',
                  fontSize: tagFontSize,
                  cursor: 'pointer'
                }}
              >
                <CommentOutlined />
              </span>
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
