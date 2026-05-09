import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Form, Input, InputNumber, Button, Space, Tag, Select, Popconfirm, Tabs, Modal, message, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { Column as ColumnType, Table as TableType, Index } from '../types'
import { useAppStore } from '../stores/appStore'

const { Option } = Select

const DATA_TYPES = [
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'VARCHAR', 'CHAR', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
  'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE',
  'BOOLEAN', 'JSON', 'BLOB', 'UUID'
]

interface TableEditorProps {
  table: TableType
  onClose: () => void
}

interface ColumnEditData {
  id: string
  name: string
  dataType: string
  length?: number
  defaultValue?: string
  comment?: string
  primaryKey: boolean
  unique: boolean
  nullable: boolean
  autoIncrement: boolean
}

interface ColumnWidths {
  name: number
  type: number
  length: number
  constraint: number
  default: number
  comment: number
}

const defaultColumnWidths: ColumnWidths = {
  name: 120,
  type: 100,
  length: 80,
  constraint: 160,
  default: 100,
  comment: 140
}

const TableEditor: React.FC<TableEditorProps> = ({ table, onClose }) => {
  const {
    updateTable, loadColumns, createColumn, updateColumn, deleteColumn,
    loadIndexes, createIndex, updateIndex, deleteIndex, updateColumnOrder,
    autoAddIdColumn, fontConfig
  } = useAppStore()
  const [form] = Form.useForm()
  const [indexForm] = Form.useForm()
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<Index | null>(null)
  const [editingColumns, setEditingColumns] = useState<ColumnEditData[]>([])
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(defaultColumnWidths)
  const [resizingColumn, setResizingColumn] = useState<keyof ColumnWidths | null>(null)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    loadColumns(table.id)
    loadIndexes(table.id)
    form.setFieldsValue({
      name: table.name,
      comment: table.comment
    })
  }, [table.id])

  // 初始化编辑列数据
  useEffect(() => {
    setEditingColumns(
      (table.columns || []).map(col => ({
        id: col.id,
        name: col.name,
        dataType: col.dataType,
        length: col.length,
        defaultValue: col.defaultValue,
        comment: col.comment,
        primaryKey: col.primaryKey ?? false,
        unique: col.unique ?? false,
        nullable: col.nullable ?? true,
        autoIncrement: col.autoIncrement ?? false
      }))
    )
  }, [table.columns])

  const handleSave = useCallback(async () => {
    const values = await form.validateFields()
    await updateTable(table.id, values)
    onClose()
  }, [form, table.id, updateTable, onClose])

  const handleAddColumn = useCallback(async () => {
    const existingNames = editingColumns.map(c => c.name.toLowerCase())
    let newName = 'new_column'
    let counter = 1
    while (existingNames.includes(newName.toLowerCase())) {
      newName = `new_column_${counter}`
      counter++
    }
    const newCol = await createColumn(table.id, {
      name: newName,
      dataType: 'VARCHAR',
      nullable: true,
      autoIncrement: false,
      primaryKey: false,
      unique: false,
      order: editingColumns.length
    })
  }, [table.id, editingColumns.length, createColumn])

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    await deleteColumn(columnId)
  }, [deleteColumn])

  const handleStartResize = useCallback((column: keyof ColumnWidths, e: React.MouseEvent) => {
    setResizingColumn(column)
    resizeRef.current = {
      startX: e.clientX,
      startWidth: columnWidths[column]
    }
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', handleEndResize)
  }, [columnWidths])

  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizeRef.current || !resizingColumn) return
    const deltaX = e.clientX - resizeRef.current.startX
    const minWidth = 60
    const maxWidth = 300
    const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + deltaX))
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }))
  }, [resizingColumn])

  const handleEndResize = useCallback(() => {
    setResizingColumn(null)
    resizeRef.current = null
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleEndResize)
  }, [])

  const handleUpdateColumnField = useCallback((columnId: string, field: keyof ColumnEditData, value: any) => {
    setEditingColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, [field]: value } : col
    ))
  }, [])

  const handleSaveColumn = useCallback(async (columnId: string) => {
    const colData = editingColumns.find(c => c.id === columnId)
    if (!colData) return
    
    if (colData.name) {
      const namePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
      if (!namePattern.test(colData.name)) {
        message.error('列名只能包含字母、数字和下划线，必须以字母或下划线开头')
        return
      }
      const existingNames = editingColumns
        .filter(c => c.id !== columnId)
        .map(c => c.name.toLowerCase())
      if (existingNames.includes(colData.name.toLowerCase())) {
        message.error('该列名已存在')
        return
      }
    }

    await updateColumn(columnId, colData)
  }, [editingColumns, updateColumn])

  const handleMoveColumn = useCallback(async (columnId: string, direction: 'up' | 'down') => {
    const columns = editingColumns
    const index = columns.findIndex(c => c.id === columnId)
    if (index === -1) return

    let newOrder: string[]
    if (direction === 'up' && index > 0) {
      newOrder = [...columns.map(c => c.id)]
      const temp = newOrder[index]
      newOrder[index] = newOrder[index - 1]
      newOrder[index - 1] = temp
    } else if (direction === 'down' && index < columns.length - 1) {
      newOrder = [...columns.map(c => c.id)]
      const temp = newOrder[index]
      newOrder[index] = newOrder[index + 1]
      newOrder[index + 1] = temp
    } else {
      return
    }

    await updateColumnOrder(table.id, newOrder)
  }, [editingColumns, table.id, updateColumnOrder])

  const handleOpenIndexModal = useCallback((index?: Index) => {
    setEditingIndex(index || null)
    if (index) {
      indexForm.setFieldsValue({
        name: index.name,
        columns: index.columns,
        unique: index.unique,
        type: index.type
      })
    } else {
      indexForm.resetFields()
    }
    setIsIndexModalOpen(true)
  }, [indexForm])

  const handleSaveIndex = useCallback(async (values: any) => {
    if (editingIndex) {
      await updateIndex(editingIndex.id, values)
    } else {
      await createIndex(table.id, {
        name: values.name,
        columns: values.columns,
        unique: values.unique,
        type: values.type || 'BTREE'
      })
    }
    setIsIndexModalOpen(false)
  }, [editingIndex, table.id, updateIndex, createIndex])

  const handleDeleteIndex = useCallback(async (indexId: string) => {
    await deleteIndex(indexId)
  }, [deleteIndex])

  return (
    <div style={{ padding: '20px' }}>
      {/* 始终渲染隐藏的 Form，确保 useForm 不会报警告 */}
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name"><Input /></Form.Item>
          <Form.Item name="comment"><Input /></Form.Item>
        </Form>
        <Form form={indexForm} layout="vertical">
          <Form.Item name="name"><Input /></Form.Item>
          <Form.Item name="columns"><Input /></Form.Item>
          <Form.Item name="unique"><Input /></Form.Item>
          <Form.Item name="type"><Input /></Form.Item>
        </Form>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <Form form={form} layout="inline">
          <Form.Item label="表名" name="name">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item label="注释" name="comment">
            <Input style={{ width: 300 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存表信息
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      <Tabs defaultActiveKey="1" items={[
        {
          key: '1',
          label: '列管理',
          children: (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: `${fontConfig.subtitle}px`, color: 'var(--theme-text)', fontWeight: 600 }}>列列表</h3>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddColumn} size="middle">
                  添加列
                </Button>
              </div>
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--theme-border)', background: 'var(--theme-background-secondary)' }}>
                <div style={{ minWidth: 900 }}>
                  {/* 表头 */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '14px 16px',
                    background: 'var(--theme-background)',
                    borderBottom: '1px solid var(--theme-border)',
                    fontSize: `${fontConfig.caption}px`,
                    fontWeight: 600
                  }}>
                    <div style={{ width: 48, textAlign: 'center', color: 'var(--theme-text-secondary)' }}>排序</div>
                    <div style={{ width: columnWidths.name, color: 'var(--theme-text-secondary)' }}>列名</div>
                    <div 
                      className="resize-handle"
                      style={{ 
                        width: 6, 
                        cursor: 'col-resize', 
                        backgroundColor: 'transparent',
                        '&:hover': { backgroundColor: 'var(--theme-border)' }
                      }}
                      onMouseDown={(e) => handleStartResize('name', e)}
                    />
                    <div style={{ width: columnWidths.type, color: 'var(--theme-text-secondary)' }}>类型</div>
                    <div 
                      className="resize-handle"
                      style={{ 
                        width: 6, 
                        cursor: 'col-resize', 
                        backgroundColor: 'transparent',
                        '&:hover': { backgroundColor: 'var(--theme-border)' }
                      }}
                      onMouseDown={(e) => handleStartResize('type', e)}
                    />
                    <div style={{ width: columnWidths.length, color: 'var(--theme-text-secondary)' }}>长度</div>
                    <div 
                      className="resize-handle"
                      style={{ 
                        width: 6, 
                        cursor: 'col-resize', 
                        backgroundColor: 'transparent',
                        '&:hover': { backgroundColor: 'var(--theme-border)' }
                      }}
                      onMouseDown={(e) => handleStartResize('length', e)}
                    />
                    <div style={{ width: columnWidths.constraint, color: 'var(--theme-text-secondary)' }}>约束</div>
                    <div 
                      className="resize-handle"
                      style={{ 
                        width: 4, 
                        cursor: 'col-resize', 
                        backgroundColor: 'var(--theme-border)',
                        '&:hover': { backgroundColor: 'var(--theme-text-secondary)' }
                      }}
                      onMouseDown={(e) => handleStartResize('constraint', e)}
                    />
                    <div style={{ width: columnWidths.default, color: 'var(--theme-text-secondary)' }}>默认值</div>
                    <div 
                      className="resize-handle"
                      style={{ 
                        width: 4, 
                        cursor: 'col-resize', 
                        backgroundColor: 'var(--theme-border)',
                        '&:hover': { backgroundColor: 'var(--theme-text-secondary)' }
                      }}
                      onMouseDown={(e) => handleStartResize('default', e)}
                    />
                    <div style={{ width: columnWidths.comment, color: 'var(--theme-text-secondary)' }}>注释</div>
                    <div style={{ width: 48, textAlign: 'center', color: 'var(--theme-text-secondary)' }}>操作</div>
                  </div>
                  {/* 数据行 */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {editingColumns.map((col, index) => (
                      <div 
                        key={col.id} 
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          background: 'var(--theme-background)', 
                          borderBottom: '1px solid var(--theme-border)',
                          padding: '14px 16px',
                          gap: 6,
                          transition: 'background-color 0.15s ease',
                          '&:hover': {
                            background: 'var(--theme-hover)'
                          }
                        }}
                      >
                        <div style={{ width: 48, textAlign: 'center' }}>
                          <Space direction="vertical">
                            <Button 
                              icon={<ArrowUpOutlined />} 
                              size="small" 
                              disabled={index === 0}
                              onClick={() => handleMoveColumn(col.id, 'up')}
                              style={{ padding: '4px' }}
                            />
                            <Button 
                              icon={<ArrowDownOutlined />} 
                              size="small" 
                              disabled={index === editingColumns.length - 1}
                              onClick={() => handleMoveColumn(col.id, 'down')}
                              style={{ padding: '4px' }}
                            />
                          </Space>
                        </div>
                        <div style={{ width: columnWidths.name }}>
                          <Input
                            value={col.name}
                            onChange={(e) => handleUpdateColumnField(col.id, 'name', e.target.value)}
                            onBlur={() => handleSaveColumn(col.id)}
                            placeholder="列名"
                            size="small"
                            style={{ fontSize: `${fontConfig.body}px`, height: 32 }}
                          />
                        </div>
                        <div style={{ width: 6 }} />
                        <div style={{ width: columnWidths.type }}>
                          <Select
                            value={col.dataType}
                            onChange={(val) => {
                              handleUpdateColumnField(col.id, 'dataType', val)
                              handleSaveColumn(col.id)
                            }}
                            style={{ width: '100%' }}
                            size="small"
                            styles={{ popup: { root: { maxHeight: 250 } } }}
                          >
                            {DATA_TYPES.map(type => (
                              <Option key={type} value={type}>{type}</Option>
                            ))}
                          </Select>
                        </div>
                        <div style={{ width: 4 }} />
                        <div style={{ width: columnWidths.length }}>
                          <InputNumber
                            value={col.length}
                            onChange={(val) => handleUpdateColumnField(col.id, 'length', val)}
                            onBlur={() => handleSaveColumn(col.id)}
                            style={{ width: '100%' }}
                            size="small"
                          />
                        </div>
                        <div style={{ width: 4 }} />
                        <div style={{ width: columnWidths.constraint }}>
                          <Space size="small" wrap>
                            <Tag
                              color={col.primaryKey ? 'green' : 'default'}
                              onClick={() => {
                                handleUpdateColumnField(col.id, 'primaryKey', !col.primaryKey)
                                handleSaveColumn(col.id)
                              }}
                              style={{ cursor: 'pointer', fontSize: `${fontConfig.caption}px`, padding: '2px 8px' }}
                            >PK</Tag>
                            <Tag
                              color={col.unique ? 'orange' : 'default'}
                              onClick={() => {
                                handleUpdateColumnField(col.id, 'unique', !col.unique)
                                handleSaveColumn(col.id)
                              }}
                              style={{ cursor: 'pointer', fontSize: `${fontConfig.caption}px`, padding: '2px 8px' }}
                            >UQ</Tag>
                            <Tag
                              color={!col.nullable ? 'red' : 'default'}
                              onClick={() => {
                                handleUpdateColumnField(col.id, 'nullable', !col.nullable)
                                handleSaveColumn(col.id)
                              }}
                              style={{ cursor: 'pointer', fontSize: `${fontConfig.caption}px`, padding: '2px 8px' }}
                            >{col.nullable ? 'NULL' : 'NOT NULL'}</Tag>
                            <Tag
                              color={col.autoIncrement ? 'blue' : 'default'}
                              onClick={() => {
                                handleUpdateColumnField(col.id, 'autoIncrement', !col.autoIncrement)
                                handleSaveColumn(col.id)
                              }}
                              style={{ cursor: 'pointer', fontSize: `${fontConfig.caption}px`, padding: '2px 8px' }}
                            >AI</Tag>
                          </Space>
                        </div>
                        <div style={{ width: 6 }} />
                        <div style={{ width: columnWidths.default }}>
                          <Input
                            value={col.defaultValue || ''}
                            onChange={(e) => handleUpdateColumnField(col.id, 'defaultValue', e.target.value)}
                            onBlur={() => handleSaveColumn(col.id)}
                            placeholder="默认值"
                            size="small"
                            style={{ fontSize: `${fontConfig.body}px`, height: 32 }}
                          />
                        </div>
                        <div style={{ width: 6 }} />
                        <div style={{ width: columnWidths.comment }}>
                          <Input
                            value={col.comment || ''}
                            onChange={(e) => handleUpdateColumnField(col.id, 'comment', e.target.value)}
                            onBlur={() => handleSaveColumn(col.id)}
                            placeholder="注释"
                            size="small"
                            style={{ fontSize: `${fontConfig.body}px`, height: 32 }}
                          />
                        </div>
                        <div style={{ width: 48, textAlign: 'center' }}>
                          <Popconfirm
                            title="确定删除这个列吗？"
                            onConfirm={() => handleDeleteColumn(col.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                  {editingColumns.length === 0 && (
                    <div style={{ 
                      padding: '60px 40px', 
                      textAlign: 'center',
                      color: 'var(--theme-text-secondary)',
                      background: 'var(--theme-background)'
                    }}>
                      <div style={{ fontSize: `${fontConfig.subtitle}px`, marginBottom: 8 }}>暂无列</div>
                      <div style={{ fontSize: `${fontConfig.caption}px` }}>请点击上方按钮添加</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        },
        {
          key: '2',
          label: '索引管理',
          children: (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>索引列表</h3>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenIndexModal()}>
                  添加索引
                </Button>
              </div>
              <div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {(table.indexes || []).map(idx => (
                    <div key={idx.id} style={{ 
                      background: 'var(--theme-background-secondary)', 
                      border: '1px solid var(--theme-border)', 
                      borderRadius: '8px', 
                      padding: '16px' 
                    }}>
                      <Row gutter={12} align="middle">
                        <Col span={4}>
                          <div style={{ fontSize: `${fontConfig.caption}px`, color: '#666', marginBottom: '4px' }}>索引名</div>
                          <Input
                            value={idx.name}
                            onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
                            placeholder="索引名"
                          />
                        </Col>
                        <Col span={6}>
                          <div style={{ fontSize: `${fontConfig.caption}px`, color: '#666', marginBottom: '4px' }}>包含列</div>
                          <div>{idx.columns?.join(', ') || '-'}</div>
                        </Col>
                        <Col span={3}>
                          <div style={{ fontSize: `${fontConfig.caption}px`, color: '#666', marginBottom: '4px' }}>类型</div>
                          <Select
                            value={idx.type}
                            onChange={(val) => updateIndex(idx.id, { type: val })}
                            style={{ width: '100%' }}
                          >
                            <Option value="BTREE">BTREE</Option>
                            <Option value="HASH">HASH</Option>
                            <Option value="FULLTEXT">FULLTEXT</Option>
                          </Select>
                        </Col>
                        <Col span={4}>
                          <div style={{ fontSize: `${fontConfig.caption}px`, color: '#666', marginBottom: '4px' }}>约束</div>
                          <Tag
                            color={idx.unique ? 'red' : 'default'}
                            onClick={() => updateIndex(idx.id, { unique: !idx.unique })}
                            style={{ cursor: 'pointer' }}
                          >
                            {idx.unique ? 'UNIQUE' : 'INDEX'}
                          </Tag>
                        </Col>
                        <Col span={7}>
                          <Space>
                            <Button type="text" onClick={() => handleOpenIndexModal(idx)}>编辑</Button>
                            <Popconfirm
                              title="确定删除这个索引吗？"
                              onConfirm={() => handleDeleteIndex(idx.id)}
                              okText="确定"
                              cancelText="取消"
                            >
                              <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                            </Popconfirm>
                          </Space>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Space>
              </div>
            </div>
          )
        }
      ]} />

      <Modal
        title={editingIndex ? "编辑索引" : "新建索引"}
        open={isIndexModalOpen}
        onOk={() => indexForm.submit()}
        onCancel={() => setIsIndexModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        {isIndexModalOpen ? (
          <Form
            form={indexForm}
            layout="vertical"
            onFinish={handleSaveIndex}
          >
            <Form.Item
              name="name"
              label="索引名"
              rules={[{ required: true, message: "请输入索引名" }]}
            >
              <Input placeholder="请输入索引名" />
            </Form.Item>
            
            <Form.Item
              name="columns"
              label="包含列"
              rules={[{ required: true, message: "请选择包含列" }]}
            >
              <Select mode="multiple" placeholder="请选择列">
                {(table.columns || []).map(col => (
                  <Option key={col.id} value={col.name}>{col.name}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="unique"
              label="约束类型"
              initialValue={false}
            >
              <Select>
                <Option value={false}>普通索引</Option>
                <Option value={true}>唯一索引</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="type"
              label="索引类型"
              initialValue="BTREE"
            >
              <Select>
                <Option value="BTREE">BTREE</Option>
                <Option value="HASH">HASH</Option>
                <Option value="FULLTEXT">FULLTEXT</Option>
              </Select>
            </Form.Item>
          </Form>
        ) : (
          <Form form={indexForm} layout="vertical" style={{ display: 'none' }}>
            <Form.Item name="name"><Input /></Form.Item>
            <Form.Item name="columns"><Input /></Form.Item>
            <Form.Item name="unique"><Input /></Form.Item>
            <Form.Item name="type"><Input /></Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default TableEditor
