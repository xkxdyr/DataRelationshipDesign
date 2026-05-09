import React, { useState, useEffect } from 'react'
import { Modal, Input, Button, Space, Typography, Select, Card, Form, message, List, Tag, Divider, Alert, Popconfirm } from 'antd'
import { RobotOutlined, SettingOutlined, ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, RotateLeftOutlined } from '@ant-design/icons'
import { llmApi, TableSuggestion } from '../services/api'
import localStorageService from '../services/localStorageService'

const { Title, Text } = Typography
const { TextArea } = Input

interface LLMModalProps {
  visible: boolean
  onClose: () => void
  onApplyTables?: (tables: TableSuggestion[]) => void
}

interface CacheEntry {
  id: string
  description: string
  tables: TableSuggestion[]
  createdAt: number
}

const modelOptions = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' }
]

export const LLMModal: React.FC<LLMModalProps> = ({ visible, onClose, onApplyTables }) => {
  const [apiKey, setApiKey] = useState('')
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gpt-4')
  const [isConfigured, setIsConfigured] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDbType, setSelectedDbType] = useState<string>('')
  const [generatedTables, setGeneratedTables] = useState<TableSuggestion[]>([])
  const [activeTab, setActiveTab] = useState<'config' | 'generate'>('generate')
  const [form] = Form.useForm()
  const [cacheHistory, setCacheHistory] = useState<CacheEntry[]>([])

  useEffect(() => {
    if (visible) {
      loadConfig()
      loadCacheHistory()
    }
  }, [visible])

  const loadConfig = async () => {
    try {
      const response = await llmApi.getConfig()
      if (response.success && response.result) {
        setIsConfigured(response.result.configured)
        setEndpoint(response.result.endpoint)
        setModel(response.result.model)
      }
    } catch (error) {
      console.error('加载LLM配置失败:', error)
    }
  }

  const loadCacheHistory = async () => {
    try {
      const cached = await localStorageService.getMeta('llmTableCache')
      if (cached && Array.isArray(cached)) {
        setCacheHistory(cached)
      }
    } catch (error) {
      console.error('加载缓存历史失败:', error)
    }
  }

  const saveToCache = async (tables: TableSuggestion[]) => {
    try {
      const entry: CacheEntry = {
        id: Date.now().toString(),
        description: description.trim() || '未命名查询',
        tables: tables,
        createdAt: Date.now()
      }
      
      const updated = [entry, ...cacheHistory].slice(0, 10)
      setCacheHistory(updated)
      await localStorageService.setMeta('llmTableCache', updated)
    } catch (error) {
      console.error('保存到缓存失败:', error)
    }
  }

  const deleteFromCache = async (id: string) => {
    try {
      const updated = cacheHistory.filter(entry => entry.id !== id)
      setCacheHistory(updated)
      await localStorageService.setMeta('llmTableCache', updated)
      message.success('已删除缓存')
    } catch (error) {
      console.error('删除缓存失败:', error)
    }
  }

  const useCachedTables = (entry: CacheEntry) => {
    setGeneratedTables(entry.tables)
    setDescription(entry.description)
    message.success('已加载历史记录')
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      message.warning('请先输入API密钥')
      return
    }

    setTestingConnection(true)
    setConnectionStatus('idle')
    setStatusMessage('')

    try {
      const response = await llmApi.testConnection(apiKey, endpoint, model)
      if (response.success) {
        setConnectionStatus('success')
        setStatusMessage(`连接成功！模型: ${response.result?.model || model}`)
        message.success('连接测试成功')
      } else {
        setConnectionStatus('error')
        setStatusMessage(response.error || '连接失败')
        message.error(response.error || '连接测试失败')
      }
    } catch (error) {
      setConnectionStatus('error')
      setStatusMessage('连接失败: ' + (error as Error).message)
      message.error('连接测试失败: ' + (error as Error).message)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      message.warning('请输入API密钥')
      return
    }

    setLoading(true)
    try {
      const response = await llmApi.configure(apiKey, endpoint, model)
      if (response.success) {
        setIsConfigured(true)
        message.success('LLM配置成功')
        setApiKey('')
      } else {
        message.error(response.error || '配置失败')
      }
    } catch (error) {
      message.error('配置失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTables = async () => {
    if (!description.trim()) {
      message.warning('请输入表结构描述')
      return
    }

    setLoading(true)
    try {
      const response = await llmApi.generateTables(description, selectedDbType || undefined)
      if (response.success && response.result) {
        setGeneratedTables(response.result)
        await saveToCache(response.result)
        message.success('生成成功，共生成 ' + response.result.length + ' 个表（已自动缓存）')
      } else {
        message.error(response.error || '生成失败')
      }
    } catch (error) {
      message.error('生成失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (generatedTables.length > 0 && onApplyTables) {
      onApplyTables(generatedTables)
      message.success('已应用生成的表结构')
      onClose()
    }
  }

  const renderConfigTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {!isConfigured && (
        <Alert
          message="LLM服务未配置"
          description="请输入您的 OpenAI API 密钥来启用 AI 辅助功能"
          type="warning"
          showIcon
        />
      )}

      {isConfigured && (
        <Alert
          message="LLM服务已配置"
          description={`当前使用模型: ${model}`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item label="API 密钥" required>
          <Input.Password
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="API 端点">
          <Input
            placeholder="https://api.openai.com/v1"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="模型" extra="输入模型名称，如 gpt-4o">
          <Input 
            placeholder="输入模型名称，如 gpt-4o" 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
          />
        </Form.Item>
      </Form>

      {connectionStatus !== 'idle' && (
        <Alert
          message={connectionStatus === 'success' ? '连接成功' : '连接失败'}
          description={statusMessage}
          type={connectionStatus === 'success' ? 'success' : 'error'}
          showIcon
          closable
          onClose={() => setConnectionStatus('idle')}
        />
      )}

      <Space>
        <Button
          onClick={handleTestConnection}
          loading={testingConnection}
          icon={<CheckCircleOutlined />}
        >
          测试连接
        </Button>
        <Button
          type="primary"
          onClick={handleSaveConfig}
          loading={loading}
          icon={<SettingOutlined />}
        >
          保存配置
        </Button>
      </Space>
    </Space>
  )

  const renderGenerateTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {!isConfigured ? (
        <Alert
          message="请先配置 LLM 服务"
          description="在「配置」标签页中设置 API 密钥后，才能使用 AI 生成功能"
          type="info"
          showIcon
        />
      ) : (
        <>
          <div>
            <Text strong>业务描述</Text>
            <TextArea
              rows={4}
              placeholder="请描述您需要的表结构，例如：&#10;- 用户表，包含用户名、邮箱、密码、注册时间&#10;- 订单表，包含订单号、用户ID、金额、创建时间&#10;- 商品表，包含商品名称、价格、库存"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>

          <div>
            <Text strong>目标数据库类型（可选）</Text>
            <Select
              allowClear
              placeholder="不指定则使用通用类型"
              options={[
                { value: 'MYSQL', label: 'MySQL' },
                { value: 'POSTGRESQL', label: 'PostgreSQL' },
                { value: 'SQLITE', label: 'SQLite' },
                { value: 'SQLSERVER', label: 'SQL Server' }
              ]}
              value={selectedDbType}
              onChange={setSelectedDbType}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <Button
            type="primary"
            onClick={handleGenerateTables}
            loading={loading}
            icon={<RobotOutlined />}
          >
            生成表结构
          </Button>

          {cacheHistory.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <div>
                <Space align="center" style={{ marginBottom: 8 }}>
                  <ClockCircleOutlined style={{ fontSize: 14, color: '#1890ff' }} />
                  <Text strong>历史记录</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>（最多保存10条）</Text>
                </Space>
                <List
                  size="small"
                  dataSource={cacheHistory}
                  renderItem={(entry) => (
                    <List.Item
                      key={entry.id}
                      extra={
                        <Space size="small">
                          <Button
                                size="small"
                                icon={<RotateLeftOutlined />}
                                onClick={() => useCachedTables(entry)}
                              >
                                复用
                              </Button>
                          <Popconfirm
                            title="确定删除这条记录？"
                            onConfirm={() => deleteFromCache(entry.id)}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong>{entry.description}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatTime(entry.createdAt)}
                          </Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {entry.tables.map((table, idx) => (
                            <Tag key={idx} color="blue" style={{ marginRight: 4 }}>
                              {table.tableName}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}

          {generatedTables.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <div>
                <Text strong>生成的表结构：</Text>
                <List
                  size="small"
                  dataSource={generatedTables}
                  renderItem={(table) => (
                    <List.Item>
                      <Card size="small" style={{ width: '100%', marginTop: 8 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          {table.tableName}
                          {table.tableComment && <Tag style={{ marginLeft: 8 }}>{table.tableComment}</Tag>}
                        </Title>
                        <div style={{ marginTop: 8 }}>
                          {(table.columns || []).map((col, idx) => (
                            <Tag key={idx} style={{ marginBottom: 4 }}>
                              {col.name}: {col.dataType}
                              {col.primaryKey && <Tag color="gold" style={{ marginLeft: 4 }}>PK</Tag>}
                              {!col.nullable && <Tag color="red" style={{ marginLeft: 4 }}>NOT NULL</Tag>}
                            </Tag>
                          ))}
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              </div>

              <Button
                type="primary"
                onClick={handleApply}
                icon={<CheckCircleOutlined />}
              >
                应用到画布
              </Button>
            </>
          )}
        </>
      )}
    </Space>
  )

  return (
    <>
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="apiKey"><Input /></Form.Item>
          <Form.Item name="endpoint"><Input /></Form.Item>
          <Form.Item name="model"><Input /></Form.Item>
        </Form>
      </div>
      <Modal
        title={
          <Space>
            <RobotOutlined />
            <span>AI 助手</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type={activeTab === 'config' ? 'primary' : 'default'}
            onClick={() => setActiveTab('config')}
            icon={<SettingOutlined />}
          >
            配置
          </Button>
          <Button
            type={activeTab === 'generate' ? 'primary' : 'default'}
            onClick={() => setActiveTab('generate')}
            icon={<ThunderboltOutlined />}
          >
            生成表结构
          </Button>
        </div>

        {/* 始终渲染 Form，但只在 config 标签显示 */}
        <Form form={form} layout="vertical" style={{ display: 'none' }}>
          <Form.Item label="API 密钥" name="apiKey"><Input /></Form.Item>
          <Form.Item label="API 端点" name="endpoint"><Input /></Form.Item>
          <Form.Item label="模型" name="model"><Input /></Form.Item>
        </Form>

        {activeTab === 'config' ? renderConfigTab() : renderGenerateTab()}
      </Space>
    </Modal>
    </>
  )
}
