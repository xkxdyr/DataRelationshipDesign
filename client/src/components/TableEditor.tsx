import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Table, Space, Tag, InputNumber, Select, Popconfirm, Tabs, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, HolderOutlined } from '@ant-design/icons'
import { Column as ColumnType, Table as TableType, Index } from '../types'
import { useAppStore } from '../stores/appStore'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { Option } = Select
const { TabPane } = Tabs

interface SortableRowProps {
  id: string
  record: ColumnType
  columns: any[]
  handleUpdateColumn: (id: string, updates: Partial<ColumnType>) => void
  handleDeleteColumn: (id: string) => void
}

const SortableRow: React.FC<SortableRowProps> = ({ id, record, columns, handleUpdateColumn, handleDeleteColumn }) => {
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
    backgroundColor: isDragging ? '#f5f5f5' : 'white',
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td style={{ width: 40, textAlign: 'center', cursor: 'grab' }} {...listeners}>
        <HolderOutlined style={{ color: '#999' }} />
      </td>
      {columns.map((col: any, index: number) => {
        if (col.key === 'action') {
          return (
            <td key={col.key} style={{ ...col.style, width: col.width }}>
              <Popconfirm
                title="确定删除这个列吗？"
                onConfirm={() => handleDeleteColumn(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </td>
          )
        }
        return (
          <td key={col.key} style={{ ...col.style, width: col.width }}>
            {col.render ? col.render(record[col.dataIndex], record) : record[col.dataIndex]}
          </td>
        )
      })}
    </tr>
  )
}

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

const TableEditor: React.FC<TableEditorProps> = ({ table, onClose }) => {
  const {
    updateTable, loadColumns, createColumn, updateColumn, deleteColumn,
    loadIndexes, createIndex, updateIndex, deleteIndex, updateColumnOrder
  } = useAppStore()
  const [form] = Form.useForm()
  const [indexForm] = Form.useForm()
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<Index | null>(null)

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

  const handleSave = async () => {
    const values = await form.validateFields()
    await updateTable(table.id, values)
    onClose()
  }

  const handleAddColumn = async () => {
    await createColumn(table.id, {
      name: 'new_column',
      dataType: 'VARCHAR',
      nullable: true,
      autoIncrement: false,
      primaryKey: false,
      unique: false,
      order: table.columns.length
    })
  }

  const handleDeleteColumn = async (columnId: string) => {
    await deleteColumn(columnId)
  }

  const handleUpdateColumn = async (columnId: string, updates: Partial<ColumnType>) => {
    await updateColumn(columnId, updates)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = table.columns.findIndex(col => col.id === active.id)
      const newIndex = table.columns.findIndex(col => col.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(table.columns.map(c => c.id), oldIndex, newIndex)
        await updateColumnOrder(table.id, newOrder)
      }
    }
  }

  const handleOpenIndexModal = (index?: Index) => {
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
  }

  const handleSaveIndex = async (values: any) => {
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
  }

  const handleDeleteIndex = async (indexId: string) => {
    await deleteIndex(indexId)
  }
  
  const columns = [
    {
      title: '列名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ColumnType) => (
        <Input
          value={text}
          onChange={(e) => handleUpdateColumn(record.id, { name: e.target.value })}
        />
      )
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 150,
      render: (text: string, record: ColumnType) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => handleUpdateColumn(record.id, { dataType: value })}
        >
          {DATA_TYPES.map(type => (
            <Option key={type} value={type}>{type}</Option>
          ))}
        </Select>
      )
    },
    {
      title: '长度',
      dataIndex: 'length',
      key: 'length',
      width: 100,
      render: (value: number | undefined, record: ColumnType) => (
        <InputNumber
          value={value}
          style={{ width: '100%' }}
          onChange={(v) => handleUpdateColumn(record.id, { length: v || undefined })}
        />
      )
    },
    {
      title: '约束',
      key: 'constraints',
      width: 200,
      render: (record: ColumnType) => (
        <Space size="small">
          <Tag
            color={record.primaryKey ? 'green' : 'default'}
            onClick={() => handleUpdateColumn(record.id, { primaryKey: !record.primaryKey })}
            style={{ cursor: 'pointer' }}
          >PK</Tag>
          <Tag
            color={record.unique ? 'orange' : 'default'}
            onClick={() => handleUpdateColumn(record.id, { unique: !record.unique })}
            style={{ cursor: 'pointer' }}
          >UQ</Tag>
          <Tag
            color={!record.nullable ? 'red' : 'default'}
            onClick={() => handleUpdateColumn(record.id, { nullable: !record.nullable })}
            style={{ cursor: 'pointer' }}
          >{record.nullable ? 'NULL' : 'NOT NULL'}</Tag>
          <Tag
            color={record.autoIncrement ? 'blue' : 'default'}
            onClick={() => handleUpdateColumn(record.id, { autoIncrement: !record.autoIncrement })}
            style={{ cursor: 'pointer' }}
          >AI</Tag>
        </Space>
      )
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 120,
      render: (value: string | undefined, record: ColumnType) => (
        <Input
          value={value}
          placeholder="默认值"
          onChange={(e) => handleUpdateColumn(record.id, { defaultValue: e.target.value })}
        />
      )
    },
    {
      title: '注释',
      dataIndex: 'comment',
      key: 'comment',
      width: 150,
      render: (value: string | undefined, record: ColumnType) => (
        <Input
          value={value}
          placeholder="注释"
          onChange={(e) => handleUpdateColumn(record.id, { comment: e.target.value })}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (record: ColumnType) => (
        <Popconfirm
          title="确定删除这个列吗？"
          onConfirm={() => handleDeleteColumn(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      )
    }
  ]

  const indexColumns = [
    {
      title: '索引名',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: Index) => (
        <Input
          value={text}
          onChange={(e) => handleUpdateIndex(record.id, { name: e.target.value })}
        />
      )
    },
    {
      title: '包含列',
      dataIndex: 'columns',
      key: 'columns',
      width: 200,
      render: (text: string) => text || '-'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (value: string, record: Index) => (
        <Select
          value={value}
          style={{ width: '100%' }}
          onChange={(v) => handleUpdateIndex(record.id, { type: v })}
        >
          <Option value="BTREE">BTREE</Option>
          <Option value="HASH">HASH</Option>
          <Option value="FULLTEXT">FULLTEXT</Option>
        </Select>
      )
    },
    {
      title: '约束',
      key: 'unique',
      width: 100,
      render: (record: Index) => (
        <Tag
          color={record.unique ? 'red' : 'default'}
          onClick={() => handleUpdateIndex(record.id, { unique: !record.unique })}
          style={{ cursor: 'pointer' }}
        >
          {record.unique ? 'UNIQUE' : 'INDEX'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (record: Index) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            onClick={() => handleOpenIndexModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个索引吗？"
            onConfirm={() => handleDeleteIndex(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const handleUpdateIndex = async (indexId: string, updates: Partial<Index>) => {
    await updateIndex(indexId, updates)
  }
  
  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
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
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="列管理" key="1">
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>列列表（可拖拽排序）</h3>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddColumn}>
                添加列
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={table.columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <Table
                    dataSource={table.columns}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    components={{
                      body: {
                        row: (props: any) => {
                          const record = table.columns.find(c => c.id === props['data-row-key'])
                          if (!record) return <tr {...props} />
                          return (
                            <SortableRow
                              id={record.id}
                              record={record}
                              columns={columns}
                              handleUpdateColumn={handleUpdateColumn}
                              handleDeleteColumn={handleDeleteColumn}
                            />
                          )
                        }
                      }
                    }}
                  />
                </SortableContext>
              </DndContext>
            </div>
          </TabPane>
          <TabPane tab="索引管理" key="2">
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>索引列表</h3>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenIndexModal()}>
                添加索引
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                dataSource={table.indexes || []}
                columns={indexColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </div>
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title={editingIndex ? "编辑索引" : "新建索引"}
        open={isIndexModalOpen}
        onOk={() => indexForm.submit()}
        onCancel={() => setIsIndexModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={500}
      >
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
              {table.columns.map(col => (
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
      </Modal>
    </div>
  )
}

export default TableEditor
