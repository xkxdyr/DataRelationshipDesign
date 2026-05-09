import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Switch, Button, Checkbox, Space, Typography, Tag, message, Card } from 'antd'
import { DatabaseOutlined, PlayCircleOutlined, EyeOutlined, CheckCircleOutlined, CiCircleOutlined } from '@ant-design/icons'
import { connectionApi, databaseSyncApi, ConnectionConfig, SyncConnection, TableSchema, ColumnSchema, IndexSchema, ForeignKeySchema } from '../services/api'
import { Table } from '../types'

const { Title, Text } = Typography

interface DatabaseSyncModalProps {
  visible: boolean
  onClose: () => void
  tables: Table[]
}

const databaseTypes = [
  { value: 'MYSQL', label: 'MySQL' },
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQLITE', label: 'SQLite' },
  { value: 'SQLSERVER', label: 'SQL Server' },
  { value: 'ORACLE', label: 'Oracle' },
]

const defaultPortMap: Record<string, number> = {
  MYSQL: 3306,
  POSTGRESQL: 5432,
  SQLITE: 0,
  SQLSERVER: 1433,
  ORACLE: 1521,
}

type Step = 'connection' | 'preview' | 'result'

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({ visible, onClose, tables }) => {
  const [step, setStep] = useState<Step>('connection')
  const [connections, setConnections] = useState<ConnectionConfig[]>([])
  const [selectedConnection, setSelectedConnection] = useState<ConnectionConfig | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [generatedDDL, setGeneratedDDL] = useState('')
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      loadConnections()
      if (tables.length > 0) {
        setSelectedTables(tables.map(t => t.id))
      }
      setStep('connection')
      setGeneratedDDL('')
      setSyncResult(null)
    }
  }, [visible])

  const loadConnections = async () => {
    try {
      const result = await connectionApi.getAll()
      if (result.success && result.data) {
        setConnections(result.data)
      }
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const handleConnectionSelect = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (connection) {
      setSelectedConnection(connection)
      form.setFieldsValue({
        databaseType: connection.databaseType,
        host: connection.host,
        port: connection.port,
        databaseName: connection.databaseName,
        username: connection.username,
        password: connection.password,
        sslEnabled: connection.sslEnabled,
      })
    }
  }

  const handleDatabaseTypeChange = (value: string) => {
    const defaultPort = defaultPortMap[value] || 3306
    form.setFieldsValue({ port: defaultPort })
  }

  const handlePreview = async () => {
    if (selectedTables.length === 0) {
      message.warning('请至少选择一张表')
      return
    }

    setLoading(true)
    try {
      const values = form.getFieldsValue() as Partial<SyncConnection>
      const connection: SyncConnection = {
        databaseType: values.databaseType || 'MYSQL',
        host: values.host || 'localhost',
        port: typeof values.port === 'number' ? values.port : 3306,
        databaseName: values.databaseName || '',
        username: values.username || '',
        password: values.password || '',
        sslEnabled: values.sslEnabled || false,
      }

      const tableSchemas = tables
        .filter(t => selectedTables.includes(t.id))
        .map(table => convertToTableSchema(table))

      const result = await databaseSyncApi.dryRun(connection, tableSchemas)
      if (result.success && result.data) {
        setGeneratedDDL(result.data.ddl)
        setStep('preview')
      } else {
        message.error(result.data?.message || '生成DDL失败')
      }
    } catch (error) {
      message.error('生成DDL失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue() as Partial<SyncConnection>
      const connection: SyncConnection = {
        databaseType: values.databaseType || 'MYSQL',
        host: values.host || 'localhost',
        port: typeof values.port === 'number' ? values.port : 3306,
        databaseName: values.databaseName || '',
        username: values.username || '',
        password: values.password || '',
        sslEnabled: values.sslEnabled || false,
      }

      const tableSchemas = tables
        .filter(t => selectedTables.includes(t.id))
        .map(table => convertToTableSchema(table))

      const result = await databaseSyncApi.syncToDatabase(connection, tableSchemas)
      if (result.success && result.data) {
        setSyncResult({ success: true, message: result.data.message })
      } else {
        setSyncResult({ 
          success: false, 
          message: result.data?.message || '同步失败',
          errors: result.data?.errors 
        })
      }
      setStep('result')
    } catch (error) {
      setSyncResult({ success: false, message: '同步失败' })
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedTables(checked ? tables.map(t => t.id) : [])
  }

  const handleSelectTable = (tableId: string) => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId))
    } else {
      setSelectedTables([...selectedTables, tableId])
    }
  }

  const convertToTableSchema = (table: Table): TableSchema => {
    const columns: ColumnSchema[] = table.columns.map((col: { name: string; dataType: string; nullable: boolean; defaultValue?: string; autoIncrement: boolean; primaryKey: boolean; unique: boolean; comment?: string }) => ({
      name: col.name,
      dataType: col.dataType,
      nullable: col.nullable,
      defaultValue: col.defaultValue,
      autoIncrement: col.autoIncrement,
      primaryKey: col.primaryKey,
      unique: col.unique,
      comment: col.comment,
    }))

    const indexes: IndexSchema[] = (table.indexes || []).map((idx: { name: string; columns: string[]; unique: boolean; type: string }) => ({
      name: idx.name,
      columns: idx.columns,
      unique: idx.unique,
      primary: idx.type === 'PRIMARY',
    }))

    const foreignKeys: ForeignKeySchema[] = []

    return {
      name: table.name,
      comment: table.comment,
      columns,
      indexes,
      foreignKeys,
    }
  }

  const resetAndClose = () => {
    setStep('connection')
    setGeneratedDDL('')
    setSyncResult(null)
    setSelectedTables([])
    setSelectedConnection(null)
    form.resetFields()
    onClose()
  }

  return (
    <>
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="databaseType"><Input /></Form.Item>
          <Form.Item name="host"><Input /></Form.Item>
          <Form.Item name="port"><Input /></Form.Item>
          <Form.Item name="databaseName"><Input /></Form.Item>
          <Form.Item name="username"><Input /></Form.Item>
          <Form.Item name="password"><Input /></Form.Item>
          <Form.Item name="sslEnabled"><Input /></Form.Item>
        </Form>
      </div>
      <Modal
        title={<><DatabaseOutlined style={{ marginRight: 8 }} />数据库同步</>}
        open={visible}
        onCancel={resetAndClose}
        width={900}
        footer={null}
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div
            className={`flex-1 text-center py-2 rounded-lg ${step === 'connection' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
            style={{ backgroundColor: step === 'connection' ? 'var(--theme-selected)' : 'var(--theme-background-secondary)', color: step === 'connection' ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}
          >
            1. 连接配置
          </div>
          <div
            className={`flex-1 text-center py-2 rounded-lg ${step === 'preview' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
            style={{ backgroundColor: step === 'preview' ? 'var(--theme-selected)' : 'var(--theme-background-secondary)', color: step === 'preview' ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}
          >
            2. 预览DDL
          </div>
          <div
            className={`flex-1 text-center py-2 rounded-lg ${step === 'result' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
            style={{ backgroundColor: step === 'result' ? 'var(--theme-selected)' : 'var(--theme-background-secondary)', color: step === 'result' ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}
          >
            3. 同步结果
          </div>
        </div>

        {step === 'connection' && (
          <div>
            <Title level={4}>连接配置</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>配置目标数据库连接信息</Text>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>使用已保存的连接</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="选择已保存的连接配置"
                options={connections.map(c => ({ value: c.id, label: c.name }))}
                onChange={handleConnectionSelect}
                allowClear
              />
              {selectedConnection && (
                <Tag color="blue" style={{ marginTop: 8, display: 'inline-block' }}>
                  已加载: {selectedConnection.name}
                </Tag>
              )}
            </div>

            <Form
              form={form}
              layout="vertical"
            >
              <Form.Item
                label="数据库类型"
                name="databaseType"
                rules={[{ required: true, message: '请选择数据库类型' }]}
              >
                <Select
                  placeholder="选择数据库类型"
                  options={databaseTypes}
                  onChange={handleDatabaseTypeChange}
                />
              </Form.Item>

              <Form.Item
                label="主机地址"
                name="host"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="localhost" />
              </Form.Item>

              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: true, message: '请输入端口号' }]}
              >
                <Input placeholder="3306" />
              </Form.Item>

              <Form.Item
                label="数据库名称"
                name="databaseName"
                rules={[{ required: true, message: '请输入数据库名称' }]}
              >
                <Input placeholder="database_name" />
              </Form.Item>

              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="username" />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
              >
                <Input.Password placeholder="password" />
              </Form.Item>

              <Form.Item
                label="SSL连接"
                name="sslEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Form>

            <Title level={4} style={{ marginTop: 24 }}>选择要同步的表</Title>
            <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid #e8e8e8', borderRadius: 8, padding: 8 }}>
              <Checkbox
                checked={selectedTables.length === tables.length && tables.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                style={{ marginBottom: 8 }}
              >
                全选 ({tables.length})
              </Checkbox>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tables.map(table => (
                  <Tag
                    key={table.id}
                    color={selectedTables.includes(table.id) ? 'blue' : 'default'}
                    closable={selectedTables.includes(table.id)}
                    onClose={(e) => {
                      e.preventDefault()
                      handleSelectTable(table.id)
                    }}
                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                    onClick={() => handleSelectTable(table.id)}
                  >
                    {table.name}
                  </Tag>
                ))}
              </div>
            </div>

            <Space style={{ marginTop: 24 }}>
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={loading}
                disabled={selectedTables.length === 0}
              >
                预览DDL
              </Button>
            </Space>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <Title level={4}>DDL预览</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>以下是即将执行的DDL语句，请仔细检查后再执行同步</Text>

            <Card style={{ marginBottom: 16 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto', fontSize: 13, fontFamily: 'monospace', color: '#52c41a' }}>
                {generatedDDL || '暂无DDL'}
              </pre>
            </Card>

            <Space>
              <Button
                onClick={() => setStep('connection')}
              >
                返回
              </Button>
              <Button
                type="primary"
                danger
                icon={<PlayCircleOutlined />}
                onClick={handleSync}
                loading={loading}
              >
                执行同步
              </Button>
            </Space>
          </div>
        )}

        {step === 'result' && (
          <div>
            <Title level={4}>同步结果</Title>
            <div
              style={{
                padding: 24,
                borderRadius: 8,
                marginBottom: 16,
                backgroundColor: syncResult?.success ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${syncResult?.success ? '#b7eb8f' : '#ffccc7'}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {syncResult?.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CiCircleOutlined style={{ color: '#f5222d' }} />
                )}
              </div>
              <Title level={3} style={{ color: syncResult?.success ? '#52c41a' : '#f5222d' }}>
                {syncResult?.success ? '同步成功' : '同步失败'}
              </Title>
              <Text style={{ marginTop: 8, display: 'block' }}>
                {syncResult?.message}
              </Text>
            </div>

            {syncResult?.errors && syncResult.errors.length > 0 && (
              <Card title="错误详情" bordered={false}>
                <ul>
                  {syncResult.errors.map((error, index) => (
                    <li key={index} style={{ color: '#f5222d' }}>{error}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                onClick={resetAndClose}
              >
                完成
              </Button>
            </Space>
          </div>
        )}
      </div>
    </Modal>
    </>
  )
}