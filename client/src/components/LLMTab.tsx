import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Form, Input, Button, Space, Typography, Select, Card, message, List, Tag, Divider, Alert, Popconfirm, Modal, Radio, Tabs, Table, Switch, Checkbox, Collapse, Progress, Statistic, Row, Col, Tooltip, Empty, Spin } from 'antd'
import { RobotOutlined, SettingOutlined, ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, RotateLeftOutlined, XOutlined, PlusOutlined, DatabaseOutlined, KeyOutlined, TeamOutlined, UserOutlined, SafetyCertificateOutlined, ExclamationCircleOutlined, HistoryOutlined, CloudUploadOutlined, CopyOutlined, UnorderedListOutlined, RightOutlined, DownOutlined, DashboardOutlined, FieldTimeOutlined, ApiOutlined, SearchOutlined, BulbOutlined, BarChartOutlined, FileSearchOutlined, StarOutlined, WarningOutlined } from '@ant-design/icons'
import { llmApi, teamApi, Team, TableSuggestion, LLMConfigInfo, MockDataResult, MockDataRequest, ConnectionTestResult, ConversationMessage, conversationApi } from '../services/api'
import localStorageService from '../services/localStorageService'
import { useAppStore } from '../stores/appStore'
import type { Table as TableType, Column as ColumnType } from '../types'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface LLMTabProps {
  onApplyTables?: (tables: TableSuggestion[]) => void
  onClose?: () => void
}

const UI_COLORS = {
  BORDER: '#e8e8e8',
  BLUE: '#1890ff',
  YELLOW: '#faad14',
  GREEN: '#52c41a',
  RED: '#ff4d4f',
}

// ====== 连接测试报告弹窗 ======
interface TestResultModalProps {
  testResult: ConnectionTestResult | null
  onClose: () => void
}

const TestResultModal = React.memo(({ testResult, onClose }: TestResultModalProps) => {
  if (!testResult) return null
  return (
    <Modal
      title="连接测试报告"
      open={true}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={650}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type={testResult.success ? 'success' : 'error'}
          message={testResult.success ? '连接测试通过' : '连接测试失败'}
          description={testResult.success ? `模型: ${testResult.model || '未知'}` : testResult.error || '未知错误'}
          showIcon
          icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
        />
        {testResult.security && (
          <Card size="small" title={
            <Space>
              <SafetyCertificateOutlined style={{ color: testResult.security.score === 'safe' ? '#52c41a' : testResult.security.score === 'warning' ? '#faad14' : '#ff4d4f' }} />
              <span>安全性评估</span>
              <Tag color={testResult.security.score === 'safe' ? 'success' : testResult.security.score === 'warning' ? 'warning' : 'error'}>
                {testResult.security.score === 'safe' ? '安全' : testResult.security.score === 'warning' ? '注意' : '危险'}
              </Tag>
            </Space>
          }>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">传输加密：</Text>
                <Tag color={testResult.security.isHttps ? 'success' : (testResult.security.isLocalhost ? 'warning' : 'error')}>
                  {testResult.security.isHttps ? 'HTTPS 加密' : (testResult.security.isLocalhost ? 'HTTP (本地)' : 'HTTP 明文')}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">密钥强度：</Text>
                <Tag color={
                  testResult.security.apiKeyStrength === 'strong' ? 'success' :
                  testResult.security.apiKeyStrength === 'good' ? 'processing' :
                  testResult.security.apiKeyStrength === 'weak' ? 'warning' : 'default'
                }>
                  {testResult.security.apiKeyStrength === 'strong' ? '强' :
                   testResult.security.apiKeyStrength === 'good' ? '良好' :
                   testResult.security.apiKeyStrength === 'weak' ? '弱' : '无'}
                </Tag>
              </div>
              {testResult.security.warnings.length > 0 && (
                <div>
                  <Text type="secondary">安全警告：</Text>
                  {testResult.security.warnings.map((w, i) => (
                    <Alert key={i} message={w} type="warning" showIcon style={{ marginTop: 4 }} />
                  ))}
                </div>
              )}
            </Space>
          </Card>
        )}
        {testResult.availability && (
          <Card size="small" title={
            <Space>
              <ThunderboltOutlined style={{ color: testResult.availability.capable ? '#52c41a' : '#ff4d4f' }} />
              <span>可用性评估</span>
              <Tag color={testResult.availability.capable ? 'success' : 'error'}>
                {testResult.availability.capable ? '可用' : testResult.availability.tested ? '不可用' : '未测试'}
              </Tag>
            </Space>
          }>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {testResult.availability.tested ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">响应时间：</Text>
                    <Tag color={testResult.availability.responseTimeMs < 1000 ? 'success' : testResult.availability.responseTimeMs < 5000 ? 'warning' : 'error'}>
                      {testResult.availability.responseTimeMs}ms
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">模型确认：</Text>
                    <Tag color={testResult.availability.modelConfirmed ? 'success' : 'warning'}>
                      {testResult.availability.modelConfirmed ? '已确认' : '未确认'}
                    </Tag>
                  </div>
                </>
              ) : (
                <Text type="secondary">连接未成功，无法进行可用性测试</Text>
              )}
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  )
})

// ====== 常量 ======
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

const databaseTypes = [
  { value: 'MYSQL', label: 'MySQL' },
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQLITE', label: 'SQLite' },
  { value: 'SQLSERVER', label: 'SQL Server' },
]

const defaultPortMap: Record<string, number> = {
  MYSQL: 3306,
  POSTGRESQL: 5432,
  SQLITE: 0,
  SQLSERVER: 1433,
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

// ====== 主组件 ======
export const LLMTab: React.FC<LLMTabProps> = ({ onApplyTables, onClose }) => {
  const { openTabs, closeTab, currentUser, currentProject, tables, getProjectSnapshot } = useAppStore()
  const [activeTab, setActiveTab] = useState<string>('analysis')

  // 配置相关
  const [userConfigs, setUserConfigs] = useState<LLMConfigInfo[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [configForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [showNewConfig, setShowNewConfig] = useState(false)
  const [configScope, setConfigScope] = useState<'user' | 'team'>('user')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [testResultModal, setTestResultModal] = useState<ConnectionTestResult | null>(null)

  // 生成表相关
  const [description, setDescription] = useState('')
  const [selectedDbType, setSelectedDbType] = useState<string>('')
  const [generatedTables, setGeneratedTables] = useState<TableSuggestion[]>([])
  const [cacheHistory, setCacheHistory] = useState<CacheEntry[]>([])
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmData, setConfirmData] = useState<GenerateConfirmData | null>(null)

  // 数据模拟相关
  const [selectedTableForMock, setSelectedTableForMock] = useState<string>('')
  const [mockRowCount, setMockRowCount] = useState(100)
  const [generatedMockData, setGeneratedMockData] = useState<MockDataResult | null>(null)
  const [useLLMForMock, setUseLLMForMock] = useState(false)
  const [mockConfigId, setMockConfigId] = useState<string>('')
  const [batchModalVisible, setBatchModalVisible] = useState(false)
  const [batchTables, setBatchTables] = useState<Record<string, { selected: boolean; rowCount: number }>>({})
  const [mockTemplates, setMockTemplates] = useState<Array<{ id: string; name: string; description: string }>>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(undefined)

  // 写入数据库相关
  const [writeToDbModalVisible, setWriteToDbModalVisible] = useState(false)
  const [writeToDbForm] = Form.useForm()
  const [writeToDbLoading, setWriteToDbLoading] = useState(false)

  // 性能测试相关
  const [perfTestResult, setPerfTestResult] = useState<any>(null)
  const [perfTestLoading, setPerfTestLoading] = useState(false)
  const [dbConnectionForm] = Form.useForm()
  const [perfTestModalVisible, setPerfTestModalVisible] = useState(false)

  // 智能分析相关
  const [projectAnalysis, setProjectAnalysis] = useState<{
    summary: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    normalizationScore: number
    coverageScore: number
  } | null>(null)
  const [tableAnalysis, setTableAnalysis] = useState<{
    summary: string
    columnAnalysis: Array<{ name: string; assessment: string; suggestion?: string }>
    indexSuggestions: string[]
    relationshipSuggestions: string[]
    designScore: number
  } | null>(null)
  const [selectedTableForAnalysis, setSelectedTableForAnalysis] = useState<string>('')
  const [recommendedTables, setRecommendedTables] = useState<TableSuggestion[]>([])
  const [analysisLoading, setAnalysisLoading] = useState(false)

  // 快照与历史
  const [snapshots, setSnapshots] = useState<Array<{ id: string; operation: string; description: string | null; data: string; createdAt: string }>>([])
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])

  const selectedProvider = Form.useWatch('provider', configForm) || 'openai'

  // ====== 初始化加载 ======
  useEffect(() => {
    loadUserConfigs()
    loadCacheHistory()
  }, [])

  useEffect(() => {
    if (currentUser) loadTeams()
  }, [currentUser])

  useEffect(() => {
    if (currentUser) loadConversationHistory()
  }, [currentUser, currentProject])

  useEffect(() => {
    if (currentProject) loadSnapshots()
  }, [currentProject])

  useEffect(() => {
    loadMockTemplates()
  }, [])

  // ====== 数据加载函数 ======
  const loadTeams = useCallback(async () => {
    if (!currentUser) return
    try {
      const response = await teamApi.getTeamsByUserId(currentUser.id)
      if (response.success && response.data) setTeams(response.data)
    } catch (error) {
      console.error('加载团队列表失败:', error)
    }
  }, [currentUser])

  const loadConversationHistory = useCallback(async () => {
    if (!currentUser) return
    try {
      const response = await conversationApi.getHistory(currentUser.id, currentProject?.id)
      if (response.success && response.data) setConversationHistory(response.data)
    } catch (error) {
      console.error('加载对话历史失败:', error)
    }
  }, [currentUser, currentProject])

  const loadSnapshots = useCallback(async () => {
    if (!currentProject) return
    try {
      const response = await llmApi.getSnapshots(currentProject.id)
      if (response.success && response.data) setSnapshots(response.data)
    } catch (error) {
      console.error('加载快照列表失败:', error)
    }
  }, [currentProject])

  const loadMockTemplates = useCallback(async () => {
    try {
      const response = await llmApi.getMockTemplates()
      if (response.success && response.data) setMockTemplates(response.data)
    } catch (error) {
      console.error('加载模板失败:', error)
    }
  }, [])

  const loadUserConfigs = useCallback(async () => {
    if (!currentUser) return
    try {
      const response = await llmApi.getUserConfigs(currentUser.id)
      if (response.success && response.data) {
        let configs = response.data
        if (teams.length > 0) {
          for (const team of teams) {
            try {
              const teamResponse = await llmApi.getTeamConfigs(team.id)
              if (teamResponse.success && teamResponse.data) {
                configs = [...configs, ...teamResponse.data]
              }
            } catch (e) { /* 忽略 */ }
          }
        }
        setUserConfigs(configs)
        const defaultConfig = configs.find(c => c.isDefault)
        if (defaultConfig) setSelectedConfigId(defaultConfig.id)
      }
    } catch (error) {
      console.error('加载用户配置失败:', error)
    }
  }, [currentUser, teams])

  const loadCacheHistory = useCallback(async () => {
    try {
      const cached = await localStorageService.getMeta('llmTableCache')
      if (cached && Array.isArray(cached)) setCacheHistory(cached)
    } catch (error) {
      console.error('加载缓存历史失败:', error)
    }
  }, [])

  const saveToCache = async (tables: TableSuggestion[]) => {
    try {
      const entry: CacheEntry = {
        id: Date.now().toString(),
        description: description.trim() || '未命名查询',
        tables,
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

  // ====== 配置管理 ======
  const handleProviderChange = useCallback((value: string) => {
    const endpoint = defaultEndpoints[value] || ''
    configForm.setFieldsValue({ endpoint })
    const models = modelOptions[value] || []
    if (models.length > 0) {
      configForm.setFieldsValue({ model: [models[0].value] })
    } else {
      configForm.setFieldsValue({ model: undefined })
    }
  }, [configForm])

  const handleTestConnection = useCallback(async () => {
    const values = await configForm.validateFields().catch(() => null)
    if (!values) return
    setTestingConnection(true)
    try {
      const model = Array.isArray(values.model) ? values.model[0] : values.model
      const response = await llmApi.testConnection(undefined, values.apiKey, values.endpoint, model, values.provider)
      if (response.data) {
        setTestResultModal(response.data)
      } else {
        setTestResultModal({
          success: false, error: response.error || '连接失败',
          security: { isHttps: false, isLocalhost: false, endpointSecure: false, apiKeyMasked: '', apiKeyStrength: 'none', warnings: [], score: 'unsafe', summary: '未知' },
          availability: { tested: false, responseTimeMs: 0, modelConfirmed: false, modelReported: '', capable: false, details: '无可用性数据' }
        })
      }
    } catch (error) {
      setTestResultModal({
        success: false, error: '连接测试失败: ' + (error as Error).message,
        security: { isHttps: false, isLocalhost: false, endpointSecure: false, apiKeyMasked: '', apiKeyStrength: 'none', warnings: [], score: 'unsafe', summary: '未知' },
        availability: { tested: false, responseTimeMs: 0, modelConfirmed: false, modelReported: '', capable: false, details: '无可用性数据' }
      })
    } finally {
      setTestingConnection(false)
    }
  }, [configForm])

  const handleSaveConfig = useCallback(async () => {
    if (!currentUser) { message.warning('请先登录'); return }
    const values = await configForm.validateFields().catch(() => null)
    if (!values) return
    const isOllama = values.provider === 'ollama'
    if (!values.name) { message.warning('请输入配置名称'); return }
    if (!isOllama && !values.apiKey) { message.warning('请输入API密钥'); return }
    if (configScope === 'team' && !selectedTeamId) { message.warning('请选择团队'); return }
    const model = Array.isArray(values.model) ? values.model[0] : values.model
    setLoading(true)
    try {
      const configData = { name: values.name, provider: values.provider, model, endpoint: values.endpoint, apiKey: values.apiKey, description: values.description, isDefault: values.isDefault || false }
      const response = configScope === 'team'
        ? await llmApi.createTeamConfig(selectedTeamId, configData)
        : await llmApi.createUserConfig(currentUser.id, configData)
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
  }, [currentUser, configForm, loadUserConfigs, configScope, selectedTeamId])

  const handleDeleteConfig = useCallback(async (configId: string) => {
    try {
      await llmApi.deleteConfig(configId)
      message.success('配置已删除')
      if (selectedConfigId === configId) setSelectedConfigId('')
      loadUserConfigs()
    } catch (error) {
      message.error('删除失败: ' + (error as Error).message)
    }
  }, [selectedConfigId, loadUserConfigs])

  const handleCreateConfig = useCallback(() => {
    configForm.resetFields()
    configForm.setFieldsValue({ provider: 'ollama', endpoint: defaultEndpoints.ollama, model: ['llama3'], isDefault: false })
    setShowNewConfig(true)
  }, [configForm])

  // ====== 快照 ======
  const createSnapshotIfNeeded = async () => {
    if (!currentProject) return null
    try {
      const snapshot = getProjectSnapshot()
      if (snapshot) {
        const response = await llmApi.createSnapshot(currentProject.id, 'ai_generate', 'AI生成表结构前快照', snapshot)
        return response.data?.id
      }
    } catch (error) {
      console.error('创建快照失败:', error)
    }
    return null
  }

  const handleRestoreSnapshot = useCallback(async (snapshotId: string) => {
    if (!currentProject) return
    try {
      const response = await llmApi.restoreSnapshot(snapshotId, currentProject.id)
      if (response.success && response.data) {
        message.success(response.data.message || '快照已恢复')
        loadSnapshots()
      } else {
        message.error('恢复快照失败')
      }
    } catch (error) {
      message.error('恢复快照失败: ' + (error as Error).message)
    }
  }, [currentProject])

  const handleClearConversation = useCallback(async () => {
    if (!currentUser) return
    try {
      await conversationApi.clearHistory(currentUser.id, currentProject?.id)
      setConversationHistory([])
      message.success('对话历史已清空')
    } catch (error) {
      message.error('清空历史失败: ' + (error as Error).message)
    }
  }, [currentUser, currentProject])

  // ====== 生成表 ======
  const handleGenerateTables = useCallback(async () => {
    if (!description.trim()) { message.warning('请输入表结构描述'); return }
    setLoading(true)
    try {
      const snapshotId = await createSnapshotIfNeeded()
      const response = await llmApi.generateTables(description, selectedDbType || undefined, selectedConfigId || undefined)
      if (response.success && response.data) {
        setConfirmData({ type: 'tables', description, tables: response.data })
        setConfirmModalVisible(true)
        await saveToCache(response.data)
        if (currentUser) {
          const projectId = currentProject?.id
          try {
            await conversationApi.saveMessage({ userId: currentUser.id, projectId, role: 'user', content: description, configId: selectedConfigId || undefined })
            await conversationApi.saveMessage({ userId: currentUser.id, projectId, role: 'assistant', content: `生成了 ${response.data.length} 个表: ${response.data.map(t => t.tableName).join(', ')}`, configId: selectedConfigId || undefined })
            loadConversationHistory()
          } catch (e) { console.error('保存对话历史失败:', e) }
        }
        if (currentUser && currentProject) {
          try {
            await llmApi.logOperation(currentUser.id, currentProject.id, 'generate_tables', description, JSON.stringify(response.data.map(t => t.tableName)), true, snapshotId || undefined)
          } catch (e) { console.error('记录操作日志失败:', e) }
        }
      } else {
        message.error(response.error || '生成失败')
      }
    } catch (error) {
      message.error('生成失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [description, selectedDbType, selectedConfigId])

  const handleConfirmGenerate = useCallback(() => {
    if (!confirmData) return
    if (confirmData.type === 'tables' && confirmData.tables) {
      setGeneratedTables(confirmData.tables)
      message.success('生成成功，共生成 ' + confirmData.tables.length + ' 个表')
    }
    setConfirmModalVisible(false)
    setConfirmData(null)
  }, [confirmData])

  const handleClose = useCallback(() => {
    if (onClose) {
      const llmTab = openTabs.find(tab => tab.type === 'llm')
      if (llmTab) closeTab(llmTab.id)
      onClose()
    }
  }, [onClose, openTabs, closeTab])

  const handleApply = useCallback(() => {
    if (generatedTables.length > 0 && onApplyTables) {
      onApplyTables(generatedTables)
      message.success('已应用生成的表结构')
      handleClose()
    }
  }, [generatedTables, onApplyTables, handleClose])

  // ====== 数据模拟 ======
  const handleGenerateMockData = useCallback(async () => {
    if (!selectedTableForMock || !currentProject) { message.warning('请选择要生成数据的表'); return }
    const table = tables.find((t: TableType) => t.id === selectedTableForMock)
    if (!table || !table.columns) { message.warning('表不存在或没有字段'); return }
    const request: MockDataRequest & { configId?: string } = {
      tableName: table.name, tableComment: table.comment,
      columns: (table.columns || []).map((col: ColumnType) => ({ name: col.name, dataType: col.dataType, nullable: col.nullable, primaryKey: col.primaryKey, unique: col.unique, comment: col.comment })),
      rowCount: mockRowCount,
      configId: useLLMForMock ? (mockConfigId || selectedConfigId || undefined) : undefined
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
  }, [selectedTableForMock, currentProject, tables, mockRowCount, useLLMForMock, mockConfigId, selectedConfigId])

  const handleBatchGenerate = useCallback(async () => {
    const selectedEntries = Object.entries(batchTables).filter(([_, v]) => v.selected)
    if (selectedEntries.length === 0) { message.warning('请至少选择一个表'); return }
    setLoading(true)
    try {
      const requests = selectedEntries.map(([tableId, config]) => {
        const table = tables.find((t: TableType) => t.id === tableId)
        if (!table) return null
        return {
          tableName: table.name, tableComment: table.comment,
          columns: (table.columns || []).map((col: ColumnType) => ({ name: col.name, dataType: col.dataType, nullable: col.nullable, primaryKey: col.primaryKey, unique: col.unique, comment: col.comment })),
          rowCount: config.rowCount
        }
      }).filter(Boolean) as MockDataRequest[]
      const configId = useLLMForMock ? (mockConfigId || selectedConfigId || undefined) : undefined
      const response = await llmApi.generateBatchMockData(requests, configId)
      if (response.success && response.data) {
        message.success(`批量生成完成，共 ${response.data.length} 个表`)
        setBatchModalVisible(false)
        if (response.data.length > 0) setGeneratedMockData(response.data[0])
      } else {
        message.error(response.error || '批量生成失败')
      }
    } catch (error) {
      message.error('批量生成失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [batchTables, tables, useLLMForMock, mockConfigId, selectedConfigId])

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId)
    const template = mockTemplates.find(t => t.id === templateId)
    if (template) {
      const matchingTable = tables.find((t: TableType) => {
        const name = t.name.toLowerCase()
        const templateName = template.id.toLowerCase()
        return name.includes(templateName) || templateName.includes(name)
      })
      if (matchingTable) setSelectedTableForMock(matchingTable.id)
      setMockRowCount(50)
    }
  }, [mockTemplates, tables])

  // ====== 写入数据库 ======
  const handleWriteToDb = useCallback(async () => {
    if (!generatedMockData) return
    try {
      const values = await writeToDbForm.validateFields()
      setWriteToDbLoading(true)
      const connection = {
        databaseType: values.databaseType || 'MYSQL',
        host: values.host || 'localhost',
        port: typeof values.port === 'number' ? values.port : parseInt(values.port) || 3306,
        databaseName: values.databaseName || '',
        username: values.username || '',
        password: values.password || '',
        sslEnabled: values.sslEnabled || false,
      }
      const response = await llmApi.writeMockDataToDb({ connection, tableName: generatedMockData.tableName, data: generatedMockData.rows })
      if (response.success && response.data) {
        if (response.data.success) {
          message.success(`成功写入 ${response.data.insertedCount} 条数据`)
          setWriteToDbModalVisible(false)
        } else {
          message.error(`写入失败: ${response.data.errors?.join(', ') || '未知错误'}`)
        }
      } else {
        message.error('写入数据库失败')
      }
    } catch (error) {
      message.error('写入失败: ' + (error as Error).message)
    } finally {
      setWriteToDbLoading(false)
    }
  }, [generatedMockData, writeToDbForm])

  // ====== 性能测试 ======
  const handleRunPerfTest = useCallback(async () => {
    try {
      const values = await dbConnectionForm.validateFields()
      setPerfTestLoading(true)
      const connection = {
        databaseType: values.databaseType || 'MYSQL',
        host: values.host || 'localhost',
        port: typeof values.port === 'number' ? values.port : parseInt(values.port) || 3306,
        databaseName: values.databaseName || '',
        username: values.username || '',
        password: values.password || '',
        sslEnabled: values.sslEnabled || false,
      }
      const response = await llmApi.testDbPerformance(connection, { testWrite: true, testQuery: true, writeRowCount: 100 })
      if (response.success && response.data) setPerfTestResult(response.data)
      else message.error('性能测试失败')
    } catch (error) {
      message.error('性能测试失败: ' + (error as Error).message)
    } finally {
      setPerfTestLoading(false)
    }
  }, [dbConnectionForm])

  const handleTestConnectionSpeed = useCallback(async () => {
    try {
      const values = await dbConnectionForm.validateFields()
      setPerfTestLoading(true)
      const connection = {
        databaseType: values.databaseType || 'MYSQL',
        host: values.host || 'localhost',
        port: typeof values.port === 'number' ? values.port : parseInt(values.port) || 3306,
        databaseName: values.databaseName || '',
        username: values.username || '',
        password: values.password || '',
        sslEnabled: values.sslEnabled || false,
      }
      const response = await llmApi.testDbConnectionSpeed(connection)
      if (response.success && response.data) {
        setPerfTestResult({
          connectionTest: response.data,
          overallScore: response.data.success ? (response.data.connectTimeMs < 500 ? 'excellent' : response.data.connectTimeMs < 2000 ? 'good' : 'fair') : 'poor',
          summary: `连接: ${response.data.connectTimeMs}ms${response.data.error ? ' - ' + response.data.error : ''}`
        })
      }
    } catch (error) {
      message.error('连接测试失败: ' + (error as Error).message)
    } finally {
      setPerfTestLoading(false)
    }
  }, [dbConnectionForm])

  // ====== 智能分析 ======
  const handleAnalyzeProject = useCallback(async () => {
    if (tables.length === 0) { message.warning('当前项目没有表，无法分析'); return }
    if (!selectedConfigId && userConfigs.length === 0) { message.warning('请先配置大模型'); return }
    setAnalysisLoading(true)
    try {
      const tablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, comment: c.comment || '' }))
      }))
      const response = await llmApi.analyzeProject(tablesData, selectedConfigId || undefined)
      if (response.success && response.data) {
        setProjectAnalysis(response.data)
        message.success('项目分析完成')
      } else {
        message.error(response.error || '分析失败')
      }
    } catch (error) {
      message.error('项目分析失败: ' + (error as Error).message)
    } finally {
      setAnalysisLoading(false)
    }
  }, [tables, selectedConfigId, userConfigs])

  const handleAnalyzeTable = useCallback(async () => {
    if (!selectedTableForAnalysis) { message.warning('请选择要分析的表'); return }
    if (!selectedConfigId && userConfigs.length === 0) { message.warning('请先配置大模型'); return }
    setAnalysisLoading(true)
    try {
      const table = tables.find((t: TableType) => t.id === selectedTableForAnalysis)
      if (!table) { message.warning('表不存在'); return }
      const tableData = {
        name: table.name, comment: table.comment || '',
        columns: (table.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '' }))
      }
      const allTablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, comment: c.comment || '' }))
      }))
      const response = await llmApi.analyzeTable(tableData, allTablesData, selectedConfigId || undefined)
      if (response.success && response.data) {
        setTableAnalysis(response.data)
        message.success('表分析完成')
      } else {
        message.error(response.error || '分析失败')
      }
    } catch (error) {
      message.error('表分析失败: ' + (error as Error).message)
    } finally {
      setAnalysisLoading(false)
    }
  }, [selectedTableForAnalysis, tables, selectedConfigId, userConfigs])

  const handleRecommendTables = useCallback(async () => {
    if (tables.length === 0) { message.warning('当前项目没有表，无法推荐'); return }
    if (!selectedConfigId && userConfigs.length === 0) { message.warning('请先配置大模型'); return }
    setAnalysisLoading(true)
    try {
      const tablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, comment: c.comment || '' }))
      }))
      const response = await llmApi.recommendTables(tablesData, selectedConfigId || undefined)
      if (response.success && response.data) {
        setRecommendedTables(response.data)
        message.success(`推荐了 ${response.data.length} 个新表`)
      } else {
        message.error(response.error || '推荐失败')
      }
    } catch (error) {
      message.error('推荐表失败: ' + (error as Error).message)
    } finally {
      setAnalysisLoading(false)
    }
  }, [tables, selectedConfigId, userConfigs])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // ====== 评分颜色 ======
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  // ====== Tab 1: 智能分析 ======
  const analysisContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {userConfigs.length === 0 ? (
        <Alert message="请先配置模型" description="在「配置与历史」标签页中添加大模型配置后，才能使用智能分析功能" type="info" showIcon />
      ) : (
        <>
          {/* 配置选择 */}
          <Card size="small" style={{ background: '#fafafa' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Text strong>当前模型：</Text>
              <Select
                value={selectedConfigId}
                onChange={setSelectedConfigId}
                style={{ flex: 1 }}
                placeholder="选择要使用的模型配置"
                options={userConfigs.map(c => ({ value: c.id, label: `${c.name} (${c.provider}/${c.model})` }))}
              />
            </div>
          </Card>

          {/* 项目分析 */}
          <Card size="small" title={<Space><BarChartOutlined /> 项目整体分析</Space>}
            extra={<Button type="primary" size="small" icon={<SearchOutlined />} onClick={handleAnalyzeProject} loading={analysisLoading} disabled={!selectedConfigId}>分析项目</Button>}
          >
            {tables.length === 0 ? (
              <Empty description="当前项目没有表" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : projectAnalysis ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Paragraph>{projectAnalysis.summary}</Paragraph>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic title="范式评分" value={projectAnalysis.normalizationScore} suffix="/100"
                        valueStyle={{ color: getScoreColor(projectAnalysis.normalizationScore) }} prefix={<StarOutlined />} />
                      <Progress percent={projectAnalysis.normalizationScore} showInfo={false}
                        strokeColor={getScoreColor(projectAnalysis.normalizationScore)} size="small" />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <Statistic title="业务覆盖度" value={projectAnalysis.coverageScore} suffix="/100"
                        valueStyle={{ color: getScoreColor(projectAnalysis.coverageScore) }} prefix={<CheckCircleOutlined />} />
                      <Progress percent={projectAnalysis.coverageScore} showInfo={false}
                        strokeColor={getScoreColor(projectAnalysis.coverageScore)} size="small" />
                    </Card>
                  </Col>
                </Row>
                {projectAnalysis.strengths.length > 0 && (
                  <div>
                    <Text strong style={{ color: '#52c41a' }}><CheckCircleOutlined /> 设计优点</Text>
                    <List size="small" dataSource={projectAnalysis.strengths}
                      renderItem={item => <List.Item style={{ padding: '4px 0' }}><Tag color="green">{item}</Tag></List.Item>} />
                  </div>
                )}
                {projectAnalysis.weaknesses.length > 0 && (
                  <div>
                    <Text strong style={{ color: '#ff4d4f' }}><WarningOutlined /> 设计不足</Text>
                    <List size="small" dataSource={projectAnalysis.weaknesses}
                      renderItem={item => <List.Item style={{ padding: '4px 0' }}><Tag color="red">{item}</Tag></List.Item>} />
                  </div>
                )}
                {projectAnalysis.suggestions.length > 0 && (
                  <div>
                    <Text strong style={{ color: '#1890ff' }}><BulbOutlined /> 改进建议</Text>
                    <List size="small" dataSource={projectAnalysis.suggestions}
                      renderItem={item => <List.Item style={{ padding: '4px 0' }}><Tag color="blue">{item}</Tag></List.Item>} />
                  </div>
                )}
              </Space>
            ) : (
              <Text type="secondary">点击「分析项目」获取整体设计评估</Text>
            )}
          </Card>

          {/* 表分析 */}
          <Card size="small" title={<Space><FileSearchOutlined /> 单表深度分析</Space>}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Select
                  value={selectedTableForAnalysis}
                  onChange={setSelectedTableForAnalysis}
                  placeholder="选择要分析的表"
                  style={{ flex: 1 }}
                  options={(tables || []).map((t: TableType) => ({ value: t.id, label: `${t.name}${t.comment ? ` (${t.comment})` : ''}` }))}
                />
                <Button type="primary" icon={<SearchOutlined />} onClick={handleAnalyzeTable} loading={analysisLoading} disabled={!selectedTableForAnalysis}>分析</Button>
              </div>
              {tableAnalysis ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Paragraph>{tableAnalysis.summary}</Paragraph>
                  <div style={{ textAlign: 'center' }}>
                    <Statistic title="设计评分" value={tableAnalysis.designScore} suffix="/100"
                      valueStyle={{ color: getScoreColor(tableAnalysis.designScore) }} />
                    <Progress percent={tableAnalysis.designScore} showInfo={false}
                      strokeColor={getScoreColor(tableAnalysis.designScore)} size="small" style={{ maxWidth: 200, margin: '0 auto' }} />
                  </div>
                  {tableAnalysis.columnAnalysis.length > 0 && (
                    <div>
                      <Text strong>字段评估</Text>
                      <List size="small" dataSource={tableAnalysis.columnAnalysis}
                        renderItem={item => (
                          <List.Item style={{ padding: '4px 0', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div><Tag color="blue">{item.name}</Tag> <Text>{item.assessment}</Text></div>
                            {item.suggestion && <Text type="warning" style={{ fontSize: 12, marginLeft: 8 }}><BulbOutlined /> {item.suggestion}</Text>}
                          </List.Item>
                        )} />
                    </div>
                  )}
                  {tableAnalysis.indexSuggestions.length > 0 && (
                    <div>
                      <Text strong><DatabaseOutlined /> 索引建议</Text>
                      {tableAnalysis.indexSuggestions.map((s, i) => <Tag key={i} color="purple" style={{ margin: 2 }}>{s}</Tag>)}
                    </div>
                  )}
                  {tableAnalysis.relationshipSuggestions.length > 0 && (
                    <div>
                      <Text strong><ApiOutlined /> 关系建议</Text>
                      {tableAnalysis.relationshipSuggestions.map((s, i) => <Tag key={i} color="cyan" style={{ margin: 2 }}>{s}</Tag>)}
                    </div>
                  )}
                </Space>
              ) : (
                <Text type="secondary">选择一张表并点击「分析」查看详细评估</Text>
              )}
            </Space>
          </Card>

          {/* 新建表推荐 */}
          <Card size="small" title={<Space><BulbOutlined /> 新建表推荐</Space>}
            extra={<Button size="small" icon={<BulbOutlined />} onClick={handleRecommendTables} loading={analysisLoading} disabled={!selectedConfigId}>获取推荐</Button>}
          >
            {recommendedTables.length > 0 ? (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {recommendedTables.map((table, idx) => (
                  <Card key={idx} size="small" style={{ background: '#f6ffed' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Text strong>{table.tableName}</Text>
                        {table.tableComment && <Tag>{table.tableComment}</Tag>}
                      </Space>
                      <Button size="small" type="link" onClick={() => {
                        setGeneratedTables([table])
                        setActiveTab('generate')
                      }}>使用此表</Button>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {(table.columns || []).map((col, cidx) => (
                        <Tag key={cidx} style={{ marginBottom: 4 }}>
                          {col.name}: {col.dataType}
                          {col.primaryKey && <Tag color="gold" style={{ marginLeft: 4 }}>PK</Tag>}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                ))}
              </Space>
            ) : (
              <Text type="secondary">基于现有表结构，AI将推荐互补的新表</Text>
            )}
          </Card>
        </>
      )}
    </Space>
  ), [userConfigs, selectedConfigId, tables, projectAnalysis, tableAnalysis, recommendedTables, selectedTableForAnalysis, analysisLoading])

  // ====== Tab 2: 生成表 ======
  const generateContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {userConfigs.length === 0 ? (
        <Alert message="请先配置模型" description="在「配置与历史」标签页中添加大模型配置后，才能使用 AI 生成功能" type="info" showIcon />
      ) : (
        <>
          <Card size="small" style={{ background: '#fafafa' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Text strong>当前模型：</Text>
              <Select value={selectedConfigId} onChange={setSelectedConfigId} style={{ flex: 1 }}
                options={userConfigs.map(c => ({ value: c.id, label: `${c.name} (${c.provider}/${c.model})` }))} />
            </div>
          </Card>
          <div>
            <Text strong>业务描述</Text>
            <TextArea rows={4}
              placeholder="请描述您需要的表结构，例如：&#10;- 用户表，包含用户名、邮箱、密码、注册时间&#10;- 订单表，包含订单号、用户ID、金额、创建时间"
              value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginTop: 8 }} />
          </div>
          <div>
            <Text strong>目标数据库类型（可选）</Text>
            <Select allowClear placeholder="不指定则使用通用类型"
              options={[{ value: 'MYSQL', label: 'MySQL' }, { value: 'POSTGRESQL', label: 'PostgreSQL' }, { value: 'SQLITE', label: 'SQLite' }, { value: 'SQLSERVER', label: 'SQL Server' }]}
              value={selectedDbType} onChange={setSelectedDbType} style={{ width: '100%', marginTop: 8 }} />
          </div>
          <Alert message="操作确认" description="AI生成的表结构将在应用前显示预览，并自动创建当前项目快照以便回滚" type="info" showIcon />
          <Button type="primary" onClick={handleGenerateTables} loading={loading} icon={<RobotOutlined />}>生成表结构</Button>
          {generatedTables.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <div>
                <Text strong>生成的表结构：</Text>
                <List size="small" dataSource={generatedTables}
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
                  )} />
              </div>
              <Button type="primary" onClick={handleApply} icon={<CheckCircleOutlined />}>应用到画布</Button>
            </>
          )}
        </>
      )}
    </Space>
  ), [userConfigs, selectedConfigId, description, selectedDbType, loading, generatedTables])

  // ====== Tab 3: 数据模拟 ======
  const mockContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title={<Space><DatabaseOutlined /> 数据模拟生成</Space>}>
        <Form layout="vertical">
          {mockTemplates.length > 0 && (
            <Form.Item label="使用模板">
              <Select allowClear placeholder="选择预设模板快速填充" value={selectedTemplate} onChange={handleTemplateSelect} style={{ width: '100%' }}
                options={mockTemplates.map(t => ({ value: t.id, label: `${t.name} - ${t.description}` }))} />
            </Form.Item>
          )}
          <Form.Item label="选择表">
            <Select value={selectedTableForMock} onChange={setSelectedTableForMock} placeholder="选择要生成数据的表" style={{ width: '100%' }}
              options={(tables || []).map((t: TableType) => ({ value: t.id, label: `${t.name}${t.comment ? ` (${t.comment})` : ''}` }))} />
          </Form.Item>
          <Form.Item label="生成数量">
            <Select value={mockRowCount} onChange={setMockRowCount} options={rowCountOptions.map(n => ({ value: n, label: `${n} 条` }))} />
          </Form.Item>
          <Form.Item label="使用大模型生成">
            <Space>
              <Switch checked={useLLMForMock} onChange={setUseLLMForMock} checkedChildren="LLM" unCheckedChildren="规则" />
              {useLLMForMock && (
                <Select value={mockConfigId || selectedConfigId || undefined} onChange={setMockConfigId} placeholder="选择LLM配置" style={{ width: 200 }}
                  options={userConfigs.map(c => ({ value: c.id, label: `${c.name} (${c.model})` }))} />
              )}
            </Space>
          </Form.Item>
        </Form>
        <Alert message="数据模拟说明"
          description={useLLMForMock ? '使用大模型生成更真实的模拟数据，需要选择LLM配置' : '根据表结构自动生成测试数据，支持中文姓名、邮箱、电话、城市等真实场景数据'}
          type="info" showIcon />
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button type="primary" onClick={handleGenerateMockData} loading={loading} disabled={!selectedTableForMock}>生成模拟数据</Button>
          <Button icon={<UnorderedListOutlined />} onClick={() => {
            const initial: Record<string, { selected: boolean; rowCount: number }> = {}
            tables.forEach((t: TableType) => { initial[t.id] = { selected: false, rowCount: 50 } })
            setBatchTables(initial)
            setBatchModalVisible(true)
          }} disabled={tables.length === 0}>批量生成</Button>
        </div>
      </Card>

      {generatedMockData && (
        <Card size="small" title={<Space><span>生成结果</span><Tag color="green">{generatedMockData.rows.length} 条数据</Tag></Space>}>
          <Tabs defaultActiveKey="preview" items={[
            {
              key: 'preview', label: '数据预览',
              children: (
                <Table size="small"
                  rowKey={(record: any) => record._key || record.id || JSON.stringify(record)}
                  dataSource={generatedMockData.rows.slice(0, 20)}
                  pagination={{ pageSize: 10, total: Math.min(generatedMockData.rows.length, 20), showTotal: (total: number) => `共 ${total} 条，仅显示前 20 条` }}
                  columns={(generatedMockData.columns || []).map(col => ({
                    title: col.name, dataIndex: col.name, key: col.name, ellipsis: true,
                    render: (value: any) => {
                      if (value === null || value === undefined) return <Text type="secondary">NULL</Text>
                      if (typeof value === 'object') return JSON.stringify(value)
                      return String(value)
                    }
                  }))}
                  scroll={{ x: 800 }} />
              )
            },
            {
              key: 'sql', label: 'SQL 语句',
              children: (
                <>
                  <TextArea rows={10} readOnly value={generatedMockData.sql} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button type="primary" icon={<CopyOutlined />} onClick={() => { navigator.clipboard?.writeText(generatedMockData.sql); message.success('SQL已复制到剪贴板') }}>复制 SQL</Button>
                    <Button icon={<CloudUploadOutlined />} onClick={() => { writeToDbForm.resetFields(); setWriteToDbModalVisible(true) }}>写入远程数据库</Button>
                    <Button icon={<DashboardOutlined />} onClick={() => { dbConnectionForm.resetFields(); setPerfTestModalVisible(true) }}>性能测试</Button>
                  </div>
                </>
              )
            }
          ]} />
        </Card>
      )}
    </Space>
  ), [selectedTableForMock, mockRowCount, loading, generatedMockData, useLLMForMock, mockConfigId, selectedConfigId, userConfigs, mockTemplates, selectedTemplate, tables])

  // ====== Tab 4: 配置与历史 ======
  const configHistoryContent = useMemo(() => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 模型配置 */}
      <Card size="small" title={<Space><KeyOutlined /> 模型配置管理</Space>}
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleCreateConfig}>新建配置</Button>}
      >
        {userConfigs.length === 0 ? (
          <Alert message="暂无配置" description="点击「新建配置」添加您的大模型配置" type="info" showIcon />
        ) : (
          <List dataSource={userConfigs} renderItem={(config) => (
            <List.Item key={config.id} actions={[
              <Button key="select" type={selectedConfigId === config.id ? 'primary' : 'default'} onClick={() => setSelectedConfigId(config.id)}>
                {selectedConfigId === config.id ? '已选择' : '选择'}
              </Button>,
              <Popconfirm key="delete" title="确定删除此配置？" onConfirm={() => handleDeleteConfig(config.id)}>
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            ]}>
              <List.Item.Meta
                title={<Space>{config.name}{config.isDefault && <Tag color="blue">默认</Tag>}<Tag color={config.ownerType === 'user' ? 'green' : 'purple'}>{config.ownerType === 'user' ? <><UserOutlined /> 个人</> : <><TeamOutlined /> 团队</>}</Tag><Tag>{config.provider}</Tag></Space>}
                description={<Space><Text type="secondary">模型: {config.model}</Text><Text type="secondary">端点: {config.endpoint}</Text></Space>}
              />
            </List.Item>
          )} />
        )}
      </Card>

      {showNewConfig && (
        <Card size="small" title="新建配置">
          <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
            <Form.Item label="配置范围">
              <Radio.Group value={configScope} onChange={(e) => setConfigScope(e.target.value)}>
                <Radio value="user"><UserOutlined /> 个人配置</Radio>
                <Radio value="team"><TeamOutlined /> 团队配置</Radio>
              </Radio.Group>
            </Form.Item>
            {configScope === 'team' && (
              <Form.Item label="选择团队">
                <Select value={selectedTeamId || undefined} onChange={setSelectedTeamId} placeholder="选择要创建配置的团队" style={{ width: '100%' }}
                  options={teams.map(t => ({ value: t.id, label: t.name }))} />
              </Form.Item>
            )}
            <Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入配置名称' }]}>
              <Input placeholder="例如：我的 OpenAI 配置" />
            </Form.Item>
            <Form.Item name="provider" label="服务提供商" rules={[{ required: true }]}>
              <Select options={providerOptions} onChange={handleProviderChange} />
            </Form.Item>
            <Form.Item name="model" label="模型名称" rules={[{ required: true }]}>
              <Select options={modelOptions[selectedProvider] || []} placeholder="选择或输入模型名称" mode="tags" maxTagCount={1} />
            </Form.Item>
            <Form.Item name="endpoint" label="API 端点" rules={[{ required: true, message: '请输入API端点' }]}>
              <Input placeholder="https://api.openai.com/v1" />
            </Form.Item>
            <Form.Item name="apiKey" label="API 密钥" rules={[{ required: selectedProvider !== 'ollama', message: '请输入API密钥' }]}>
              <Input.Password placeholder={selectedProvider === 'ollama' ? 'Ollama 本地无需密钥' : 'sk-...'} />
            </Form.Item>
            <Form.Item name="description" label="描述"><Input placeholder="可选的配置描述" /></Form.Item>
            <Form.Item name="isDefault" label="设为默认配置" valuePropName="checked"><Switch checkedChildren="是" unCheckedChildren="否" /></Form.Item>
            <Alert message="安全提示" description="API密钥将使用 AES-256-GCM 加密存储" type="warning" showIcon icon={<SafetyCertificateOutlined />} />
            <Divider style={{ margin: '16px 0' }} />
            <Space>
              <Button onClick={handleTestConnection} loading={testingConnection} icon={<CheckCircleOutlined />}>测试连接</Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SettingOutlined />}>保存配置</Button>
              <Button onClick={() => setShowNewConfig(false)}>取消</Button>
            </Space>
          </Form>
        </Card>
      )}

      <Divider style={{ margin: '8px 0' }} />

      {/* 历史与快照 */}
      <Collapse ghost items={[
        {
          key: 'history', label: <span><HistoryOutlined /> 历史与快照</span>,
          children: (
            <Tabs size="small" items={[
              { key: 'conversation', label: '对话历史', children: (
                conversationHistory.length === 0 ? <Text type="secondary">暂无对话历史</Text> : (
                  <Card size="small" extra={<Popconfirm title="确定清空对话历史？" onConfirm={handleClearConversation}><Button size="small" danger icon={<DeleteOutlined />}>清空</Button></Popconfirm>}>
                    <List size="small" dataSource={conversationHistory.slice(-10)}
                      renderItem={(msg) => (
                        <List.Item style={{ padding: '4px 0' }}>
                          <div style={{ width: '100%' }}>
                            <Tag color={msg.role === 'user' ? 'blue' : 'green'} style={{ marginRight: 8 }}>{msg.role === 'user' ? '用户' : 'AI'}</Tag>
                            <Text style={{ fontSize: 12 }}>{msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content}</Text>
                          </div>
                        </List.Item>
                      )} />
                  </Card>
                )
              )},
              { key: 'snapshots', label: '快照回滚', children: (
                snapshots.length === 0 ? <Text type="secondary">暂无快照</Text> : (
                  <List size="small" dataSource={snapshots.slice(0, 10)}
                    renderItem={(snapshot) => (
                      <List.Item extra={<Button size="small" icon={<RotateLeftOutlined />} onClick={() => handleRestoreSnapshot(snapshot.id)}>回滚</Button>}>
                        <div>
                          <Text strong>{snapshot.operation}</Text>
                          {snapshot.description && <Text type="secondary"> - {snapshot.description}</Text>}
                          <div><Text type="secondary" style={{ fontSize: 11 }}>{new Date(snapshot.createdAt).toLocaleString('zh-CN')}</Text></div>
                        </div>
                      </List.Item>
                    )} />
                )
              )},
              { key: 'cache', label: '缓存记录', children: (
                cacheHistory.length === 0 ? <Text type="secondary">暂无缓存记录</Text> : (
                  <List size="small" dataSource={cacheHistory}
                    renderItem={(entry) => (
                      <List.Item key={entry.id} extra={
                        <Space size="small">
                          <Button size="small" icon={<RotateLeftOutlined />} onClick={() => useCachedTables(entry)}>复用</Button>
                          <Popconfirm title="确定删除？" onConfirm={() => deleteFromCache(entry.id)}><Button size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
                        </Space>
                      }>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text strong>{entry.description}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(entry.createdAt)}</Text>
                          </div>
                          <div style={{ marginTop: 4 }}>{entry.tables.map((table, idx) => <Tag key={idx} color="blue" style={{ marginRight: 4 }}>{table.tableName}</Tag>)}</div>
                        </div>
                      </List.Item>
                    )} />
                )
              )}
            ]} />
          )
        }
      ]} />
    </Space>
  ), [userConfigs, selectedConfigId, showNewConfig, configForm, configScope, selectedProvider, teams, selectedTeamId, testingConnection, loading, conversationHistory, snapshots, cacheHistory])

  // ====== 渲染 ======
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined /> AI助手
        </Title>
        <Space>
          {selectedConfigId && (
            <Tag color="blue" icon={<CheckCircleOutlined />}>
              {userConfigs.find(c => c.id === selectedConfigId)?.name || '已选择模型'}
            </Tag>
          )}
          {onClose && <Button type="text" icon={<XOutlined />} onClick={handleClose}>关闭</Button>}
        </Space>
      </div>

      {/* 主体内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'analysis', label: <span><SearchOutlined /> 智能分析</span>, children: analysisContent
          },
          {
            key: 'generate', label: <span><ThunderboltOutlined /> 生成表</span>, children: generateContent
          },
          {
            key: 'mock', label: <span><DatabaseOutlined /> 数据模拟</span>, children: mockContent
          },
          {
            key: 'config', label: <span><SettingOutlined /> 配置与历史</span>, children: configHistoryContent
          }
        ]} />
      </div>

      {/* 确认操作 Modal */}
      <Modal title={<Space><ExclamationCircleOutlined style={{ color: UI_COLORS.YELLOW }} /><span>确认 AI 操作</span></Space>}
        open={confirmModalVisible} onOk={handleConfirmGenerate}
        onCancel={() => { setConfirmModalVisible(false); setConfirmData(null) }}
        okText="确认应用" cancelText="取消" width={700}
      >
        {confirmData?.type === 'tables' && confirmData.tables && (
          <div>
            <Alert message="即将应用 AI 生成的表结构" description={`将创建 ${confirmData.tables.length} 个表：${confirmData.tables.map(t => t.tableName).join(', ')}`} type="warning" showIcon style={{ marginBottom: 16 }} />
            <Card size="small" title="已自动创建快照"><Text type="secondary">在应用更改前已自动创建当前项目快照。如有问题可在版本管理中恢复。</Text></Card>
          </div>
        )}
      </Modal>

      {/* 批量生成弹窗 */}
      <Modal title="批量生成模拟数据" open={batchModalVisible} onOk={handleBatchGenerate}
        onCancel={() => setBatchModalVisible(false)} okText="确认生成" cancelText="取消" width={700} confirmLoading={loading}
      >
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          <List size="small" dataSource={tables}
            renderItem={(table: TableType) => {
              const batchItem = batchTables[table.id] || { selected: false, rowCount: 50 }
              return (
                <List.Item>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    <Checkbox checked={batchItem.selected} onChange={(e) => setBatchTables(prev => ({ ...prev, [table.id]: { ...batchItem, selected: e.target.checked } }))}>
                      {table.name}{table.comment && <Text type="secondary" style={{ marginLeft: 4 }}>({table.comment})</Text>}
                    </Checkbox>
                    {batchItem.selected && (
                      <Select value={batchItem.rowCount} onChange={(val) => setBatchTables(prev => ({ ...prev, [table.id]: { ...batchItem, rowCount: val } }))}
                        options={rowCountOptions.map(n => ({ value: n, label: `${n} 条` }))} style={{ width: 120 }} size="small" />
                    )}
                  </div>
                </List.Item>
              )
            }} />
        </div>
      </Modal>

      {/* 写入数据库弹窗 */}
      <Modal title="写入远程数据库" open={writeToDbModalVisible} onOk={handleWriteToDb}
        onCancel={() => setWriteToDbModalVisible(false)} okText="确认写入" cancelText="取消" width={600} confirmLoading={writeToDbLoading}
      >
        <Alert message={`将 ${generatedMockData?.rows.length || 0} 条数据写入表 ${generatedMockData?.tableName || ''}`}
          description="请确保目标数据库中已存在对应的表结构" type="info" showIcon style={{ marginBottom: 16 }} />
        <Form form={writeToDbForm} layout="vertical">
          <Form.Item label="数据库类型" name="databaseType" rules={[{ required: true }]} initialValue="MYSQL">
            <Select options={databaseTypes} onChange={(value: string) => { writeToDbForm.setFieldsValue({ port: defaultPortMap[value] || 3306 }) }} />
          </Form.Item>
          <Row gutter={8}>
            <Col span={16}><Form.Item label="主机地址" name="host" rules={[{ required: true }]} initialValue="localhost"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="端口" name="port" rules={[{ required: true }]} initialValue={3306}><Input /></Form.Item></Col>
          </Row>
          <Form.Item label="数据库名称" name="databaseName" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={8}>
            <Col span={12}><Form.Item label="用户名" name="username" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="密码" name="password"><Input.Password /></Form.Item></Col>
          </Row>
          <Form.Item label="SSL连接" name="sslEnabled" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
        </Form>
      </Modal>

      {/* 性能测试弹窗 */}
      <Modal title="数据库性能测试" open={perfTestModalVisible} onCancel={() => setPerfTestModalVisible(false)} footer={null} width={700}>
        <Form form={dbConnectionForm} layout="vertical">
          <Form.Item label="数据库类型" name="databaseType" rules={[{ required: true }]} initialValue="MYSQL">
            <Select options={databaseTypes} onChange={(value) => { dbConnectionForm.setFieldsValue({ port: defaultPortMap[value] || 3306 }) }} />
          </Form.Item>
          <Row gutter={8}>
            <Col span={16}><Form.Item label="主机地址" name="host" rules={[{ required: true }]} initialValue="localhost"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="端口" name="port" rules={[{ required: true }]} initialValue={3306}><Input /></Form.Item></Col>
          </Row>
          <Form.Item label="数据库名称" name="databaseName" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={8}>
            <Col span={12}><Form.Item label="用户名" name="username" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="密码" name="password"><Input.Password /></Form.Item></Col>
          </Row>
          <Form.Item label="SSL连接" name="sslEnabled" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button type="primary" loading={perfTestLoading} onClick={handleRunPerfTest} icon={<FieldTimeOutlined />}>运行完整测试</Button>
            <Button loading={perfTestLoading} onClick={handleTestConnectionSpeed}>仅测试连接速度</Button>
          </div>
        </Form>
        {perfTestResult && (
          <Card size="small" title="测试结果">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="连接速度" value={perfTestResult.connectionTest.connectTimeMs} suffix="ms"
                  valueStyle={{ color: perfTestResult.connectionTest.connectTimeMs < 500 ? '#3f8600' : perfTestResult.connectionTest.connectTimeMs < 2000 ? '#faad14' : '#cf1322' }}
                  prefix={<ApiOutlined />} />
              </Col>
              {perfTestResult.queryTest && (
                <Col span={8}>
                  <Statistic title="查询速度" value={perfTestResult.queryTest.queryTimeMs} suffix="ms"
                    valueStyle={{ color: perfTestResult.queryTest.queryTimeMs < 500 ? '#3f8600' : perfTestResult.queryTest.queryTimeMs < 2000 ? '#faad14' : '#cf1322' }}
                    prefix={<FieldTimeOutlined />} />
                </Col>
              )}
              {perfTestResult.writeTest && (
                <Col span={8}>
                  <Statistic title="写入速度" value={perfTestResult.writeTest.writeSpeedPerSec} suffix="条/秒"
                    valueStyle={{ color: perfTestResult.writeTest.writeSpeedPerSec > 500 ? '#3f8600' : perfTestResult.writeTest.writeSpeedPerSec > 100 ? '#faad14' : '#cf1322' }}
                    prefix={<DashboardOutlined />} />
                </Col>
              )}
            </Row>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>综合评分</Text>
              <Tag color={
                perfTestResult.overallScore === 'excellent' ? 'success' :
                perfTestResult.overallScore === 'good' ? 'processing' :
                perfTestResult.overallScore === 'fair' ? 'warning' : 'error'
              } style={{ fontSize: 16, padding: '4px 12px' }}>
                {perfTestResult.overallScore === 'excellent' ? '优秀' : perfTestResult.overallScore === 'good' ? '良好' : perfTestResult.overallScore === 'fair' ? '一般' : '较差'}
              </Tag>
            </div>
            <Progress percent={perfTestResult.overallScore === 'excellent' ? 90 : perfTestResult.overallScore === 'good' ? 70 : perfTestResult.overallScore === 'fair' ? 50 : 25}
              status={perfTestResult.overallScore === 'excellent' ? 'success' : perfTestResult.overallScore === 'good' ? 'normal' : perfTestResult.overallScore === 'fair' ? 'active' : 'exception'} />
            <Text type="secondary">{perfTestResult.summary}</Text>
            {perfTestResult.connectionTest.error && <Alert message={`连接错误: ${perfTestResult.connectionTest.error}`} type="error" showIcon style={{ marginTop: 8 }} />}
            {perfTestResult.queryTest?.error && <Alert message={`查询错误: ${perfTestResult.queryTest.error}`} type="warning" showIcon style={{ marginTop: 8 }} />}
            {perfTestResult.writeTest?.error && <Alert message={`写入错误: ${perfTestResult.writeTest.error}`} type="warning" showIcon style={{ marginTop: 8 }} />}
          </Card>
        )}
      </Modal>

      <TestResultModal testResult={testResultModal} onClose={() => setTestResultModal(null)} />
    </div>
  )
}

export default LLMTab
