import React, { useState, useCallback, useEffect } from 'react'
import { Table, Button, Space, Input, Modal, message, Tag, Card, Select, Tooltip, Popconfirm } from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

interface EditableCell {
  key: string
  field: string
  value: any
  originalValue: any
  rowIndex: number
}

interface DataTableEditorProps {
  connectionId?: string
  onClose?: () => void
}

const DataTableEditor: React.FC<DataTableEditorProps> = ({ connectionId, onClose }) => {
  const { tables } = useAppStore()
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [data, setData] = useState<Record<string, any>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRow, setNewRow] = useState<Record<string, any>>({})

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable)
    }
  }, [selectedTable])

  const loadTableData = useCallback(async (tableName: string) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const table = tables.find(t => t.name === tableName)
      const tableColumns = table?.columns?.map(c => c.name) || ['id', 'name', 'status', 'created_at']
      
      setColumns(tableColumns)
      
      const mockData = Array.from({ length: 20 }, (_, i) => {
        const row: Record<string, any> = { id: i + 1 }
        tableColumns.forEach(col => {
          if (col !== 'id') {
            if (col.includes('name') || col.includes('Name')) {
              row[col] = `${col}_${i + 1}`
            } else if (col.includes('status') || col.includes('Status')) {
              row[col] = i % 2 === 0 ? 'active' : 'inactive'
            } else if (col.includes('date') || col.includes('Date') || col.includes('time') || col.includes('Time')) {
              row[col] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            } else if (col.includes('count') || col.includes('Count') || col.includes('num') || col.includes('Num')) {
              row[col] = Math.floor(Math.random() * 100)
            } else if (col.includes('price') || col.includes('Price') || col.includes('amount') || col.includes('Amount')) {
              row[col] = (Math.random() * 1000).toFixed(2)
            } else if (col.includes('email') || col.includes('Email')) {
              row[col] = `user${i + 1}@example.com`
            } else if (col.includes('desc') || col.includes('Desc') || col.includes('remark') || col.includes('Remark')) {
              row[col] = `这是第 ${i + 1} 条记录的描述信息`
            } else {
              row[col] = `value_${i + 1}`
            }
          }
        })
        return row
      })
      
      setData(mockData)
      setHasChanges(false)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [tables])

  const handleCellClick = useCallback((key: string, field: string, value: any, rowIndex: number) => {
    setEditingCell({ key, field, value, originalValue: value, rowIndex })
  }, [])

  const handleCellChange = useCallback((value: any) => {
    if (!editingCell) return
    
    setData(prev => prev.map((row, idx) => {
      if (idx === editingCell.rowIndex) {
        return { ...row, [editingCell.field]: value }
      }
      return row
    }))
    setHasChanges(true)
  }, [editingCell])

  const handleCellBlur = useCallback(() => {
    setEditingCell(null)
  }, [])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('保存成功')
      setHasChanges(false)
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDeleteRow = useCallback((key: string) => {
    setData(prev => prev.filter(row => String(row.id) !== String(key)))
    setHasChanges(true)
    message.success('删除成功')
  }, [])

  const handleAddRow = useCallback(() => {
    const newId = Math.max(...data.map(d => Number(d.id) || 0), 0) + 1
    const newDataRow: Record<string, any> = { id: newId }
    columns.forEach(col => {
      if (col !== 'id') {
        newDataRow[col] = ''
      }
    })
    setData(prev => [newDataRow, ...prev])
    setHasChanges(true)
    setShowAddModal(false)
    setNewRow({})
    message.success('添加成功')
  }, [data, columns])

  const handleRefresh = useCallback(() => {
    if (selectedTable) {
      loadTableData(selectedTable)
    }
  }, [selectedTable, loadTableData])

  const filteredData = searchText
    ? data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchText.toLowerCase())
        )
      )
    : data

  const tableColumns = columns.map(col => ({
    title: (
      <span style={styles.columnTitle}>
        {col}
        {col === 'id' && <Tag color="blue" style={{ marginLeft: 4 }}>PK</Tag>}
      </span>
    ),
    dataIndex: col,
    key: col,
    width: 180,
    ellipsis: true,
    render: (value: any, record: any, index: number) => {
      const isEditing = editingCell?.key === String(record.id) && editingCell?.field === col
      
      if (isEditing) {
        return (
          <Input
            autoFocus
            value={editingCell.value}
            onChange={e => handleCellChange(e.target.value)}
            onBlur={handleCellBlur}
            onPressEnter={handleCellBlur}
            size="small"
            style={{ width: 150 }}
          />
        )
      }
      
      return (
        <div 
          style={styles.cell}
          onClick={() => handleCellClick(String(record.id), col, value, index)}
        >
          <Tooltip title={String(value ?? '')}>
            <span>{value ?? '-'}</span>
          </Tooltip>
          <EditOutlined style={styles.editIcon} />
        </div>
      )
    }
  }))

  tableColumns.push({
    title: <span style={{ fontWeight: 500 }}>操作</span>,
    dataIndex: 'actions',
    key: 'actions',
    width: 120,
    ellipsis: true,
    render: (_: any, record: any) => (
      <Space size="small">
        <Popconfirm
          title="确定删除此行？"
          onConfirm={() => handleDeleteRow(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button 
            type="text" 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      </Space>
    )
  })

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>数据表格编辑器</span>
          <Select
            placeholder="选择数据表"
            value={selectedTable || undefined}
            onChange={setSelectedTable}
            style={{ width: 200, marginLeft: 16 }}
            allowClear
          >
            {tables.map(table => (
              <Select.Option key={table.id} value={table.name}>
                <Space>
                  <span>{table.name}</span>
                  <Tag>{table.columns?.length || 0}</Tag>
                </Space>
              </Select.Option>
            ))}
            <Select.Option value="users">users</Select.Option>
            <Select.Option value="orders">orders</Select.Option>
            <Select.Option value="products">products</Select.Option>
          </Select>
        </div>
        <Space>
          {hasChanges && <Tag color="warning">有未保存的更改</Tag>}
          <Input
            placeholder="搜索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAddModal(true)}
            disabled={!selectedTable}
          >
            添加行
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            保存
          </Button>
        </Space>
      </div>

      <div style={styles.tableContainer}>
        <Table
          dataSource={filteredData}
          columns={tableColumns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`
          }}
          scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
          size="small"
        />
      </div>

      <Modal
        title="添加新行"
        open={showAddModal}
        onOk={handleAddRow}
        onCancel={() => {
          setShowAddModal(false)
          setNewRow({})
        }}
        width={600}
      >
        <Card size="small">
          <div style={styles.formGrid}>
            {columns.filter(col => col !== 'id').map(col => (
              <div key={col} style={styles.formItem}>
                <label style={styles.formLabel}>{col}</label>
                <Input
                  value={newRow[col] || ''}
                  onChange={e => setNewRow(prev => ({ ...prev, [col]: e.target.value }))}
                  placeholder={`输入 ${col}`}
                />
              </div>
            ))}
          </div>
        </Card>
      </Modal>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fff',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  tableContainer: {
    flex: 1,
    padding: 16,
    overflow: 'auto',
  },
  columnTitle: {
    display: 'flex',
    alignItems: 'center',
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background 0.2s',
  },
  editIcon: {
    fontSize: 12,
    color: '#999',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  formItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 500,
  },
}

export default DataTableEditor
