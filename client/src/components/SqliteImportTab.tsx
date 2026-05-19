import React, { useState } from 'react'
import { Upload, Button, Space, Table, Tag, message, Alert, Tabs, Typography, Card } from 'antd'
import { InboxOutlined, DatabaseOutlined, TableOutlined, KeyOutlined, LinkOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { sqliteApi, SqliteTableInfo } from '../services/api'
import { tableApi, columnApi, relationshipApi } from '../services/api'
import { useAppStore } from '../stores/appStore'

const { Dragger } = Upload
const { Text, Title } = Typography

export const SqliteImportTab: React.FC = () => {
  const { currentProject, loadTables } = useAppStore()
  const [file, setFile] = useState<File | null>(null)
  const [tables, setTables] = useState<SqliteTableInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedTableNames, setSelectedTableNames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('preview')

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.db,.sqlite,.sqlite3',
    showUploadList: false,
    beforeUpload: (file) => {
      setFile(file)
      setError(null)
      handleRead(file)
      return false
    }
  }

  const handleRead = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const result = await sqliteApi.readFromFile(file)
      if (result.success && result.data?.tables) {
        setTables(result.data.tables)
        setSelectedTableNames(result.data.tables.map((t: SqliteTableInfo) => t.name))
        message.success(result.data.message || '读取成功')
      } else {
        setError(result.error || result.data?.message || '读取失败')
        setTables([])
      }
    } catch {
      setError('读取数据库文件失败')
      setTables([])
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!currentProject || selectedTableNames.length === 0) return
    setImporting(true)

    try {
      const selectedTables = tables.filter(t => selectedTableNames.includes(t.name))
      const positionX = 100
      const positionY = 100
      let colIndex = 0

      for (const tableInfo of selectedTables) {
        const x = positionX + colIndex * 320
        const y = positionY + Math.floor(colIndex / 3) * 400

        const tableResult = await tableApi.create(currentProject.id, {
          name: tableInfo.name,
          positionX: x,
          positionY: y
        })

        if (!tableResult.success || !tableResult.data) {
          message.error(`创建表 ${tableInfo.name} 失败`)
          continue
        }

        const newTableId = tableResult.data.id

        const columnData = tableInfo.columns.map((col, index) => ({
          name: col.name,
          dataType: col.type,
          nullable: col.nullable,
          primaryKey: col.primaryKey,
          defaultValue: col.defaultValue || undefined,
          order: index
        }))

        if (columnData.length > 0) {
          await columnApi.bulkCreate(newTableId, columnData)
        }

        for (const fk of tableInfo.foreignKeys) {
          const refTable = selectedTables.find(t => t.name === fk.referencedTable)
          if (refTable) {
            try {
              await relationshipApi.create(currentProject.id, {
                sourceTableId: newTableId,
                sourceColumnId: '',
                targetTableId: '',
                relationshipType: 'ONE_TO_MANY'
              })
            } catch {
              // 关系创建失败不中断整体导入
            }
          }
        }

        colIndex++
      }

      message.success(`成功导入 ${selectedTableNames.length} 个表`)
      await loadTables(currentProject.id)
      handleReset()
    } catch (err) {
      message.error('导入失败: ' + (err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setTables([])
    setSelectedTableNames([])
    setError(null)
    setActiveTab('preview')
  }

  const columnColumns = [
    { title: '列名', dataIndex: 'name', key: 'name', width: 120 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (t: string) => <Tag>{t}</Tag>
    },
    { title: '主键', dataIndex: 'primaryKey', key: 'primaryKey', width: 60,
      render: (v: boolean) => v ? <KeyOutlined style={{ color: '#faad14' }} /> : null
    },
    { title: '可空', dataIndex: 'nullable', key: 'nullable', width: 60,
      render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>
    },
    { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 100,
      render: (v: string | null) => v ? <Text type="secondary">{v}</Text> : '-'
    }
  ]

  const fkColumns = [
    { title: '本表列', dataIndex: 'column', key: 'column' },
    { title: '引用表', dataIndex: 'referencedTable', key: 'referencedTable' },
    { title: '引用列', dataIndex: 'referencedColumn', key: 'referencedColumn' }
  ]

  const tableSelection = {
    columns: [
      { title: '表名', dataIndex: 'name', key: 'name',
        render: (n: string) => <Space><TableOutlined /><Text strong>{n}</Text></Space>
      },
      { title: '列数', dataIndex: 'columns', key: 'colCount',
        render: (cols: any[]) => cols.length
      },
      { title: '外键', dataIndex: 'foreignKeys', key: 'fkCount',
        render: (fks: any[]) => fks.length > 0 ? <Tag color="blue">{fks.length}</Tag> : '-'
      },
      { title: '索引', dataIndex: 'indexes', key: 'idxCount',
        render: (idxs: any[]) => idxs.length > 0 ? <Tag color="purple">{idxs.length}</Tag> : '-'
      }
    ],
    rowKey: 'name',
    rowSelection: {
      selectedRowKeys: selectedTableNames,
      onChange: (keys: React.Key[]) => setSelectedTableNames(keys as string[])
    },
    dataSource: tables,
    size: 'small' as const,
    pagination: false as const,
    scroll: { y: 300 } as { y: number }
  }

  const previewTabs = tables.length > 0 ? [
    {
      key: 'overview',
      label: '表列表',
      children: (
        <Table {...tableSelection} />
      )
    },
    ...tables.filter(t => selectedTableNames.includes(t.name)).map(table => ({
      key: table.name,
      label: table.name,
      children: (
        <div>
          {table.foreignKeys.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                <LinkOutlined /> 外键关系
              </Text>
              <Table
                columns={fkColumns}
                dataSource={table.foreignKeys}
                rowKey={(r: any) => `${r.column}_${r.referencedTable}_${r.referencedColumn}`}
                size="small"
                pagination={false}
              />
            </div>
          )}
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            <TableOutlined /> 列定义 ({table.columns.length})
          </Text>
          <Table
            columns={columnColumns}
            dataSource={table.columns}
            rowKey="name"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
          />
        </div>
      )
    }))
  ] : []

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <DatabaseOutlined style={{ fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>导入 SQLite 数据库</span>
        </Space>
        {tables.length > 0 && (
          <Space>
            <Button onClick={handleReset}>重新选择</Button>
            <Button
              type="primary"
              onClick={handleImport}
              loading={importing}
              disabled={selectedTableNames.length === 0 || !currentProject}
              icon={<DatabaseOutlined />}
            >
              导入 {selectedTableNames.length} 个表
            </Button>
          </Space>
        )}
      </div>

      {!tables.length && !error && (
        <Dragger {...uploadProps} style={{ padding: '24px 0' }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 SQLite 数据库文件到此区域</p>
          <p className="ant-upload-hint">支持 .db / .sqlite / .sqlite3 格式，最大 100MB</p>
        </Dragger>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Text type="secondary">正在解析数据库结构...</Text>
        </div>
      )}

      {error && (
        <div>
          <Alert type="error" message="解析失败" description={error} showIcon style={{ marginBottom: 16 }} />
          <Dragger {...uploadProps} style={{ padding: '24px 0' }}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">重新选择文件</p>
            <p className="ant-upload-hint">支持 .db / .sqlite / .sqlite3 格式，最大 100MB</p>
          </Dragger>
        </div>
      )}

      {tables.length > 0 && !loading && (
        <div>
          {file && (
            <Alert
              type="success"
              message={`已解析「${file.name}」：${tables.length} 个表`}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          {!currentProject && (
            <Alert
              type="warning"
              message="请先在左侧选择一个项目，才能导入表"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={previewTabs}
          />
        </div>
      )}
    </div>
  )
}