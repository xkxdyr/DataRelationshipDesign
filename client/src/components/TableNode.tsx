import React, { useState, useRef } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Table } from '../types'
import { DeleteOutlined, LockOutlined, UserOutlined, EditOutlined, CopyOutlined, ScissorOutlined, SnippetsOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useCollabLocks } from '../hooks/useCollabLocks'
import { Modal, message, Tooltip, Dropdown, Input, Select } from 'antd'

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
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editColumnNameValue, setEditColumnNameValue] = useState('')
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null)
  const [editingDataTypeId, setEditingDataTypeId] = useState<string | null>(null)
  const nameInputRef = useRef<any>(null)
  const columnInputRef = useRef<any>(null)

  const updateTable = useAppStore(state => state.updateTable)
  const updateColumn = useAppStore(state => state.updateColumn)
  const copyTable = useAppStore(state => state.copyTable)
  const pasteTable = useAppStore(state => state.pasteTable)
  const copiedTable = useAppStore(state => state.copiedTable)
  const createColumn = useAppStore(state => state.createColumn)
  const deleteColumn = useAppStore(state => state.deleteColumn)

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    setContextMenuPos(null)
    switch (key) {
      case 'edit':
        onEdit(table.id)
        break
      case 'copyTable':
        copyTable(table.id)
        message.success(`已复制表 "${table.name}"（含列和索引）`)
        break
      case 'pasteTable':
        pasteTable()
        message.info('正在粘贴表...')
        break
      case 'delete':
        onDelete(table.id)
        break
      case 'copyName':
        navigator.clipboard.writeText(table.name).then(() => message.success('已复制表名')).catch(() => message.error('复制失败'))
        break
      case 'copyId':
        navigator.clipboard.writeText(table.id).then(() => message.success('已复制表ID')).catch(() => message.error('复制失败'))
        break
    }
  }

  const handleDoubleClickName = (e: React.MouseEvent) => {
    if (tableLock) return
    e.stopPropagation()
    setEditNameValue(table.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleNameSave = () => {
    const trimmed = editNameValue.trim()
    if (!trimmed || trimmed === table.name) {
      setEditingName(false)
      return
    }
    updateTable(table.id, { name: trimmed })
    setEditingName(false)
    message.success('表名已更新')
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave()
    if (e.key === 'Escape') { setEditingName(false); e.stopPropagation() }
  }

  const handleDoubleClickColumnName = (e: React.MouseEvent, columnId: string, columnName: string) => {
    if (tableLock || isColumnLocked(table.id, columnId)) return
    e.stopPropagation()
    setEditColumnNameValue(columnName)
    setEditingColumnId(columnId)
    setTimeout(() => columnInputRef.current?.focus(), 0)
  }

  const handleColumnNameSave = async () => {
    if (!editingColumnId) return
    const trimmed = editColumnNameValue.trim()
    if (!trimmed) {
      setEditingColumnId(null)
      return
    }
    await updateColumn(editingColumnId, { name: trimmed })
    setEditingColumnId(null)
    message.success('列名已更新')
  }

  const handleColumnNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleColumnNameSave()
    if (e.key === 'Escape') { setEditingColumnId(null); e.stopPropagation() }
  }

  const SQL_DATA_TYPES = [
    'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
    'VARCHAR', 'CHAR', 'TEXT', 'NVARCHAR',
    'BOOLEAN', 'FLOAT', 'DOUBLE', 'DECIMAL',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'BLOB', 'JSON'
  ]

  const handleDataTypeChange = async (columnId: string, dataType: string) => {
    setEditingDataTypeId(null)
    await updateColumn(columnId, { dataType })
    message.success(`数据类型已更新为 ${dataType}`)
  }

  const handleToggleColumnProp = async (columnId: string, prop: 'primaryKey' | 'unique' | 'nullable') => {
    const column = table.columns.find(c => c.id === columnId)
    if (!column) return
    if (prop === 'nullable') {
      await updateColumn(columnId, { nullable: !column.nullable })
      message.success(column.nullable ? '已设为 NOT NULL' : '已设为 可空')
    } else {
      await updateColumn(columnId, { [prop]: !column[prop] })
      const labels: Record<string, [string, string]> = {
        primaryKey: ['主键', '主键已移除'],
        unique: ['唯一键', '唯一键已移除']
      }
      message.success(column[prop] ? labels[prop][1] : labels[prop][0])
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

  const tooltipTitle = (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{table.name}</div>
      <div style={{ fontSize: 11, color: '#666', lineHeight: '18px' }}>
        <div>📊 列数: {table.columns.length}</div>
        <div>🔑 主键: {table.columns.filter(c => c.primaryKey).map(c => c.name).join(', ') || '(无)'}</div>
        <div>📇 索引: {table.indexes.length} 个</div>
        <div>📝 注释: {table.comment || '(无)'}</div>
        {tableLock && (
          <div style={{ color: '#fa8c16', marginTop: 4 }}>🔒 已锁定 - {formatLockTime(tableLock.acquiredAt)}</div>
        )}
      </div>
    </div>
  )

  const contextMenuItems = [
    { key: 'edit', label: '编辑表', icon: <EditOutlined />, disabled: !!tableLock },
    { type: 'divider' as const },
    { key: 'copyTable', label: '复制表 (含列和索引)', icon: <CopyOutlined /> },
    { key: 'pasteTable', label: copiedTable ? `粘贴表 "${copiedTable.name}"` : '粘贴表', icon: <SnippetsOutlined />, disabled: !copiedTable },
    { type: 'divider' as const },
    { key: 'copyName', label: '复制表名', icon: <CopyOutlined /> },
    { key: 'copyId', label: '复制表ID', icon: <ScissorOutlined /> },
    { type: 'divider' as const },
    { key: 'delete', label: '删除表', icon: <DeleteOutlined />, danger: true, disabled: !!tableLock }
  ]

  return (
    <>
    <Tooltip
      title={tooltipTitle}
      placement="right"
      mouseEnterDelay={0.5}
      styles={{ root: { maxWidth: 280 } }}
    >
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
        onContextMenu={handleContextMenu}
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
          {editingName ? (
            <Input
              ref={nameInputRef}
              size="small"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: headerFontSize, height: 22, padding: '0 4px' }}
            />
          ) : (
            <span 
              style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                cursor: tableLock ? 'default' : 'text'
              }}
              onDoubleClick={handleDoubleClickName}
              title="双击编辑表名"
            >{table.name}</span>
          )}
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
              background: columnLock ? '#fff2f0' : (hoveredColumnId === column.id ? '#fafafa' : 'transparent'),
              cursor: columnLock ? 'not-allowed' : 'default'
            }}
            onMouseEnter={() => setHoveredColumnId(column.id)}
            onMouseLeave={() => setHoveredColumnId(null)}
            onClick={(e) => {
              if (columnLock) {
                e.stopPropagation()
                message.warning(`${columnLock.userName} 正在编辑该字段`)
              }
            }}
            >
              {column.primaryKey && (
                <Tooltip title={tableLock || columnLock ? '' : '点击移除主键'}>
                  <span style={{
                    fontSize: tagFontSize,
                    padding: '0 2px',
                    background: '#52c41a',
                    color: '#fff',
                    borderRadius: '2px',
                    cursor: (tableLock || columnLock) ? 'default' : 'pointer',
                    opacity: (tableLock || columnLock) ? 0.7 : 1
                  }}
                  onClick={(e) => {
                    if (tableLock || columnLock) return
                    e.stopPropagation()
                    handleToggleColumnProp(column.id, 'primaryKey')
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  >PK</span>
                </Tooltip>
              )}
              {column.unique && !column.primaryKey && (
                <Tooltip title={tableLock || columnLock ? '' : '点击移除唯一键'}>
                  <span style={{
                    fontSize: tagFontSize,
                    padding: '0 2px',
                    background: '#faad14',
                    color: '#fff',
                    borderRadius: '2px',
                    cursor: (tableLock || columnLock) ? 'default' : 'pointer',
                    opacity: (tableLock || columnLock) ? 0.7 : 1
                  }}
                  onClick={(e) => {
                    if (tableLock || columnLock) return
                    e.stopPropagation()
                    handleToggleColumnProp(column.id, 'unique')
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  >UQ</span>
                </Tooltip>
              )}
              {!column.primaryKey && !column.unique && !tableLock && !columnLock && hoveredColumnId === column.id && (
                <span style={{
                  fontSize: tagFontSize,
                  padding: '0 2px',
                  color: '#999',
                  borderRadius: '2px',
                  border: '1px dashed #d9d9d9',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleColumnProp(column.id, 'primaryKey')
                }}
                onMouseDown={(e) => e.stopPropagation()}
                >+PK</span>
              )}
              {column.autoIncrement && (
                <span style={{
                  fontSize: tagFontSize,
                  padding: '0 2px',
                  background: '#1677ff',
                  color: '#fff',
                  borderRadius: '2px'
                }}>AI</span>
              )}
              {editingColumnId === column.id ? (
                <Input
                  ref={editingColumnId === column.id ? columnInputRef : undefined}
                  size="small"
                  value={editColumnNameValue}
                  onChange={(e) => setEditColumnNameValue(e.target.value)}
                  onBlur={handleColumnNameSave}
                  onKeyDown={handleColumnNameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ flex: 1, height: 22, padding: '0 4px', fontSize: rowFontSize }}
                />
              ) : (
                <span
                  style={{ flex: 1, fontWeight: '500', fontSize: rowFontSize, cursor: (tableLock || columnLock) ? 'default' : 'text' }}
                  onDoubleClick={(e) => handleDoubleClickColumnName(e, column.id, column.name)}
                  title="双击编辑列名"
                >{column.name}</span>
              )}
              <span style={{
                color: '#666',
                fontSize: dataTypeFontSize,
                fontFamily: 'monospace',
                cursor: (tableLock || columnLock) ? 'default' : 'pointer',
                padding: '0 2px',
                borderRadius: 2
              }}
              onClick={(e) => {
                if (tableLock || columnLock) return
                e.stopPropagation()
                setEditingDataTypeId(column.id)
              }}
              title={tableLock || columnLock ? '' : '点击修改数据类型'}
              >
                {editingDataTypeId === column.id ? (
                  <Select
                    size="small"
                    defaultValue={column.dataType.toUpperCase()}
                    dropdownMatchSelectWidth={false}
                    autoFocus
                    onBlur={() => setEditingDataTypeId(null)}
                    onChange={(value) => handleDataTypeChange(column.id, value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ width: 80, fontSize: dataTypeFontSize }}
                    options={SQL_DATA_TYPES.map(dt => ({ label: dt, value: dt }))}
                  />
                ) : (
                  column.dataType.toUpperCase()
                )}
              </span>
              {column.nullable ? (
                <Tooltip title={tableLock || columnLock ? '' : '点击设为 NOT NULL'}>
                  <span style={{
                    color: '#999',
                    fontSize: tagFontSize,
                    cursor: (tableLock || columnLock) ? 'default' : 'pointer',
                    padding: '0 2px'
                  }}
                  onClick={(e) => {
                    if (tableLock || columnLock) return
                    e.stopPropagation()
                    handleToggleColumnProp(column.id, 'nullable')
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  >?</span>
                </Tooltip>
              ) : (
                !tableLock && !columnLock && hoveredColumnId === column.id && (
                  <Tooltip title="点击设为可空">
                    <span style={{
                      color: '#bbb',
                      fontSize: tagFontSize,
                      cursor: 'pointer',
                      padding: '0 2px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleColumnProp(column.id, 'nullable')
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    >NN</span>
                  </Tooltip>
                )
              )}
              {columnLock && (
                <Tooltip title={`${columnLock.userName} 正在编辑此字段`}>
                  <LockOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                </Tooltip>
              )}
              {column.comment && (
                <Tooltip title={column.comment}>
                  <InfoCircleOutlined style={{ color: '#1677ff', fontSize: tagFontSize, cursor: 'help' }} />
                </Tooltip>
              )}
              {!tableLock && !columnLock && hoveredColumnId === column.id && (
                <Tooltip title="删除列">
                  <DeleteOutlined
                    style={{ color: '#999', cursor: 'pointer', fontSize: tagFontSize }}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteColumn(column.id)
                      message.success(`列 "${column.name}" 已删除`)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
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
        {!tableLock && (
          <div style={{
            padding: rowPadding,
            borderTop: '1px solid #f0f0f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: rowFontSize,
            color: '#999',
            background: '#fafafa'
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = themeColor; (e.currentTarget as HTMLDivElement).style.background = '#e6f7ff' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = '#999'; (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
          onClick={(e) => {
            e.stopPropagation()
            createColumn(table.id, {
              name: '新列',
              dataType: 'VARCHAR',
              nullable: true,
              order: table.columns.length
            })
            message.success('已添加新列')
          }}
          >
            <PlusOutlined />
            <span>添加列</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
    </Tooltip>
    {contextMenuPos && (
      <Dropdown
        menu={{ items: contextMenuItems, onClick: handleMenuClick }}
        open={true}
        onOpenChange={(open) => !open && setContextMenuPos(null)}
      >
        <span style={{
          position: 'fixed',
          left: contextMenuPos.x,
          top: contextMenuPos.y,
          width: 0,
          height: 0
        }} />
      </Dropdown>
    )}
    </>
  )
}

export default TableNode
