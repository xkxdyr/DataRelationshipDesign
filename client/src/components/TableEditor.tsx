import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Form, Input, InputNumber, Button, Space, Tag, Select, Popconfirm, Tabs, Modal, message, Row, Col, Tooltip, Empty } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowUpOutlined, ArrowDownOutlined, DatabaseOutlined, HolderOutlined, CommentOutlined, EditOutlined } from '@ant-design/icons'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Column as ColumnType, Table as TableType, Index } from '../types'
import { useAppStore } from '../stores/appStore'
import { MockDataModal } from './MockDataModal'

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

interface SortableItemProps {
  id: string
  column: ColumnEditData
  onUpdate: (id: string, field: keyof ColumnEditData, value: any) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onSave: (id: string) => void
  isFirst: boolean
  isLast: boolean
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  column,
  onUpdate,
  onDelete,
  onMove,
  onSave,
  isFirst,
  isLast
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#f0f0f0' : 'white',
    borderRadius: 4,
    marginBottom: 8
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Row gutter={8} align="middle" style={{ padding: '8px 0' }}>
        <Col style={{ cursor: 'grab' }} {...attributes} {...listeners}>
          <HolderOutlined style={{ color: '#999', fontSize: 14 }} />
        </Col>
        <Col flex="80px">
          <Input
            value={column.name}
            onChange={e => onUpdate(id, 'name', e.target.value)}
            onBlur={() => onSave(id)}
            placeholder="字段名"
            size="small"
          />
        </Col>
        <Col flex="100px">
          <Select
            value={column.dataType}
            onChange={value => onUpdate(id, 'dataType', value)}
            onBlur={() => onSave(id)}
            size="small"
            style={{ width: '100%' }}
          >
            {DATA_TYPES.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
        </Col>
        <Col flex="60px">
          <InputNumber
            value={column.length}
            onChange={value => onUpdate(id, 'length', value)}
            onBlur={() => onSave(id)}
            placeholder="长度"
            size="small"
            style={{ width: '100%' }}
            min={1}
            max={65535}
          />
        </Col>
        <Col flex="50px">
          <Select
            value={column.nullable ? 'Y' : 'N'}
            onChange={value => onUpdate(id, 'nullable', value === 'Y')}
            onBlur={() => onSave(id)}
            size="small"
            style={{ width: '100%' }}
          >
            <Option value="Y">Y</Option>
            <Option value="N">N</Option>
          </Select>
        </Col>
        <Col flex="50px">
          <Select
            value={column.primaryKey ? 'Y' : 'N'}
            onChange={value => onUpdate(id, 'primaryKey', value === 'Y')}
            onBlur={() => onSave(id)}
            size="small"
            style={{ width: '100%' }}
          >
            <Option value="Y">PK</Option>
            <Option value="N">-</Option>
          </Select>
        </Col>
        <Col flex="50px">
          <Select
            value={column.unique ? 'Y' : 'N'}
            onChange={value => onUpdate(id, 'unique', value === 'Y')}
            onBlur={() => onSave(id)}
            size="small"
            style={{ width: '100%' }}
          >
            <Option value="Y">UQ</Option>
            <Option value="N">-</Option>
          </Select>
        </Col>
        <Col flex="50px">
          <Select
            value={column.autoIncrement ? 'Y' : 'N'}
            onChange={value => onUpdate(id, 'autoIncrement', value === 'Y')}
            onBlur={() => onSave(id)}
            size="small"
            style={{ width: '100%' }}
          >
            <Option value="Y">AI</Option>
            <Option value="N">-</Option>
          </Select>
        </Col>
        <Col flex="100px">
          <Tooltip title={column.comment || '添加注释'}>
            <Input
              value={column.comment}
              onChange={e => onUpdate(id, 'comment', e.target.value)}
              onBlur={() => onSave(id)}
              placeholder="注释"
              size="small"
              suffix={<CommentOutlined style={{ color: column.comment ? '#1890ff' : '#ccc' }} />}
            />
          </Tooltip>
        </Col>
        <Col flex="32px">
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={() => onMove(id, 'up')}
            disabled={isFirst}
          />
        </Col>
        <Col flex="32px">
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            onClick={() => onMove(id, 'down')}
            disabled={isLast}
          />
        </Col>
        <Col flex="32px">
          <Popconfirm
            title="确定删除?"
            onConfirm={() => onDelete(id)}
            okText="是"
            cancelText="否"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Col>
      </Row>
    </div>
  )
}

const TableEditor: React.FC<TableEditorProps> = ({ table, onClose }) => {
  const {
    updateTable, loadColumns, createColumn, updateColumn, deleteColumn,
    loadIndexes, createIndex, updateIndex, deleteIndex, updateColumnOrder,
    autoAddIdColumn
  } = useAppStore()
  const [form] = Form.useForm()
  const [indexForm] = Form.useForm()
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<Index | null>(null)
  const [editingColumns, setEditingColumns] = useState<ColumnEditData[]>([])
  const [isMockDataModalOpen, setIsMockDataModalOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadColumns(table.id)
    loadIndexes(table.id)
    form.setFieldsValue({
      name: table.name,
      comment: table.comment
    })
  }, [table.id])

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

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = editingColumns.findIndex(c => c.id === active.id)
      const newIndex = editingColumns.findIndex(c => c.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(
          editingColumns.map(c => c.id),
          oldIndex,
          newIndex
        )
        await updateColumnOrder(table.id, newOrder)
      }
    }
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
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>列列表</h3>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddColumn}>
                  添加列
                </Button>
              </div>
              <div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={editingColumns.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {editingColumns.map((col, index) => (
                        <SortableItem
                          key={col.id}
                          id={col.id}
                          column={col}
                          onUpdate={handleUpdateColumnField}
                          onDelete={handleDeleteColumn}
                          onMove={handleMoveColumn}
                          onSave={handleSaveColumn}
                          isFirst={index === 0}
                          isLast={index === editingColumns.length - 1}
                        />
                      ))}
                    </Space>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )
        },
        {
          key: '2',
          label: '索引管理',
          children: (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>索引列表</h3>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    共 {(table.indexes || []).length} 个索引，其中 {(table.indexes || []).filter(i => i.unique).length} 个唯一索引
                  </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenIndexModal()}>
                  添加索引
                </Button>
              </div>
              <div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {(table.indexes || []).map(idx => (
                    <div key={idx.id} style={{
                      background: '#fafafa',
                      border: '1px solid #e8e8e8',
                      borderRadius: '8px',
                      padding: '16px',
                      transition: 'border-color 0.2s'
                    }}>
                      <Row gutter={12} align="middle">
                        <Col span={4}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>索引名</div>
                          <Input
                            value={idx.name}
                            onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
                            placeholder="索引名"
                          />
                        </Col>
                        <Col span={6}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            包含列 ({idx.columns?.length || 0})
                          </div>
                          <Tooltip title={idx.columns?.map(colName => {
                            const col = table.columns?.find(c => c.name === colName)
                            return col ? `${col.name}${col.comment ? ` - ${col.comment}` : ''}` : colName
                          }).join(', ')}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'help'
                            }}>
                              {idx.columns?.join(', ') || '-'}
                            </div>
                          </Tooltip>
                        </Col>
                        <Col span={3}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>类型</div>
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
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>约束</div>
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
                            <Button type="text" onClick={() => handleOpenIndexModal(idx)} icon={<EditOutlined />}>编辑</Button>
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
                  {(table.indexes || []).length === 0 && (
                    <Empty description="暂无索引，点击上方按钮添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Space>
              </div>
            </div>
          )
        },
        {
          key: '3',
          label: '数据模拟',
          children: (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ marginBottom: '24px' }}>
                <DatabaseOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>数据模拟生成</h3>
                <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto' }}>
                  根据当前表结构自动生成模拟数据，支持姓名、邮箱、手机号、地址等多种数据类型，
                  可导出为 SQL、JSON、CSV 格式。
                </p>
              </div>
              <Button 
                type="primary" 
                size="large"
                icon={<DatabaseOutlined />}
                onClick={() => setIsMockDataModalOpen(true)}
              >
                打开数据模拟生成器
              </Button>
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

      <MockDataModal
        visible={isMockDataModalOpen}
        onClose={() => setIsMockDataModalOpen(false)}
        table={table}
      />
    </div>
  )
}

export default TableEditor
