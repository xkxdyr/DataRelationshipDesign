import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Table, Column } from '../types'
import { DeleteOutlined, LockOutlined, UserOutlined, EditOutlined, CopyOutlined, ScissorOutlined, SnippetsOutlined, PlusOutlined, InfoCircleOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useCollabLocks } from '../hooks/useCollabLocks'
import { Modal, message, Tooltip, Dropdown, Input, Select } from 'antd'

const COLORS = {
  RED: '#ff4d4f',
  GREEN: '#52c41a',
  YELLOW: '#faad14',
  BLUE: '#1677ff',
  WHITE: '#fff',
  GRAY_999: '#999',
  GRAY_666: '#666',
  GRAY_BBB: '#bbb',
  BORDER: '#f0f0f0',
  BG_FA: '#fafafa',
  BG_E6: '#e6f7ff',
  BG_RED_LIGHT: '#fff2f0',
  BORDER_RED_LIGHT: '#ffccc7',
  TEXT_RED: '#cf1322',
  DEFAULT_BORDER: '#ddd',
}

const TIME_CONSTANTS = {
  MS_PER_MIN: 60000,
  MIN_PER_HOUR: 60,
  HOUR_PER_DAY: 24,
}

const NODE_SIZES = {
  COMPACT_WIDTH: '220px',
  NORMAL_WIDTH: '280px',
  HEADER_PADDING_COMPACT: '4px 8px',
  HEADER_PADDING_NORMAL: '8px 12px',
  HEADER_FONT_COMPACT: '12px',
  HEADER_FONT_NORMAL: '14px',
  ROW_PADDING_COMPACT: '3px 8px',
  ROW_PADDING_NORMAL: '6px 12px',
  ROW_FONT_COMPACT: '11px',
  ROW_FONT_NORMAL: '13px',
  TAG_FONT_COMPACT: '10px',
  TAG_FONT_NORMAL: '12px',
  DT_FONT_COMPACT: '10px',
  DT_FONT_NORMAL: '12px',
  MAX_HEIGHT_COMPACT: '200px',
  MAX_HEIGHT_NORMAL: '300px',
}

const SQL_DATA_TYPES = [
  'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
  'VARCHAR', 'CHAR', 'TEXT', 'NVARCHAR',
  'BOOLEAN', 'FLOAT', 'DOUBLE', 'DECIMAL',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
  'BLOB', 'JSON'
]

const SQL_DATA_TYPE_OPTIONS = SQL_DATA_TYPES.map(dt => ({ label: dt, value: dt }))

function formatLockTime(timestamp?: number) {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / TIME_CONSTANTS.MS_PER_MIN)
  if (minutes < 1) return '刚刚'
  if (minutes < TIME_CONSTANTS.MIN_PER_HOUR) return `${minutes}分钟前`
  const hours = Math.floor(minutes / TIME_CONSTANTS.MIN_PER_HOUR)
  if (hours < TIME_CONSTANTS.HOUR_PER_DAY) return `${hours}小时前`
  const days = Math.floor(hours / TIME_CONSTANTS.HOUR_PER_DAY)
  return `${days}天前`
}

interface CollapsedColumnsProps {
  columns: Table['columns']
  rowPadding: string
  rowFontSize: string
  tagFontSize: string
  dataTypeFontSize: string
}

const CollapsedColumns: React.FC<CollapsedColumnsProps> = React.memo(({ columns, rowPadding, rowFontSize, tagFontSize, dataTypeFontSize }) => {
  const cols = columns || []
  const pkCols = cols.filter(c => c.primaryKey)
  const uqCols = cols.filter(c => c.unique && !c.primaryKey)
  const regularCols = cols.filter(c => !c.primaryKey && !c.unique)
  const previewCols = [...pkCols, ...uqCols, ...regularCols].slice(0, 4)
  const truncated = cols.length > previewCols.length

  if (cols.length === 0) {
    return (
      <div style={{
        padding: rowPadding,
        textAlign: 'center',
        color: COLORS.GRAY_999,
        fontSize: rowFontSize
      }}>
        暂无列
      </div>
    )
  }

  return (
    <div>
      {previewCols.map(col => (
        <div key={col.id} style={{
          display: 'flex',
          alignItems: 'center',
          padding: rowPadding,
          borderBottom: `1px solid ${COLORS.BORDER}`,
          gap: 6,
          fontSize: rowFontSize
        }}>
          {col.primaryKey && (
            <span style={{
              fontSize: tagFontSize,
              padding: '0 2px',
              background: COLORS.GREEN,
              color: COLORS.WHITE,
              borderRadius: '2px',
              minWidth: 20,
              textAlign: 'center'
            }}>PK</span>
          )}
          {col.unique && !col.primaryKey && (
            <span style={{
              fontSize: tagFontSize,
              padding: '0 2px',
              background: COLORS.YELLOW,
              color: COLORS.WHITE,
              borderRadius: '2px',
              minWidth: 20,
              textAlign: 'center'
            }}>UQ</span>
          )}
          {col.autoIncrement && (
            <span style={{
              fontSize: tagFontSize,
              padding: '0 2px',
              background: COLORS.BLUE,
              color: COLORS.WHITE,
              borderRadius: '2px'
            }}>AI</span>
          )}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {col.name}
          </span>
          <span style={{ color: COLORS.GRAY_999, fontSize: dataTypeFontSize, fontFamily: 'monospace' }}>
            {(col.dataType || '').toUpperCase()}
          </span>
        </div>
      ))}
      {truncated && (
        <div style={{
          padding: rowPadding,
          textAlign: 'center',
          color: COLORS.GRAY_999,
          fontSize: rowFontSize,
          borderBottom: `1px solid ${COLORS.BORDER}`
        }}>
          共 {cols.length} 列 (含 {pkCols.length} 主键)
        </div>
      )}
    </div>
  )
})

interface LockBannerProps {
  userName: string
}

const LockBanner = React.memo(({ userName }: LockBannerProps) => (
  <div style={{
    background: COLORS.BG_RED_LIGHT,
    borderBottom: `1px solid ${COLORS.BORDER_RED_LIGHT}`,
    padding: '4px 8px',
    fontSize: '11px',
    color: COLORS.TEXT_RED,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  }}>
    <UserOutlined />
    <span style={{ fontWeight: 500 }}>{userName}</span>
    <span>正在编辑</span>
  </div>
))

interface ContextMenuDropdownProps {
  position: { x: number; y: number } | null
  menuItems: any[]
  onMenuClick: ({ key }: { key: string }) => void
  onClose: () => void
}

const ContextMenuDropdown = React.memo(({ position, menuItems, onMenuClick, onClose }: ContextMenuDropdownProps) => {
  if (!position) return null
  return (
    <Dropdown
      menu={{ items: menuItems, onClick: onMenuClick }}
      open={true}
      onOpenChange={(open) => !open && onClose()}
    >
      <span style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: 0,
        height: 0
      }} />
    </Dropdown>
  )
})

interface AddColumnButtonProps {
  tableId: string
  holdingTableLock: boolean
  isConnected: boolean
  themeColor: string
  rowPadding: string
  rowFontSize: string
  columnsCount: number
  requestTableLock: (id: string) => void
  createColumn: (tableId: string, data: any) => void
  releaseTableLock: (id: string) => void
}

const AddColumnButton = React.memo(({ tableId, holdingTableLock, isConnected, themeColor, rowPadding, rowFontSize, columnsCount, requestTableLock, createColumn, releaseTableLock }: AddColumnButtonProps) => (
  <div style={{
    padding: rowPadding,
    borderTop: `1px solid ${COLORS.BORDER}`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: rowFontSize,
    color: COLORS.GRAY_999,
    background: COLORS.BG_FA
  }}
  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = themeColor; (e.currentTarget as HTMLDivElement).style.background = COLORS.BG_E6 }}
  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = COLORS.GRAY_999; (e.currentTarget as HTMLDivElement).style.background = COLORS.BG_FA }}
  onClick={(e) => {
    e.stopPropagation()
    if (!holdingTableLock && isConnected) requestTableLock(tableId)
    createColumn(tableId, {
      name: '新列',
      dataType: 'VARCHAR',
      nullable: true,
      order: columnsCount
    })
    message.success('已添加新列')
    if (isConnected) releaseTableLock(tableId)
  }}
  >
    <PlusOutlined />
    <span>添加列</span>
  </div>
))

interface TableHeaderProps {
  tableName: string
  tableId: string
  tableLock: { userName: string; acquiredAt?: number } | null | undefined
  holdingTableLock: boolean
  editingName: boolean
  editNameValue: string
  setEditNameValue: (value: string) => void
  nameInputRef: React.RefObject<any>
  headerBackground: string
  headerPadding: string
  headerFontSize: string
  tagFontSize: string
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  handleNameSave: () => void
  handleNameKeyDown: (e: React.KeyboardEvent) => void
  handleDoubleClickName: (e: React.MouseEvent) => void
  onDelete: (tableId: string) => void
}

const TableHeader = React.memo(({
  tableName, tableId, tableLock, holdingTableLock,
  editingName, editNameValue, setEditNameValue, nameInputRef,
  headerBackground, headerPadding, headerFontSize, tagFontSize,
  collapsed, setCollapsed,
  handleNameSave, handleNameKeyDown, handleDoubleClickName,
  onDelete
}: TableHeaderProps) => (
  <div style={{
    background: headerBackground,
    color: COLORS.WHITE,
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
        >{tableName}</span>
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
          content: `您确定要删除表「${tableName}」吗？此操作不可撤销。`,
          okText: '确定删除',
          cancelText: '取消',
          okType: 'danger',
          onOk: async () => {
            await onDelete(tableId)
            message.success('表已删除')
          }
        })
      }}
    />
    <Tooltip title={collapsed ? '展开字段' : '收起字段'}>
      <span
        style={{
          cursor: 'pointer',
          fontSize: tagFontSize,
          padding: '0 2px'
        }}
        onClick={(e) => {
          e.stopPropagation()
          setCollapsed(!collapsed)
        }}
      >
        {collapsed ? <DownOutlined /> : <UpOutlined />}
      </span>
    </Tooltip>
  </div>
))

interface TableNodeData {
  table: Table
  onEdit: (tableId: string | null) => void
  onDelete: (tableId: string) => void
}

interface ColumnRowProps {
  column: Column
  tableId: string
  tableLock: any | null
  columnLock: any | null
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  isEditing: boolean
  isEditingDataType: boolean
  rowPadding: string
  rowFontSize: string
  tagFontSize: string
  dataTypeFontSize: string
  onToggleColumnProp: (columnId: string, prop: 'primaryKey' | 'unique' | 'nullable') => void
  onDoubleClickColumnName: (e: React.MouseEvent, columnId: string, columnName: string) => void
  onColumnNameSave: () => void
  onColumnNameKeyDown: (e: React.KeyboardEvent) => void
  onDataTypeChange: (columnId: string, dataType: string) => void
  onStartEditDataType: (columnId: string) => void
  onStopEditDataType: () => void
  onDeleteColumn: (columnId: string) => void
  editColumnNameValue: string
  setEditColumnNameValue: (value: string) => void
  columnInputRef: React.RefObject<any>
}

const ColumnRow = React.memo(({
  column, tableLock, columnLock, isHovered,
  onMouseEnter, onMouseLeave,
  isEditing, isEditingDataType,
  rowPadding, rowFontSize, tagFontSize, dataTypeFontSize,
  onToggleColumnProp, onDoubleClickColumnName,
  onColumnNameSave, onColumnNameKeyDown,
  onDataTypeChange, onStartEditDataType, onStopEditDataType,
  onDeleteColumn,
  editColumnNameValue, setEditColumnNameValue, columnInputRef
}: ColumnRowProps) => {
  const locked = !!(tableLock || columnLock)
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: rowPadding,
      borderBottom: `1px solid ${COLORS.BORDER}`,
      gap: '8px',
      fontSize: rowFontSize,
      background: columnLock ? COLORS.BG_RED_LIGHT : (isHovered ? COLORS.BG_FA : 'transparent'),
      cursor: columnLock ? 'not-allowed' : 'default'
    }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={(e) => {
      if (columnLock) {
        e.stopPropagation()
        message.warning(`${columnLock.userName} 正在编辑该字段`)
      }
    }}
    >
      {column.primaryKey && (
        <Tooltip title={locked ? '' : '点击移除主键'}>
          <span style={{
            fontSize: tagFontSize,
            padding: '0 2px',
            background: COLORS.GREEN,
            color: COLORS.WHITE,
            borderRadius: '2px',
            cursor: locked ? 'default' : 'pointer',
            opacity: locked ? 0.7 : 1
          }}
          onClick={(e) => {
            if (locked) return
            e.stopPropagation()
            onToggleColumnProp(column.id, 'primaryKey')
          }}
          onMouseDown={(e) => e.stopPropagation()}
          >PK</span>
        </Tooltip>
      )}
      {column.unique && !column.primaryKey && (
        <Tooltip title={locked ? '' : '点击移除唯一键'}>
          <span style={{
            fontSize: tagFontSize,
            padding: '0 2px',
            background: COLORS.YELLOW,
            color: COLORS.WHITE,
            borderRadius: '2px',
            cursor: locked ? 'default' : 'pointer',
            opacity: locked ? 0.7 : 1
          }}
          onClick={(e) => {
            if (locked) return
            e.stopPropagation()
            onToggleColumnProp(column.id, 'unique')
          }}
          onMouseDown={(e) => e.stopPropagation()}
          >UQ</span>
        </Tooltip>
      )}
      {!column.primaryKey && !column.unique && !tableLock && !columnLock && isHovered && (
        <span style={{
          fontSize: tagFontSize,
          padding: '0 2px',
          color: COLORS.GRAY_999,
          borderRadius: '2px',
          border: '1px dashed #d9d9d9',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onToggleColumnProp(column.id, 'primaryKey')
        }}
        onMouseDown={(e) => e.stopPropagation()}
        >+PK</span>
      )}
      {column.autoIncrement && (
        <span style={{
          fontSize: tagFontSize,
          padding: '0 2px',
          background: COLORS.BLUE,
          color: COLORS.WHITE,
          borderRadius: '2px'
        }}>AI</span>
      )}
      {isEditing ? (
        <Input
          ref={columnInputRef}
          size="small"
          value={editColumnNameValue}
          onChange={(e) => setEditColumnNameValue(e.target.value)}
          onBlur={onColumnNameSave}
          onKeyDown={onColumnNameKeyDown}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ flex: 1, height: 22, padding: '0 4px', fontSize: rowFontSize }}
        />
      ) : (
        <span
          style={{ flex: 1, fontWeight: '500', fontSize: rowFontSize, cursor: locked ? 'default' : 'text' }}
          onDoubleClick={(e) => onDoubleClickColumnName(e, column.id, column.name)}
          title="双击编辑列名"
        >{column.name}</span>
      )}
      <span style={{
        color: COLORS.GRAY_666,
        fontSize: dataTypeFontSize,
        fontFamily: 'monospace',
        cursor: locked ? 'default' : 'pointer',
        padding: '0 2px',
        borderRadius: 2
      }}
      onClick={(e) => {
        if (locked) return
        e.stopPropagation()
        onStartEditDataType(column.id)
      }}
      title={locked ? '' : '点击修改数据类型'}
      >
        {isEditingDataType ? (
          <Select
            size="small"
            defaultValue={(column.dataType || '').toUpperCase()}
            dropdownMatchSelectWidth={false}
            autoFocus
            onBlur={onStopEditDataType}
            onChange={(value) => onDataTypeChange(column.id, value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 80, fontSize: dataTypeFontSize }}
            options={SQL_DATA_TYPE_OPTIONS}
          />
        ) : (
          (column.dataType || '').toUpperCase()
        )}
      </span>
      {column.nullable ? (
        <Tooltip title={locked ? '' : '点击设为 NOT NULL'}>
          <span style={{
            color: COLORS.GRAY_999,
            fontSize: tagFontSize,
            cursor: locked ? 'default' : 'pointer',
            padding: '0 2px'
          }}
          onClick={(e) => {
            if (locked) return
            e.stopPropagation()
            onToggleColumnProp(column.id, 'nullable')
          }}
          onMouseDown={(e) => e.stopPropagation()}
          >?</span>
        </Tooltip>
      ) : (
        !tableLock && !columnLock && isHovered && (
          <Tooltip title="点击设为可空">
            <span style={{
              color: COLORS.GRAY_BBB,
              fontSize: tagFontSize,
              cursor: 'pointer',
              padding: '0 2px'
            }}
            onClick={(e) => {
              e.stopPropagation()
              onToggleColumnProp(column.id, 'nullable')
            }}
            onMouseDown={(e) => e.stopPropagation()}
            >NN</span>
          </Tooltip>
        )
      )}
      {columnLock && (
        <Tooltip title={`${columnLock.userName} 正在编辑此字段`}>
          <LockOutlined style={{ color: COLORS.RED, fontSize: '12px' }} />
        </Tooltip>
      )}
      {column.comment && (
        <Tooltip title={column.comment}>
          <InfoCircleOutlined style={{ color: COLORS.BLUE, fontSize: tagFontSize, cursor: 'help' }} />
        </Tooltip>
      )}
      {!tableLock && !columnLock && isHovered && (
        <Tooltip title="删除列">
          <DeleteOutlined
            style={{ color: COLORS.GRAY_999, cursor: 'pointer', fontSize: tagFontSize }}
            onClick={(e) => {
              e.stopPropagation()
              onDeleteColumn(column.id)
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </Tooltip>
      )}
    </div>
  )
})

const TableNode: React.FC<NodeProps<TableNodeData>> = ({ data, selected }) => {
  const { table, onEdit, onDelete } = data
  const compactMode = useAppStore(state => state.compactMode)
  const themeColor = useAppStore(state => state.themeColor)
  const { isTableLocked, isColumnLocked, amIHoldingTableLock, amIHoldingColumnLock, requestTableLock, releaseTableLock, requestColumnLock, releaseColumnLock, isConnected } = useCollabLocks()
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editColumnNameValue, setEditColumnNameValue] = useState('')
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null)
  const [editingDataTypeId, setEditingDataTypeId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
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

  const nodeWidth = compactMode ? NODE_SIZES.COMPACT_WIDTH : NODE_SIZES.NORMAL_WIDTH
  const headerPadding = compactMode ? NODE_SIZES.HEADER_PADDING_COMPACT : NODE_SIZES.HEADER_PADDING_NORMAL
  const headerFontSize = compactMode ? NODE_SIZES.HEADER_FONT_COMPACT : NODE_SIZES.HEADER_FONT_NORMAL
  const rowPadding = compactMode ? NODE_SIZES.ROW_PADDING_COMPACT : NODE_SIZES.ROW_PADDING_NORMAL
  const rowFontSize = compactMode ? NODE_SIZES.ROW_FONT_COMPACT : NODE_SIZES.ROW_FONT_NORMAL
  const tagFontSize = compactMode ? NODE_SIZES.TAG_FONT_COMPACT : NODE_SIZES.TAG_FONT_NORMAL
  const dataTypeFontSize = compactMode ? NODE_SIZES.DT_FONT_COMPACT : NODE_SIZES.DT_FONT_NORMAL
  const maxHeight = compactMode ? NODE_SIZES.MAX_HEIGHT_COMPACT : NODE_SIZES.MAX_HEIGHT_NORMAL

  const tableBorderColor = useMemo(() => {
    if (holdingTableLock) return COLORS.GREEN
    if (tableLock) return COLORS.RED
    return selected ? themeColor : COLORS.DEFAULT_BORDER
  }, [holdingTableLock, tableLock, selected, themeColor])

  const headerBackground = useMemo(() => {
    if (holdingTableLock) return COLORS.GREEN
    if (tableLock) return COLORS.RED
    return themeColor
  }, [holdingTableLock, tableLock, themeColor])

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    if (tableLock) {
      e.stopPropagation()
      message.warning(`${tableLock.userName} 正在编辑该表`)
    }
  }, [tableLock])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
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
  }, [table, onEdit, onDelete, copyTable, pasteTable])

  const handleDoubleClickName = useCallback((e: React.MouseEvent) => {
    if (tableLock) return
    e.stopPropagation()
    if (!holdingTableLock && isConnected) {
      requestTableLock(table.id)
    }
    setEditNameValue(table.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }, [tableLock, holdingTableLock, isConnected, table.name, requestTableLock])

  const handleNameSave = useCallback(() => {
    const trimmed = editNameValue.trim()
    if (!trimmed || trimmed === table.name) {
      setEditingName(false)
      if (isConnected) releaseTableLock(table.id)
      return
    }
    updateTable(table.id, { name: trimmed })
    setEditingName(false)
    message.success('表名已更新')
    if (isConnected) releaseTableLock(table.id)
  }, [editNameValue, table.name, table.id, isConnected, updateTable, releaseTableLock])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave()
    if (e.key === 'Escape') { setEditingName(false); if (isConnected) releaseTableLock(table.id); e.stopPropagation() }
  }, [handleNameSave, isConnected, releaseTableLock, table.id])

  const handleDoubleClickColumnName = useCallback((e: React.MouseEvent, columnId: string, columnName: string) => {
    if (tableLock || isColumnLocked(table.id, columnId)) return
    e.stopPropagation()
    if (!amIHoldingColumnLock(table.id, columnId) && isConnected) {
      requestColumnLock(table.id, columnId)
    }
    setEditColumnNameValue(columnName)
    setEditingColumnId(columnId)
    setTimeout(() => columnInputRef.current?.focus(), 0)
  }, [tableLock, table.id, isConnected, isColumnLocked, amIHoldingColumnLock, requestColumnLock])

  const handleColumnNameSave = useCallback(async () => {
    if (!editingColumnId) return
    const trimmed = editColumnNameValue.trim()
    if (!trimmed) {
      setEditingColumnId(null)
      if (isConnected) releaseColumnLock(table.id, editingColumnId)
      return
    }
    await updateColumn(editingColumnId, { name: trimmed })
    setEditingColumnId(null)
    message.success('列名已更新')
    if (isConnected) releaseColumnLock(table.id, editingColumnId)
  }, [editingColumnId, editColumnNameValue, isConnected, updateColumn, releaseColumnLock, table.id])

  const handleColumnNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleColumnNameSave()
    if (e.key === 'Escape') { const cid = editingColumnId; setEditingColumnId(null); if (cid && isConnected) releaseColumnLock(table.id, cid); e.stopPropagation() }
  }, [handleColumnNameSave, editingColumnId, isConnected, releaseColumnLock, table.id])

  const handleDataTypeChange = useCallback(async (columnId: string, dataType: string) => {
    setEditingDataTypeId(null)
    await updateColumn(columnId, { dataType })
    message.success(`数据类型已更新为 ${dataType}`)
    if (isConnected) releaseColumnLock(table.id, columnId)
  }, [isConnected, updateColumn, releaseColumnLock, table.id])

  const handleToggleColumnProp = useCallback(async (columnId: string, prop: 'primaryKey' | 'unique' | 'nullable') => {
    const column = table.columns.find(c => c.id === columnId)
    if (!column) return
    if (!holdingTableLock && !tableLock && isConnected) {
      requestTableLock(table.id)
    }
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
    if (isConnected) releaseTableLock(table.id)
  }, [table.columns, holdingTableLock, tableLock, isConnected, requestTableLock, updateColumn, releaseTableLock, table.id])

  const handleStartEditDataType = useCallback((columnId: string) => {
    if (!amIHoldingColumnLock(table.id, columnId) && isConnected) {
      requestColumnLock(table.id, columnId)
    }
    setEditingDataTypeId(columnId)
  }, [amIHoldingColumnLock, isConnected, requestColumnLock, table.id])

  const handleStopEditDataType = useCallback(() => {
    setEditingDataTypeId(null)
  }, [])

  const handleDeleteColumn = useCallback((columnId: string) => {
    if (!holdingTableLock && isConnected) requestTableLock(table.id)
    deleteColumn(columnId)
    message.success('列已删除')
    if (isConnected) releaseTableLock(table.id)
  }, [holdingTableLock, isConnected, requestTableLock, deleteColumn, releaseTableLock, table.id])

  useEffect(() => {
    return () => {
      if (isConnected) {
        releaseTableLock(table.id)
        table.columns.forEach(col => releaseColumnLock(table.id, col.id))
      }
    }
  }, [])

  const tooltipTitle = useMemo(() => (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{table.name}</div>
      <div style={{ fontSize: 11, color: COLORS.GRAY_666, lineHeight: '18px' }}>
        <div>📊 列数: {table.columns.length}</div>
        <div>🔑 主键: {table.columns.filter(c => c.primaryKey).map(c => c.name).join(', ') || '(无)'}</div>
        <div>📇 索引: {table.indexes.length} 个</div>
        <div>📝 注释: {table.comment || '(无)'}</div>
        {tableLock && (
          <div style={{ color: '#fa8c16', marginTop: 4 }}>🔒 已锁定 - {formatLockTime(tableLock.acquiredAt)}</div>
        )}
      </div>
    </div>
  ), [table.name, table.columns, table.indexes.length, table.comment, tableLock])

  const contextMenuItems = useMemo(() => [
    { key: 'edit', label: '编辑表', icon: <EditOutlined />, disabled: !!tableLock },
    { type: 'divider' as const },
    { key: 'copyTable', label: '复制表 (含列和索引)', icon: <CopyOutlined /> },
    { key: 'pasteTable', label: copiedTable ? `粘贴表 "${copiedTable.name}"` : '粘贴表', icon: <SnippetsOutlined />, disabled: !copiedTable },
    { type: 'divider' as const },
    { key: 'copyName', label: '复制表名', icon: <CopyOutlined /> },
    { key: 'copyId', label: '复制表ID', icon: <ScissorOutlined /> },
    { type: 'divider' as const },
    { key: 'delete', label: '删除表', icon: <DeleteOutlined />, danger: true, disabled: !!tableLock }
  ], [tableLock, copiedTable])

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
          border: selected ? `2px solid ${tableBorderColor}` : `1px solid ${tableBorderColor}`,
          borderRadius: '4px',
          background: COLORS.WHITE,
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

      <TableHeader
        tableName={table.name}
        tableId={table.id}
        tableLock={tableLock}
        holdingTableLock={holdingTableLock}
        editingName={editingName}
        editNameValue={editNameValue}
        setEditNameValue={setEditNameValue}
        nameInputRef={nameInputRef}
        headerBackground={headerBackground}
        headerPadding={headerPadding}
        headerFontSize={headerFontSize}
        tagFontSize={tagFontSize}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        handleNameSave={handleNameSave}
        handleNameKeyDown={handleNameKeyDown}
        handleDoubleClickName={handleDoubleClickName}
        onDelete={onDelete}
      />

      {tableLock && <LockBanner userName={tableLock.userName} />}

      <div style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
        {collapsed ? (
          <CollapsedColumns
            columns={table.columns || []}
            rowPadding={rowPadding}
            rowFontSize={rowFontSize}
            tagFontSize={tagFontSize}
            dataTypeFontSize={dataTypeFontSize}
          />
        ) : (
          <>
        {(table.columns || []).map(column => (
            <ColumnRow
              key={column.id}
              column={column}
              tableId={table.id}
              tableLock={tableLock}
              columnLock={isColumnLocked(table.id, column.id)}
              isHovered={hoveredColumnId === column.id}
              onMouseEnter={() => setHoveredColumnId(column.id)}
              onMouseLeave={() => setHoveredColumnId(null)}
              isEditing={editingColumnId === column.id}
              isEditingDataType={editingDataTypeId === column.id}
              rowPadding={rowPadding}
              rowFontSize={rowFontSize}
              tagFontSize={tagFontSize}
              dataTypeFontSize={dataTypeFontSize}
              onToggleColumnProp={handleToggleColumnProp}
              onDoubleClickColumnName={handleDoubleClickColumnName}
              onColumnNameSave={handleColumnNameSave}
              onColumnNameKeyDown={handleColumnNameKeyDown}
              onDataTypeChange={handleDataTypeChange}
              onStartEditDataType={handleStartEditDataType}
              onStopEditDataType={handleStopEditDataType}
              onDeleteColumn={handleDeleteColumn}
              editColumnNameValue={editColumnNameValue}
              setEditColumnNameValue={setEditColumnNameValue}
              columnInputRef={columnInputRef}
            />
          ))}
        {(table.columns || []).length === 0 && (
          <div style={{
            padding: '12px',
            textAlign: 'center',
            color: COLORS.GRAY_999,
            fontSize: rowFontSize
          }}>
            暂无列
          </div>
        )}
        {!tableLock && (
          <AddColumnButton
            tableId={table.id}
            holdingTableLock={holdingTableLock}
            isConnected={isConnected}
            themeColor={themeColor}
            rowPadding={rowPadding}
            rowFontSize={rowFontSize}
            columnsCount={table.columns.length}
            requestTableLock={requestTableLock}
            createColumn={createColumn}
            releaseTableLock={releaseTableLock}
          />
        )}
          </>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
    </Tooltip>
    <ContextMenuDropdown
        position={contextMenuPos}
        menuItems={contextMenuItems}
        onMenuClick={handleMenuClick}
        onClose={() => setContextMenuPos(null)}
      />
    </>
  )
}

export default TableNode
