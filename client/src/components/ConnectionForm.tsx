import React from 'react'
import { Form, Input, Select, Switch, Button, Space, Typography, Card, Divider, message } from 'antd'
import { PlusOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, LinkOutlined, DatabaseOutlined, GlobalOutlined, UserOutlined, LockOutlined } from '@ant-design/icons'
import { useTheme } from '../theme/useTheme'

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

interface ConnectionFormData {
  id: string
  name: string
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled: boolean
  description?: string
  createdAt?: string
  updatedAt?: string
}

interface ConnectionFormProps {
  isEditing: boolean
  initialData?: ConnectionFormData | null
  onSubmit: (data: any) => void
  onTestConnection: (data?: any) => void
  onCancel: () => void
  testLoading: boolean
  testResult: { success: boolean; message: string; responseTime?: number } | null
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  isEditing,
  initialData,
  onSubmit,
  onTestConnection,
  onCancel,
  testLoading,
  testResult,
}) => {
  const [form] = Form.useForm()
  const { colors } = useTheme()

  React.useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        id: initialData.id,
        name: initialData.name,
        databaseType: initialData.databaseType,
        host: initialData.host,
        port: initialData.port,
        databaseName: initialData.databaseName,
        username: initialData.username,
        password: initialData.password,
        sslEnabled: initialData.sslEnabled,
        description: initialData.description,
      })
    } else {
      // 设置默认值
      form.setFieldsValue({
        host: 'localhost',
        port: 3306,
        databaseType: 'MYSQL',
      })
    }
  }, [initialData, form])

  const handleDatabaseTypeChange = (value: string) => {
    const defaultPort = defaultPortMap[value] || 3306
    form.setFieldsValue({ port: defaultPort })
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      onSubmit(values)
    }).catch(info => {
      console.log('Validation failed:', info)
    })
  }

  return (
    <div style={{ 
      width: 400, 
      flexShrink: 0, 
      borderLeft: `1px solid ${colors.border}`, 
      paddingLeft: 20,
      overflowY: 'auto',
      paddingRight: 4
    }}>
      {/* 始终渲染隐藏的 Form，确保 useForm 不会报警告 */}
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name"><Input /></Form.Item>
          <Form.Item name="description"><Input /></Form.Item>
          <Form.Item name="databaseType"><Input /></Form.Item>
          <Form.Item name="host"><Input /></Form.Item>
          <Form.Item name="port"><Input /></Form.Item>
          <Form.Item name="databaseName"><Input /></Form.Item>
          <Form.Item name="username"><Input /></Form.Item>
          <Form.Item name="password"><Input /></Form.Item>
        </Form>
      </div>
      
      <Card 
        size="small" 
        style={{ 
          background: colors.background,
          border: 'none'
        }}
        title={
          <Space>
            <DatabaseOutlined style={{ color: colors.primary }} />
            {isEditing ? '编辑连接' : '新建连接'}
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="连接名称"
            name="name"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input 
              placeholder="输入连接名称" 
              prefix={<DatabaseOutlined style={{ color: colors.textSecondary }} />}
            />
          </Form.Item>

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

          <Divider style={{ margin: '16px 0' }} />
          
          <Title level={5} style={{ marginBottom: 16, fontSize: 14 }}>连接配置</Title>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              label="主机地址"
              name="host"
              rules={[{ required: true, message: '请输入主机地址' }]}
              style={{ flex: 1 }}
            >
              <Input 
                placeholder="localhost" 
                prefix={<GlobalOutlined style={{ color: colors.textSecondary, fontSize: 14 }} />}
              />
            </Form.Item>

            <Form.Item
              label="端口"
              name="port"
              rules={[{ required: true, message: '请输入端口号' }]}
              style={{ width: 120 }}
            >
              <Input placeholder="3306" />
            </Form.Item>
          </div>

          <Form.Item
            label="数据库名称"
            name="databaseName"
            rules={[{ required: true, message: '请输入数据库名称' }]}
          >
            <Input 
              placeholder="database_name" 
              prefix={<DatabaseOutlined style={{ color: colors.textSecondary, fontSize: 14 }} />}
            />
          </Form.Item>

          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              placeholder="username" 
              prefix={<UserOutlined style={{ color: colors.textSecondary, fontSize: 14 }} />}
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
          >
            <Input.Password 
              placeholder="password" 
              prefix={<LockOutlined style={{ color: colors.textSecondary, fontSize: 14 }} />}
            />
          </Form.Item>

          <Form.Item
            label="SSL连接"
            name="sslEnabled"
            valuePropName="checked"
          >
            <Switch size="small" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea 
              placeholder="输入连接描述（可选）" 
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>

          {testResult && (
            <Card
              size="small"
              style={{
                marginBottom: 16,
                backgroundColor: testResult.success ? '#f6ffed' : '#fff2f0',
                borderColor: testResult.success ? '#b7eb8f' : '#ffccc7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {testResult.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{testResult.message}</div>
                  {testResult.responseTime && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      响应时间: {testResult.responseTime}ms
                    </Text>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="default"
              icon={<LinkOutlined />}
              onClick={() => {
                form.validateFields(['databaseType', 'host', 'port', 'databaseName', 'username']).then(values => {
                  // 获取完整表单数据，包含密码
                  const allValues = form.getFieldsValue()
                  onTestConnection(allValues)
                }).catch(() => {
                  message.warning('请先填写必填字段')
                })
              }}
              loading={testLoading}
              block
            >
              测试连接
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                onClick={onCancel}
                style={{ flex: 1 }}
              >
                取消
              </Button>
              <Button
                type="primary"
                icon={isEditing ? <EditOutlined /> : <PlusOutlined />}
                onClick={handleSubmit}
                style={{ flex: 1 }}
              >
                {isEditing ? '保存修改' : '创建连接'}
              </Button>
            </div>
          </Space>
        </Form>
      </Card>
    </div>
  )
}