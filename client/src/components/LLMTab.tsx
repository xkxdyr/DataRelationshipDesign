import React, { useState, useEffect, useMemo } from 'react'
import { Form, Input, Button, Space, Typography, Select, Card, message, List, Tag, Divider, Alert, Popconfirm, Modal, Radio, Tabs, Table, Switch } from 'antd'
import { RobotOutlined, SettingOutlined, ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, RotateLeftOutlined, XOutlined, PlusOutlined, DatabaseOutlined, KeyOutlined, TeamOutlined, UserOutlined, SafetyCertificateOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { llmApi, TableSuggestion, LLMConfigInfo, MockDataResult, MockDataRequest, ConnectionTestResult } from '../services/api'
import localStorageService from '../services/localStorageService'
import { useAppStore } from '../stores/appStore'
import type { Table as TableType, Column as ColumnType } from '../types'

const { Title, Text } = Typography
const { TextArea } = Input

interface LLMTabProps {
  onApplyTables?: (tables: TableSuggestion[]) => void
  onClose?: () => void
}

interface CacheEntry {
  id: string
  description: string
  tables: TableSuggestion[]
  createdAt: number
}

interface GenerateConfirmData {
  type: 'tables' | 'mock'
  description?: string
  tables?: TableSuggestion[]
  mockData?: MockDataResult
}

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'ollama', label: 'Ollama (本地)' },
  { value: 'zhipu', label: '智谱AI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom', label: '自定义' }
]

const modelOptions: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  azure: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' }
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' }
  ],
  ollama: [
    { value: 'llama3', label: 'Llama 3' },
    { value: 'llama3:8b', label: 'Llama 3 (8B)' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
    { value: 'gemma3', label: 'Gemma 3' },
    { value: 'deepseek-r1', label: 'DeepSeek R1' },
    { value: 'phi4', label: 'Phi-4' }
  ],
  zhipu: [
    { value: 'glm-4', label: 'GLM-4' },
    { value: 'glm-3-turbo', label: 'GLM-3 Turbo' }
  ],
  anthropic: [
    { value: 'claude-opus-20240229', label: 'Claude Opus' },
    { value: 'claude-sonnet-20240229', label: 'Claude Sonnet' }
  ],
  custom: []
}

const defaultEndpoints: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  azure: '',
  deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://localhost:11434/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  anthropic: 'https://api.anthropic.com/v1',
  custom: ''
}

const rowCountOptions = [10, 50, 100, 500, 1000]

export const LLMTab: React.FC<LLMTabProps> = ({ onApplyTables, onClose }) => {
  const { openTabs, closeTab, currentUser, currentProject, tables, getProjectSnapshot } = useAppStore()
  const [activeTab, setActiveTab] = useState<string>('configs')

  const [userConfigs, setUserConfigs] = useState<LLMConfigInfo[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [configForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [showNewConfig, setShowNewConfig] = useState(false)
  const [configScope, setConfigScope] = useState<'user' | 'team'>('user')

  const [description, setDescription] = useState('')
  const [selectedDbType, setSelectedDbType] = useState<string>('')
  const [generatedTables, setGeneratedTables] = useState<TableSuggestion[]>([])
  const [cacheHistory, setCacheHistory] = useState<CacheEntry[]>([])

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmData, setConfirmData] = useState<GenerateConfirmData | null>(null)

  const [selectedTableForMock, setSelectedTableForMock] = useState<string>('')
  const [mockRowCount, setMockRowCount] = useState(100)
  const [generatedMockData, setGeneratedMockData] = useState<MockDataResult | null>(null)
  const [testResultModal, setTestResultModal] = useState<ConnectionTestResult | null>(null)

  const selectedProvider = Form.useWatch('provider', configForm) || 'openai'

  useEffect(() => {
    loadUserConfigs()
    loadCacheHistory()
  }, [])

  const loadUserConfigs = async () => {
    if (!currentUser) return
    try {
      const response = await llmApi.getUserConfigs(currentUser.id)
      if (response.success && response.data) {
        setUserConfigs(response.data)
        const defaultConfig = response.data.find(c => c.isDefault)
        if (defaultConfig) {
          setSelectedConfigId(defaultConfig.id)
        }
      }
    } catch (error) {
      console.error('加载用户配置失败:', error)
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

  const handleProviderChange = (value: string) => {
    const endpoint = defaultEndpoints[value] || ''
    configForm.setFieldsValue({ endpoint })
    const models = modelOptions[value] || []
    if (models.length > 0) {
      configForm.setFieldsValue({ model: [models[0].value] })
    } else {
      configForm.setFieldsValue({ model: undefined })
    }
  }

  const handleTestConnection = async () => {
    const values = await configForm.validateFields().catch(() => null)
    if (!values) return

    setTestingConnection(true)
    try {
      const modelValue = values.model
      const model = Array.isArray(modelValue) ? modelValue[0] : modelValue
      
      const response = await llmApi.testConnection(undefined, values.apiKey, values.endpoint, model, values.provider)
      if (response.success && response.data) {
        setTestResultModal(response.data)
      } else if (response.data) {
        setTestResultModal(response.data)
      } else {
        setTestResultModal({
          success: false,
          error: response.error || '连接失败',
          security: {
            isHttps: false, isLocalhost: false, endpointSecure: false,
            apiKeyMasked: '', apiKeyStrength: 'none', warnings: [],
            score: 'unsafe', summary: '未知'
          },
          availability: { tested: false, responseTimeMs: 0, modelConfirmed: false, modelReported: '', capable: false, details: '无可用性数据' }
        })
      }
    } catch (error) {
      setTestResultModal({
        success: false,
        error: '连接测试失败: ' + (error as Error).message,
        security: {
          isHttps: false, isLocalhost: false, endpointSecure: false,
          apiKeyMasked: '', apiKeyStrength: 'none', warnings: [],
          score: 'unsafe', summary: '未知'
        },
        availability: { tested: false, responseTimeMs: 0, modelConfirmed: false, modelReported: '', capable: false, details: '无可用性数据' }
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!currentUser) {
      message.warning('请先登录')
      return
    }

    const values = await configForm.validateFields().catch(() => null)
    if (!values) return

    const isOllama = values.provider === 'ollama'
    if (!values.name) {
      message.warning('请输入配置名称')
      return
    }
    if (!isOllama && !values.apiKey) {
      message.warning('请输入API密钥')
      return
    }

    const modelValue = values.model
    const model = Array.isArray(modelValue) ? modelValue[0] : modelValue

    setLoading(true)
    try {
      const configData = {
        name: values.name,
        provider: values.provider,
        model: model,
        endpoint: values.endpoint,
        apiKey: values.apiKey,
        description: values.description,
        isDefault: values.isDefault || false
      }

      const response = await llmApi.createUserConfig(currentUser.id, configData)
      if (response.success) {
        message.success('配置保存成功')
        setShowNewConfig(false)
        configForm.resetFields()
        loadUserConfigs()
      } else {
        message.error(response.error || '保存失败')
      }
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    try {
      await llmApi.deleteConfig(configId)
      message.success('配置已删除')
      if (selectedConfigId === configId) {
        setSelectedConfigId('')
      }
      loadUserConfigs()
    } catch (error) {
      message.error('删除失败: ' + (error as Error).message)
    }
  }

  const createSnapshotIfNeeded = async () => {
    if (!currentProject) return null
    try {
      const snapshot = getProjectSnapshot()
      if (snapshot) {
        const response = await llmApi.createSnapshot(
          currentProject.id,
          'ai_generate',
          'AI生成表结构前快照',
          snapshot
        )
        return response.data?.id
      }
    } catch (error) {
      console.error('创建快照失败:', error)
    }
    return null
  }

  const handleGenerateTables = async () => {
    if (!description.trim()) {
      message.warning('请输入表结构描述')
      return
    }

    setLoading(true)
    try {
      await createSnapshotIfNeeded()
      
      const response = await llmApi.generateTables(
        description,
        selectedDbType || undefined,
        selectedConfigId || undefined
      )
      
      if (response.success && response.data) {
        setConfirmData({
          type: 'tables',
          description,
          tables: response.data
        })
        setConfirmModalVisible(true)
        await saveToCache(response.data)
      } else {
        message.error(response.error || '生成失败')
      }
    } catch (error) {
      message.error('生成失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmGenerate = () => {
    if (!confirmData) return

    if (confirmData.type === 'tables' && confirmData.tables) {
      setGeneratedTables(confirmData.tables)
      message.success('生成成功，共生成 ' + confirmData.tables.length + ' 个表')
    }

    setConfirmModalVisible(false)
    setConfirmData(null)
  }

  const handleApply = () => {
    if (generatedTables.length > 0 && onApplyTables) {
      onApplyTables(generatedTables)
      message.success('已应用生成的表结构')
      handleClose()
    }
  }

  const handleGenerateMockData = async () => {
    if (!selectedTableForMock || !currentProject) {
      message.warning('请选择要生成数据的表')
      return
    }

    const table = tables.find((t: TableType) => t.id === selectedTableForMock)
    if (!table || !table.columns) {
      message.warning('表不存在或没有字段')
      return
    }

    const request: MockDataRequest = {
      tableName: table.name,
      columns: (table.columns || []).map((col: ColumnType) => ({
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        primaryKey: col.primaryKey,
        unique: col.unique,
        comment: col.comment
      })),
      rowCount: mockRowCount
    }

    setLoading(true)
    try {
      const response = await llmApi.generateMockData(request)
      if (response.success && response.data) {
        setGeneratedMockData(response.data)
        message.success(`成功生成 ${response.data.rows.length} 条模拟数据`)
      } else {
        message.error(response.error || '生成失败')
      }
    } catch (error) {
      message.error('生成失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      const llmTab = openTabs.find(tab => tab.type === 'llm')
      if (llmTab) {
        closeTab(llmTab.id)
      }
      onClose()
    }
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

  const configsContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title={
        <Space>
          <KeyOutlined />
          <span>模型配置管理</span>
        </Space>
      } extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            configForm.resetFields()
            configForm.setFieldsValue({
              provider: 'ollama',
              endpoint: defaultEndpoints.ollama,
              model: ['llama3'],
              isDefault: false
            })
            setShowNewConfig(true)
          }}
        >
          新建配置
        </Button>
      }>
        {userConfigs.length === 0 ? (
          <Alert
            message="暂无配置"
            description="点击「新建配置」添加您的大模型配置"
            type="info"
            showIcon
          />
        ) : (
          <List
            dataSource={userConfigs}
            renderItem={(config) => (
              <List.Item
                key={config.id}
                actions={[
                  <Button
                    key="select"
                    type={selectedConfigId === config.id ? 'primary' : 'default'}
                    onClick={() => setSelectedConfigId(config.id)}
                  >
                    {selectedConfigId === config.id ? '已选择' : '选择'}
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确定删除此配置？"
                    onConfirm={() => handleDeleteConfig(config.id)}
                  >
                    <Button danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {config.name}
                      {config.isDefault && <Tag color="blue">默认</Tag>}
                      <Tag color={config.ownerType === 'user' ? 'green' : 'purple'}>
                        {config.ownerType === 'user' ? <UserOutlined /> : <TeamOutlined />}
                        {' '}{config.ownerType === 'user' ? '个人' : '团队'}
                      </Tag>
                      <Tag>{config.provider}</Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <Text type="secondary">模型: {config.model}</Text>
                      <Text type="secondary">端点: {config.endpoint}</Text>
                      {config.description && <Text type="secondary">{config.description}</Text>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {showNewConfig && (
        <Card size="small" title="新建配置">
          <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
            <Form.Item label="配置范围">
              <Radio.Group value={configScope} onChange={(e) => setConfigScope(e.target.value)}>
                <Radio value="user"><UserOutlined /> 个人配置（仅自己可见）</Radio>
                <Radio value="team" disabled><TeamOutlined /> 团队配置（成员共享）</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入配置名称' }]}>
              <Input placeholder="例如：我的 OpenAI 配置" />
            </Form.Item>

            <Form.Item name="provider" label="服务提供商" rules={[{ required: true }]}>
              <Select options={providerOptions} onChange={handleProviderChange} />
            </Form.Item>

            <Form.Item name="model" label="模型名称" rules={[{ required: true }]}>
              <Select
                options={modelOptions[selectedProvider] || []}
                placeholder="选择或输入模型名称"
                mode="tags"
                maxTagCount={1}
              />
            </Form.Item>

            <Form.Item name="endpoint" label="API 端点" rules={[{ required: true, message: '请输入API端点' }]}>
              <Input placeholder="https://api.openai.com/v1" />
            </Form.Item>

            <Form.Item name="apiKey" label="API 密钥" rules={[{ required: selectedProvider !== 'ollama', message: '请输入API密钥' }]}>
              <Input.Password placeholder={selectedProvider === 'ollama' ? 'Ollama 本地无需密钥，可留空' : 'sk-...'} />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input placeholder="可选的配置描述" />
            </Form.Item>

            <Form.Item name="isDefault" label="设为默认配置" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>

            <Alert
              message="安全提示"
              description="API密钥将使用 AES-256-GCM 加密存储，确保数据安全"
              type="warning"
              showIcon
              icon={<SafetyCertificateOutlined />}
            />

            <Divider style={{ margin: '16px 0' }} />

            <Space>
              <Button onClick={handleTestConnection} loading={testingConnection} icon={<CheckCircleOutlined />}>
                测试连接
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SettingOutlined />}>
                保存配置
              </Button>
              <Button onClick={() => setShowNewConfig(false)}>取消</Button>
            </Space>
          </Form>
        </Card>
      )}
    </Space>
  ), [userConfigs, selectedConfigId, showNewConfig, selectedProvider, testingConnection, loading, configScope])

  const generateContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {userConfigs.length === 0 ? (
        <Alert
          message="请先配置模型"
          description="在「配置」标签页中添加大模型配置后，才能使用 AI 生成功能"
          type="info"
          showIcon
        />
      ) : (
        <>
          <Card size="small">
            <Form layout="vertical">
              <Form.Item label="选择配置">
                <Select
                  value={selectedConfigId}
                  onChange={setSelectedConfigId}
                  placeholder="选择要使用的模型配置"
                  style={{ width: '100%' }}
                  options={userConfigs.map(c => ({
                    value: c.id,
                    label: `${c.name} (${c.provider}/${c.model})`
                  }))}
                />
              </Form.Item>
            </Form>
          </Card>

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

          <Alert
            message="操作确认"
            description="AI生成的表结构将在应用前显示预览，并自动创建当前项目快照以便回滚"
            type="info"
            showIcon
          />

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
  ), [userConfigs, selectedConfigId, description, selectedDbType, loading, cacheHistory, generatedTables])

  const mockContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title={
        <Space>
          <DatabaseOutlined />
          <span>数据模拟生成</span>
        </Space>
      }>
        <Form layout="vertical">
          <Form.Item label="选择表">
            <Select
              value={selectedTableForMock}
              onChange={setSelectedTableForMock}
              placeholder="选择要生成数据的表"
              style={{ width: '100%' }}
              options={(tables || []).map((t: TableType) => ({
                value: t.id,
                label: `${t.name}${t.comment ? ` (${t.comment})` : ''}`
              }))}
            />
          </Form.Item>

          <Form.Item label="生成数量">
            <Select
              value={mockRowCount}
              onChange={setMockRowCount}
              options={rowCountOptions.map(n => ({ value: n, label: `${n} 条` }))}
            />
          </Form.Item>
        </Form>

        <Alert
          message="数据模拟说明"
          description="根据表结构自动生成测试数据，支持中文姓名、邮箱、电话、城市等真实场景数据"
          type="info"
          showIcon
        />

        <Button
          type="primary"
          onClick={handleGenerateMockData}
          loading={loading}
          disabled={!selectedTableForMock}
          style={{ marginTop: 16 }}
        >
          生成模拟数据
        </Button>
      </Card>

      {generatedMockData && (
        <Card size="small" title={
          <Space>
            <span>生成结果</span>
            <Tag color="green">{generatedMockData.rows.length} 条数据</Tag>
          </Space>
        }>
          <Tabs
            defaultActiveKey="preview"
            items={[
              {
                key: 'preview',
                label: '数据预览',
                children: (
                  <Table
                    size="small"
                    rowKey={(record: any) => record._key || record.id || JSON.stringify(record)}
                    dataSource={generatedMockData.rows.slice(0, 20)}
                    pagination={{ pageSize: 10, total: generatedMockData.rows.length > 20 ? 20 : generatedMockData.rows.length, showTotal: (total: number) => `共 ${total} 条，仅显示前 20 条` }}
                    columns={(generatedMockData.columns || []).map(col => ({
                      title: col.name,
                      dataIndex: col.name,
                      key: col.name,
                      ellipsis: true,
                      render: (value: any) => {
                        if (value === null || value === undefined) return <Text type="secondary">NULL</Text>
                        if (typeof value === 'object') return JSON.stringify(value)
                        return String(value)
                      }
                    }))}
                    scroll={{ x: 800 }}
                  />
                )
              },
              {
                key: 'sql',
                label: 'SQL 语句',
                children: (
                  <>
                    <TextArea
                      rows={10}
                      readOnly
                      value={generatedMockData.sql}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <Button
                      type="primary"
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        navigator.clipboard?.writeText(generatedMockData.sql)
                        message.success('SQL已复制到剪贴板')
                      }}
                    >
                      复制 SQL
                    </Button>
                  </>
                )
              }
            ]}
          />
        </Card>
      )}
    </Space>
  ), [selectedTableForMock, mockRowCount, loading, generatedMockData])

  const mainTabItems = [
    {
      key: 'configs',
      label: (
        <span>
          <KeyOutlined /> 配置管理
        </span>
      ),
      children: configsContent
    },
    {
      key: 'generate',
      label: (
        <span>
          <ThunderboltOutlined /> 生成表结构
        </span>
      ),
      children: generateContent
    },
    {
      key: 'mock',
      label: (
        <span>
          <DatabaseOutlined /> 数据模拟
        </span>
      ),
      children: mockContent
    }
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined />
          AI助手
        </Title>
        {onClose && (
          <Button
            type="text"
            icon={<XOutlined />}
            onClick={handleClose}
          >
            关闭
          </Button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={mainTabItems}
        />
      </div>

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>确认 AI 操作</span>
          </Space>
        }
        open={confirmModalVisible}
        onOk={handleConfirmGenerate}
        onCancel={() => {
          setConfirmModalVisible(false)
          setConfirmData(null)
        }}
        okText="确认应用"
        cancelText="取消"
        width={700}
      >
        {confirmData?.type === 'tables' && confirmData.tables && (
          <div>
            <Alert
              message="即将应用 AI 生成的表结构"
              description={`将创建 ${confirmData.tables.length} 个表：${confirmData.tables.map(t => t.tableName).join(', ')}`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Card size="small" title="已自动创建快照">
              <Text type="secondary">
                在应用更改前已自动创建当前项目快照。如有问题可在版本管理中恢复。
              </Text>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        title="连接测试报告"
        open={testResultModal !== null}
        onCancel={() => setTestResultModal(null)}
        footer={<Button onClick={() => setTestResultModal(null)}>关闭</Button>}
        width={650}
        destroyOnHidden
      >
        {testResultModal && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              type={testResultModal.success ? 'success' : 'error'}
              message={testResultModal.success ? '连接测试通过' : '连接测试失败'}
              description={testResultModal.success ? `模型: ${testResultModal.model || '未知'}` : testResultModal.error || '未知错误'}
              showIcon
              icon={testResultModal.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            />

            {testResultModal.security && (
              <Card size="small" title={
                <Space>
                  <SafetyCertificateOutlined style={{ color: testResultModal.security.score === 'safe' ? '#52c41a' : testResultModal.security.score === 'warning' ? '#faad14' : '#ff4d4f' }} />
                  <span>安全性评估</span>
                  <Tag color={testResultModal.security.score === 'safe' ? 'success' : testResultModal.security.score === 'warning' ? 'warning' : 'error'}>
                    {testResultModal.security.score === 'safe' ? '安全' : testResultModal.security.score === 'warning' ? '注意' : '危险'}
                  </Tag>
                </Space>
              }>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">传输加密：</Text>
                    <Tag color={testResultModal.security.isHttps ? 'success' : (testResultModal.security.isLocalhost ? 'warning' : 'error')}>
                      {testResultModal.security.isHttps ? 'HTTPS 加密' : (testResultModal.security.isLocalhost ? 'HTTP (本地)' : 'HTTP 明文')}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">连接类型：</Text>
                    <Tag color={testResultModal.security.isLocalhost ? 'processing' : 'default'}>
                      {testResultModal.security.isLocalhost ? '本地连接' : '远程连接'}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">密钥信息：</Text>
                    <Text code>{testResultModal.security.apiKeyMasked || '无'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">密钥强度：</Text>
                    <Tag color={
                      testResultModal.security.apiKeyStrength === 'strong' ? 'success' :
                      testResultModal.security.apiKeyStrength === 'good' ? 'processing' :
                      testResultModal.security.apiKeyStrength === 'weak' ? 'warning' : 'default'
                    }>
                      {testResultModal.security.apiKeyStrength === 'strong' ? '强' :
                       testResultModal.security.apiKeyStrength === 'good' ? '良好' :
                       testResultModal.security.apiKeyStrength === 'weak' ? '弱' : '无'}
                    </Tag>
                  </div>
                  {testResultModal.security.warnings.length > 0 && (
                    <div>
                      <Text type="secondary">安全警告：</Text>
                      {testResultModal.security.warnings.map((w, i) => (
                        <Alert key={i} message={w} type="warning" showIcon style={{ marginTop: 4 }} />
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{testResultModal.security.summary}</Text>
                  </div>
                </Space>
              </Card>
            )}

            {testResultModal.availability && (
              <Card size="small" title={
                <Space>
                  <ThunderboltOutlined style={{ color: testResultModal.availability.capable ? '#52c41a' : '#ff4d4f' }} />
                  <span>可用性评估</span>
                  <Tag color={testResultModal.availability.capable ? 'success' : 'error'}>
                    {testResultModal.availability.capable ? '可用' : testResultModal.availability.tested ? '不可用' : '未测试'}
                  </Tag>
                </Space>
              }>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {testResultModal.availability.tested ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">响应时间：</Text>
                        <Tag color={testResultModal.availability.responseTimeMs < 1000 ? 'success' : testResultModal.availability.responseTimeMs < 5000 ? 'warning' : 'error'}>
                          {testResultModal.availability.responseTimeMs}ms
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">模型确认：</Text>
                        <Tag color={testResultModal.availability.modelConfirmed ? 'success' : 'warning'}>
                          {testResultModal.availability.modelConfirmed ? '已确认' : '未确认（使用请求模型）'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">服务器模型：</Text>
                        <Text code>{testResultModal.availability.modelReported || '-'}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{testResultModal.availability.details}</Text>
                    </>
                  ) : (
                    <Text type="secondary">连接未成功，无法进行可用性测试</Text>
                  )}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default LLMTab
