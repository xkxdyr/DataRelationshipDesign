import React from 'react'
import { Form, Input, Select, Switch, Button, Checkbox, Space, Typography, Tag, message } from 'antd'
import { DatabaseOutlined, DownloadOutlined, LinkOutlined, CheckCircleOutlined, CiCircleOutlined } from '@ant-design/icons'
import { ConnectionConfig } from '../services/api'

const { Title, Text } = Typography

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

export interface ConnectionFormData {
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled: boolean
}

interface DatabaseImportFormProps {
  connections: ConnectionConfig[]
  selectedConnection: ConnectionConfig | null
  onConnectionSelect: (connectionId: string) => void
  onTestConnection: (data: ConnectionFormData) => void
  onLoadTables: (data: ConnectionFormData) => void
  onImport: (data: ConnectionFormData) => void
  tableList: string[]
  selectedTables: string[]
  onSelectTable: (table: string) => void
  onSelectAll: (checked: boolean) => void
  loading: boolean
  importLoading: boolean
  connectionTestResult: { success: boolean; message: string } | null
}

export const DatabaseImportForm: React.FC<DatabaseImportFormProps> = ({
  connections,
  selectedConnection,
  onConnectionSelect,
  onTestConnection,
  onLoadTables,
  onImport,
  tableList,
  selectedTables,
  onSelectTable,
  onSelectAll,
  loading,
  importLoading,
  connectionTestResult,
}) => {
  const [form] = Form.useForm()

  const handleDatabaseTypeChange = (value: string) => {
    const defaultPort = defaultPortMap[value] || 3306
    form.setFieldsValue({ port: defaultPort })
  }

  const handleConnectionSelect = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (connection) {
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
    onConnectionSelect(connectionId)
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* 始终渲染隐藏的 Form，确保 useForm 不会报警告 */}
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="databaseType"><Input /></Form.Item>
          <Form.Item name="host"><Input /></Form.Item>
          <Form.Item name="port"><Input /></Form.Item>
          <Form.Item name="databaseName"><Input /></Form.Item>
          <Form.Item name="username"><Input /></Form.Item>
          <Form.Item name="password"><Input /></Form.Item>
        </Form>
      </div>
      <Title level={4}>连接配置</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>配置数据库连接信息，从现有数据库导入表结构</Text>

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
          rules={[{ required: true, message: '请输入端口号' }, { type: 'number', message: '端口必须是数字' }]}
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

      {connectionTestResult && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            backgroundColor: connectionTestResult.success ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${connectionTestResult.success ? '#b7eb8f' : '#ffccc7'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {connectionTestResult.success ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CiCircleOutlined style={{ color: '#f5222d' }} />
            )}
            <Text>{connectionTestResult.message}</Text>
          </div>
        </div>
      )}

      <Space style={{ marginBottom: 24 }}>
        <Button
          type="default"
          icon={<LinkOutlined />}
          onClick={() => {
            const values = form.getFieldsValue() as Partial<ConnectionFormData>
            onTestConnection({
              databaseType: values.databaseType || 'MYSQL',
              host: values.host || 'localhost',
              port: typeof values.port === 'number' ? values.port : 3306,
              databaseName: values.databaseName || '',
              username: values.username || '',
              password: values.password || '',
              sslEnabled: values.sslEnabled || false,
            })
          }}
          loading={loading}
        >
          测试连接
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => {
            const values = form.getFieldsValue() as Partial<ConnectionFormData>
            onLoadTables({
              databaseType: values.databaseType || 'MYSQL',
              host: values.host || 'localhost',
              port: typeof values.port === 'number' ? values.port : 3306,
              databaseName: values.databaseName || '',
              username: values.username || '',
              password: values.password || '',
              sslEnabled: values.sslEnabled || false,
            })
          }}
          loading={loading}
          disabled={!connectionTestResult?.success}
        >
          获取表列表
        </Button>
      </Space>

      {tableList.length > 0 && (
        <div>
          <Title level={4}>选择要导入的表</Title>
          <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e8e8e8', borderRadius: 8, padding: 8 }}>
            <Checkbox
              checked={selectedTables.length === tableList.length && tableList.length > 0}
              onChange={(e) => onSelectAll(e.target.checked)}
              style={{ marginBottom: 8 }}
            >
              全选 ({tableList.length})
            </Checkbox>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tableList.map(table => (
                <Tag
                  key={table}
                  color={selectedTables.includes(table) ? 'blue' : 'default'}
                  closable={selectedTables.includes(table)}
                  onClose={(e) => {
                    e.preventDefault()
                    onSelectTable(table)
                  }}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => onSelectTable(table)}
                >
                  {table}
                </Tag>
              ))}
            </div>
          </div>

          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                const values = form.getFieldsValue() as Partial<ConnectionFormData>
                onImport({
                  databaseType: values.databaseType || 'MYSQL',
                  host: values.host || 'localhost',
                  port: typeof values.port === 'number' ? values.port : 3306,
                  databaseName: values.databaseName || '',
                  username: values.username || '',
                  password: values.password || '',
                  sslEnabled: values.sslEnabled || false,
                })
              }}
              loading={importLoading}
              disabled={selectedTables.length === 0}
            >
              导入选中的表 ({selectedTables.length})
            </Button>
          </Space>
        </div>
      )}
    </div>
  )
}