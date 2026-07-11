import React, { useState, useMemo, useCallback, useEffect, Key } from 'react'
import { Slider, Button, Space, Typography, Tag, Switch, Input, Tree, TreeDataNode, Select, Timeline, Divider, message, Alert, Form, Radio, Popconfirm, Spin, Row, Col, Card } from 'antd'
import { SettingOutlined, FontSizeOutlined, BgColorsOutlined, CompressOutlined, AimOutlined, ThunderboltOutlined, LinkOutlined, SaveOutlined, SwapOutlined, RobotOutlined, AppstoreOutlined, EyeOutlined, DatabaseOutlined, KeyOutlined, StarOutlined, PlusOutlined, ClockCircleOutlined, HistoryOutlined, UserOutlined, TeamOutlined, DeleteOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useTheme } from '../theme/useTheme'
import { llmApi, teamApi, Team, LLMConfigInfo } from '../services/api'
import { HistoryModal } from './HistoryModal'

const { Title, Text } = Typography

const themeColors = [
  { value: '#1890ff', name: '蓝色' },
  { value: '#52c41a', name: '绿色' },
  { value: '#faad14', name: '橙色' },
  { value: '#f5222d', name: '红色' },
  { value: '#722ed1', name: '紫色' },
  { value: '#13c2c2', name: '青色' },
]

const zoomPresets = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
]

const autoSavePresets = [
  { value: 15000, label: '15秒' },
  { value: 30000, label: '30秒' },
  { value: 60000, label: '1分钟' },
  { value: 120000, label: '2分钟' },
  { value: 300000, label: '5分钟' },
]

const treeData: TreeDataNode[] = [
  {
    title: '外观',
    key: 'appearance',
    icon: <AppstoreOutlined style={{ fontSize: 14 }} />,
    children: [
      { title: '主题设置', key: 'theme', icon: <AppstoreOutlined style={{ fontSize: 12 }} /> },
      { title: '字体大小', key: 'font-size', icon: <FontSizeOutlined style={{ fontSize: 12 }} /> },
      { title: '紧凑模式', key: 'compact-mode', icon: <CompressOutlined style={{ fontSize: 12 }} /> },
    ],
  },
  {
    title: '画布',
    key: 'canvas',
    icon: <EyeOutlined style={{ fontSize: 14 }} />,
    children: [
      { title: '缩放级别', key: 'zoom-level', icon: <AimOutlined style={{ fontSize: 12 }} /> },
      { title: '小地图', key: 'minimap', icon: <StarOutlined style={{ fontSize: 12 }} /> },
      { title: '关系线', key: 'edges', icon: <LinkOutlined style={{ fontSize: 12 }} /> },
    ],
  },
  {
    title: '保存',
    key: 'save',
    icon: <SaveOutlined style={{ fontSize: 14 }} />,
    children: [
      { title: '自动保存', key: 'auto-save', icon: <ThunderboltOutlined style={{ fontSize: 12 }} /> },
    ],
  },
  {
    title: '快捷键',
    key: 'shortcuts',
    icon: <KeyOutlined style={{ fontSize: 14 }} />,
  },
  {
    title: '工具',
    key: 'tools',
    icon: <DatabaseOutlined style={{ fontSize: 14 }} />,
    children: [
      { title: '数据库连接', key: 'connections', icon: <DatabaseOutlined style={{ fontSize: 12 }} /> },
      { title: '数据库转换', key: 'type-convert', icon: <SwapOutlined style={{ fontSize: 12 }} /> },
      { title: 'AI 助手', key: 'ai-assistant', icon: <RobotOutlined style={{ fontSize: 12 }} /> },
      { title: '表前缀', key: 'table-prefix', icon: <DatabaseOutlined style={{ fontSize: 12 }} /> },
      { title: '自动添加id列', key: 'auto-add-id', icon: <DatabaseOutlined style={{ fontSize: 12 }} /> },
      { title: '操作历史', key: 'operation-history', icon: <HistoryOutlined style={{ fontSize: 12 }} /> },
    ],
  },
  {
    title: '更新日志',
    key: 'changelog',
    icon: <ClockCircleOutlined style={{ fontSize: 14 }} />,
  },
]

const UI_COLORS = {
  WHITE: '#fff',
  BORDER: '#e8e8e8',
  BG: '#fafafa',
  SHORTCUT_BG: '#f5f5f5',
  GRAY: '#d9d9d9',
  BLUE: '#1890ff',
}

interface SettingSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

const SettingSection = React.memo(({ title, description, children }: SettingSectionProps) => (
  <div style={{ padding: '16px' }}>
    <Title level={4} style={{ marginBottom: 16 }}>{title}</Title>
    {description && <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{description}</Text>}
    {children}
  </div>
))

interface ShortcutItemProps {
  keys: string[]
  action: string
}

const ShortcutItem = React.memo(({ keys, action }: ShortcutItemProps) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: UI_COLORS.SHORTCUT_BG, borderRadius: 8 }}>
    <Space>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span>+</span>}
          <Tag color="blue">{key}</Tag>
        </React.Fragment>
      ))}
    </Space>
    <Text type="secondary">{action}</Text>
  </div>
))

interface SettingsTabProps {
  onOpenTypeConvert?: () => void
  onOpenLLM?: () => void
  onOpenConnections?: () => void
}

const providerOptions = [
  { value: 'openai', label: 'OpenAI' }, { value: 'azure', label: 'Azure OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' }, { value: 'ollama', label: 'Ollama (本地)' },
  { value: 'zhipu', label: '智谱AI' }, { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom', label: '自定义' }
]
const modelOptions: Record<string, { value: string; label: string }[]> = {
  openai: [{ value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4', label: 'GPT-4' }, { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }],
  azure: [{ value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4', label: 'GPT-4' }, { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' }],
  deepseek: [{ value: 'deepseek-chat', label: 'DeepSeek Chat' }, { value: 'deepseek-coder', label: 'DeepSeek Coder' }],
  ollama: [{ value: 'llama3', label: 'Llama 3' }, { value: 'qwen2.5', label: 'Qwen 2.5' }, { value: 'deepseek-r1', label: 'DeepSeek R1' }, { value: 'gemma3', label: 'Gemma 3' }, { value: 'mistral', label: 'Mistral' }],
  zhipu: [{ value: 'glm-4', label: 'GLM-4' }, { value: 'glm-3-turbo', label: 'GLM-3 Turbo' }],
  anthropic: [{ value: 'claude-opus-20240229', label: 'Claude Opus' }, { value: 'claude-sonnet-20240229', label: 'Claude Sonnet' }],
  custom: []
}
const defaultEndpoints: Record<string, string> = {
  openai: 'https://api.openai.com/v1', azure: '', deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://localhost:11434/v1', zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  anthropic: 'https://api.anthropic.com/v1', custom: ''
}

const AIAssistantSettings: React.FC = () => {
  const { currentUser } = useAppStore()
  const [configs, setConfigs] = useState<LLMConfigInfo[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [configScope, setConfigScope] = useState<'user' | 'team'>('user')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [form] = Form.useForm()
  const selectedProvider = Form.useWatch('provider', form) || 'ollama'

  const loadConfigs = useCallback(async () => {
    if (!currentUser) return
    try {
      const response = await llmApi.getUserConfigs(currentUser.id)
      if (response.success && response.data) {
        let allConfigs = response.data
        for (const team of teams) {
          try {
            const tr = await llmApi.getTeamConfigs(team.id)
            if (tr.success && tr.data) allConfigs = [...allConfigs, ...tr.data]
          } catch (e) { /* 忽略 */ }
        }
        setConfigs(allConfigs)
      }
    } catch (e) { console.error('加载配置失败:', e) }
  }, [currentUser, teams])

  useEffect(() => { if (currentUser) loadConfigs() }, [currentUser, loadConfigs])
  useEffect(() => {
    if (!currentUser) return
    teamApi.getTeamsByUserId(currentUser.id).then(r => { if (r.success && r.data) setTeams(r.data) }).catch(() => {})
  }, [currentUser])

  const handleProviderChange = useCallback((value: string) => {
    form.setFieldsValue({ endpoint: defaultEndpoints[value] || '' })
    const models = modelOptions[value] || []
    form.setFieldsValue({ model: models.length > 0 ? [models[0].value] : undefined })
  }, [form])

  const handleTestConnection = useCallback(async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    setTestingConnection(true)
    try {
      const model = Array.isArray(values.model) ? values.model[0] : values.model
      const response = await llmApi.testConnection(undefined, values.apiKey, values.endpoint, model, values.provider)
      if (response.data?.success) message.success(`连接成功！模型: ${response.data.model || model}`)
      else message.error(`连接失败: ${response.data?.error || response.error || '未知错误'}`)
    } catch (error) { message.error('测试失败: ' + (error as Error).message) }
    finally { setTestingConnection(false) }
  }, [form])

  const openNewForm = useCallback(() => {
    setEditingConfigId(null)
    form.resetFields()
    form.setFieldsValue({ provider: 'ollama', endpoint: defaultEndpoints.ollama, model: ['llama3'], isDefault: false })
    setShowForm(true)
  }, [form])

  const openEditForm = useCallback((config: LLMConfigInfo) => {
    setEditingConfigId(config.id)
    form.resetFields()
    form.setFieldsValue({
      name: config.name,
      provider: config.provider,
      model: [config.model],
      endpoint: config.endpoint,
      apiKey: '', // 不回显密钥，需要重新输入
      isDefault: config.isDefault,
    })
    setConfigScope(config.ownerType === 'team' ? 'team' : 'user')
    setSelectedTeamId(config.ownerId || '')
    setShowForm(true)
  }, [form])

  const handleSave = useCallback(async () => {
    if (!currentUser) { message.warning('请先登录'); return }
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const isOllama = values.provider === 'ollama'
    if (!values.name) { message.warning('请输入配置名称'); return }
    if (!isOllama && !values.apiKey && !editingConfigId) { message.warning('请输入API密钥'); return }
    if (configScope === 'team' && !selectedTeamId) { message.warning('请选择团队'); return }
    setLoading(true)
    try {
      const model = Array.isArray(values.model) ? values.model[0] : values.model
      const configData = { name: values.name, provider: values.provider, model, endpoint: values.endpoint, apiKey: values.apiKey, description: values.description, isDefault: values.isDefault || false }

      if (editingConfigId) {
        // 编辑模式：更新已有配置
        const updateData: any = { ...configData }
        if (!values.apiKey) delete updateData.apiKey // 未输入密钥则不更新
        const response = await llmApi.updateConfig(editingConfigId, updateData)
        if (response.success) { message.success('配置更新成功'); setShowForm(false); form.resetFields(); setEditingConfigId(null); loadConfigs() }
        else message.error(response.error || '更新失败')
      } else {
        // 新建模式
        const response = configScope === 'team'
          ? await llmApi.createTeamConfig(selectedTeamId, configData)
          : await llmApi.createUserConfig(currentUser.id, configData)
        if (response.success) { message.success('配置保存成功'); setShowForm(false); form.resetFields(); loadConfigs() }
        else message.error(response.error || '保存失败')
      }
    } catch (error) { message.error('保存失败: ' + (error as Error).message) }
    finally { setLoading(false) }
  }, [currentUser, form, configScope, selectedTeamId, loadConfigs, editingConfigId])

  const handleDelete = useCallback(async (configId: string) => {
    try { await llmApi.deleteConfig(configId); message.success('已删除'); loadConfigs() }
    catch (e) { message.error('删除失败') }
  }, [loadConfigs])

  const handleSetDefault = useCallback(async (configId: string) => {
    try {
      await llmApi.updateConfig(configId, { isDefault: true })
      message.success('已设为默认')
      loadConfigs()
    } catch (e) { message.error('设置失败') }
  }, [loadConfigs])

  return (
    <div style={{ padding: '16px' }}>
      <Title level={4} style={{ marginBottom: 16 }}>AI 助手</Title>
      <Alert message="AI 助手已集成到主界面" description="点击顶部工具栏的 🤖 图标即可打开 AI 助手面板。此处用于管理模型配置。" type="info" showIcon style={{ marginBottom: 16 }} />

      {/* 已有配置列表 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>模型配置</Text>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNewForm}>新建配置</Button>
        </div>
        {configs.length === 0 ? (
          <Card size="small" style={{ textAlign: 'center', padding: 20 }}>
            <RobotOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 8 }} />
            <div><Text type="secondary">暂无模型配置</Text></div>
            <Button type="primary" size="small" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={openNewForm}>添加第一个配置</Button>
          </Card>
        ) : (
          configs.map(config => (
            <Card key={config.id} size="small" style={{ marginBottom: 8, border: config.isDefault ? '1px solid #1890ff' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Space>
                    <Text strong>{config.name}</Text>
                    {config.isDefault && <Tag color="blue">默认</Tag>}
                    <Tag>{config.provider}</Tag>
                    <Tag color="geekblue">{config.model}</Tag>
                    {config.ownerType === 'team' && <Tag color="purple"><TeamOutlined /> 团队</Tag>}
                  </Space>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>端点: {config.endpoint}</div>
                </div>
                <Space size="small">
                  <Button size="small" icon={<SettingOutlined />} onClick={() => openEditForm(config)}>编辑</Button>
                  {!config.isDefault && <Button size="small" onClick={() => handleSetDefault(config.id)}>设为默认</Button>}
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(config.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                </Space>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 新建/编辑配置表单 */}
      {showForm && (
        <Card size="small" title={editingConfigId ? '编辑配置' : '新建配置'} style={{ marginBottom: 16 }}>
          <Form form={form} layout="vertical" onFinish={handleSave}>
            {!editingConfigId && (
              <>
                <Form.Item label="配置范围">
                  <Radio.Group value={configScope} onChange={(e) => setConfigScope(e.target.value)}>
                    <Radio value="user"><UserOutlined /> 个人</Radio>
                    <Radio value="team"><TeamOutlined /> 团队</Radio>
                  </Radio.Group>
                </Form.Item>
                {configScope === 'team' && (
                  <Form.Item label="选择团队">
                    <Select value={selectedTeamId || undefined} onChange={setSelectedTeamId} placeholder="选择团队" style={{ width: '100%' }}
                      options={teams.map(t => ({ value: t.id, label: t.name }))} />
                  </Form.Item>
                )}
              </>
            )}
            <Row gutter={12}>
              <Col span={12}><Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入' }]}><Input placeholder="例如：我的 DeepSeek" /></Form.Item></Col>
              <Col span={12}><Form.Item name="provider" label="服务提供商" rules={[{ required: true }]}><Select options={providerOptions} onChange={handleProviderChange} /></Form.Item></Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="model" label="模型" rules={[{ required: true }]}><Select options={modelOptions[selectedProvider] || []} mode="tags" maxTagCount={1} placeholder="选择或输入" /></Form.Item></Col>
              <Col span={12}><Form.Item name="endpoint" label="API端点" rules={[{ required: true, message: '请输入' }]}><Input placeholder="https://api.openai.com/v1" /></Form.Item></Col>
            </Row>
            <Form.Item name="apiKey" label={editingConfigId ? 'API密钥（留空则不修改）' : 'API密钥'} rules={editingConfigId ? [] : [{ required: selectedProvider !== 'ollama', message: '请输入' }]}>
              <Input.Password placeholder={selectedProvider === 'ollama' ? '本地无需密钥' : 'sk-...'} />
            </Form.Item>
            <Form.Item name="isDefault" label="设为默认" valuePropName="checked"><Switch /></Form.Item>
            <Alert message="安全提示" description="API密钥将使用 AES-256-GCM 加密存储" type="warning" showIcon icon={<SafetyCertificateOutlined />} style={{ marginBottom: 12 }} />
            <Space>
              <Button onClick={handleTestConnection} loading={testingConnection} icon={<CheckCircleOutlined />}>测试连接</Button>
              <Button type="primary" htmlType="submit" loading={loading}>{editingConfigId ? '更新配置' : '保存配置'}</Button>
              <Button onClick={() => { setShowForm(false); setEditingConfigId(null) }}>取消</Button>
            </Space>
          </Form>
        </Card>
      )}
    </div>
  )
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onOpenTypeConvert, onOpenLLM, onOpenConnections }) => {
  const [selectedKey, setSelectedKey] = useState('appearance')
  const [searchValue, setSearchValue] = useState('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const currentProject = useAppStore(state => state.currentProject)
  const isLocalMode = useAppStore(state => state.isLocalMode)

  const { theme, themeOptions, setTheme } = useTheme()
  const fontConfig = useAppStore(state => state.fontConfig)
  const setFontSize = useAppStore(state => state.setFontSize)
  const themeColor = useAppStore(state => state.themeColor)
  const setThemeColor = useAppStore(state => state.setThemeColor)
  const updateLogs = useAppStore(state => state.updateLogs)
  const setThemeMode = useAppStore(state => state.setThemeMode)
  const compactMode = useAppStore(state => state.compactMode)
  const setCompactMode = useAppStore(state => state.setCompactMode)
  const canvasZoom = useAppStore(state => state.canvasZoom)
  const setCanvasZoom = useAppStore(state => state.setCanvasZoom)
  const showMiniMap = useAppStore(state => state.showMiniMap)
  const setShowMiniMap = useAppStore(state => state.setShowMiniMap)
  const autoSaveInterval = useAppStore(state => state.autoSaveInterval)
  const setAutoSaveInterval = useAppStore(state => state.setAutoSaveInterval)
  const edgeStyle = useAppStore(state => state.edgeStyle)
  const setEdgeStyle = useAppStore(state => state.setEdgeStyle)
  const showEdgeLabels = useAppStore(state => state.showEdgeLabels)
  const setShowEdgeLabels = useAppStore(state => state.setShowEdgeLabels)
  const tablePrefix = useAppStore(state => state.tablePrefix)
  const tablePrefixPresets = useAppStore(state => state.tablePrefixPresets)
  const setTablePrefix = useAppStore(state => state.setTablePrefix)
  const addTablePrefixPreset = useAppStore(state => state.addTablePrefixPreset)
  const removeTablePrefixPreset = useAppStore(state => state.removeTablePrefixPreset)
  const autoAddIdColumn = useAppStore(state => state.autoAddIdColumn)
  const setAutoAddIdColumn = useAppStore(state => state.setAutoAddIdColumn)

  const handleReset = useCallback(() => {
    setFontSize('base', 14)
    setThemeColor(UI_COLORS.BLUE)
    setThemeMode('light')
    setCompactMode(false)
    setCanvasZoom(1)
    setShowMiniMap(true)
    setAutoSaveInterval(30000)
    setEdgeStyle('smooth')
    setShowEdgeLabels(true)
    setTablePrefix('')
    setAutoAddIdColumn(true)
  }, [setFontSize, setThemeColor, setThemeMode, setCompactMode, setCanvasZoom, setShowMiniMap, setAutoSaveInterval, setEdgeStyle, setShowEdgeLabels, setTablePrefix, setAutoAddIdColumn])

  const formatInterval = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${ms / 1000}秒`
    return `${ms / 60000}分钟`
  }

  const renderContent = useMemo(() => {
    switch (selectedKey) {
      case 'theme':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>主题设置</Title>
            
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>选择界面的颜色主题</Text>
              <Select
                style={{ width: '100%' }}
                value={theme.id}
                onChange={(value) => setTheme(value)}
                options={themeOptions}
                size="large"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>选择界面主题颜色</Text>
              <Space size="middle" wrap>
                {themeColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setThemeColor(color.value)}
                    style={{
                      backgroundColor: color.value,
                      border: themeColor === color.value ? `3px solid ${theme.colors.text}` : '1px solid rgba(0,0,0,0.1)',
                      color: UI_COLORS.WHITE,
                      borderRadius: '50%',
                      width: 48,
                      height: 48,
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: themeColor === color.value ? '0 0 0 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {themeColor === color.value && <span style={{ fontSize: 20, fontWeight: 'bold' }}>✓</span>}
                  </button>
                ))}
              </Space>
            </div>

            <div style={{ 
              padding: '16px', 
              background: theme.colors.backgroundSecondary, 
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 8
            }}>
              <Text strong style={{ color: theme.colors.text }}>主题预览</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag style={{ background: theme.colors.primary, color: UI_COLORS.WHITE, border: 'none' }}>主色</Tag>
                <Tag style={{ background: theme.colors.success, color: UI_COLORS.WHITE, border: 'none' }}>成功</Tag>
                <Tag style={{ background: theme.colors.warning, color: UI_COLORS.WHITE, border: 'none' }}>警告</Tag>
                <Tag style={{ background: theme.colors.error, color: UI_COLORS.WHITE, border: 'none' }}>错误</Tag>
              </div>
            </div>
          </div>
        )
        
      case 'font-size':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>字体大小</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>调整界面中的字体大小</Text>
            <Slider
              min={10}
              max={20}
              value={fontConfig.base}
              onChange={(value) => setFontSize('base', value)}
              marks={{
                10: '10',
                14: '14',
                20: '20'
              }}
            />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Tag color="blue" style={{ fontSize: fontConfig.base }}>{fontConfig.base}px</Tag>
            </div>
          </div>
        )

      

      case 'compact-mode':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>紧凑模式</Title>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>启用紧凑模式</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>缩小表格节点尺寸，在画布上显示更多内容</Text>
              </div>
              <Switch checked={compactMode} onChange={setCompactMode} />
            </div>
          </div>
        )

      case 'zoom-level':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>画布缩放</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>快速切换画布缩放级别</Text>
            <Space size="small">
              {zoomPresets.map((preset) => (
                <Button
                  key={preset.value}
                  type={Math.abs(canvasZoom - preset.value) < 0.01 ? 'primary' : 'default'}
                  onClick={() => setCanvasZoom(preset.value)}
                  size="small"
                >
                  {preset.label}
                </Button>
              ))}
            </Space>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">当前缩放级别: </Text>
              <Tag>{(canvasZoom * 100).toFixed(0)}%</Tag>
            </div>
          </div>
        )

      case 'minimap':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>小地图</Title>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>显示小地图</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>在画布右下角显示缩略图导航</Text>
              </div>
              <Switch checked={showMiniMap} onChange={setShowMiniMap} />
            </div>
          </div>
        )

      case 'edges':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>关系线设置</Title>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <Text strong>显示关系标签</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>在连线上显示表名和列名</Text>
              </div>
              <Switch checked={showEdgeLabels} onChange={setShowEdgeLabels} />
            </div>

            <Text strong style={{ display: 'block', marginBottom: 12 }}>线条样式</Text>
            <Space size="small">
              <Button
                type={edgeStyle === 'straight' ? 'primary' : 'default'}
                onClick={() => setEdgeStyle('straight')}
                size="small"
              >
                直线
              </Button>
              <Button
                type={edgeStyle === 'step' ? 'primary' : 'default'}
                onClick={() => setEdgeStyle('step')}
                size="small"
              >
                阶梯线
              </Button>
              <Button
                type={edgeStyle === 'smooth' ? 'primary' : 'default'}
                onClick={() => setEdgeStyle('smooth')}
                size="small"
              >
                平滑曲线
              </Button>
              <Button
                type={edgeStyle === 'smart' ? 'primary' : 'default'}
                onClick={() => setEdgeStyle('smart')}
                size="small"
              >
                智能避让
              </Button>
              <Button
                type={edgeStyle === 'avoidNode' ? 'primary' : 'default'}
                onClick={() => setEdgeStyle('avoidNode')}
                size="small"
              >
                阶梯避让
              </Button>
            </Space>
            {(edgeStyle === 'smart' || edgeStyle === 'avoidNode') && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{edgeStyle === 'smart' ? '智能避让模式会自动检测关系线是否穿过中间表节点，并计算绕行路径' : '阶梯避让模式使用平滑阶梯线，自动绕过中间节点'}</Text>
              </div>
            )}
          </div>
        )

      case 'auto-save':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>自动保存</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>设置自动保存的频率</Text>
            <Space size="small" wrap>
              {autoSavePresets.map((preset) => (
                <Button
                  key={preset.value}
                  type={autoSaveInterval === preset.value ? 'primary' : 'default'}
                  onClick={() => setAutoSaveInterval(preset.value)}
                  size="small"
                >
                  {preset.label}
                </Button>
              ))}
            </Space>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">当前: 每 {formatInterval(autoSaveInterval)}</Text>
            </div>
          </div>
        )

      case 'shortcuts':
        return (
          <SettingSection title="键盘快捷键">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <ShortcutItem keys={['Ctrl', 'Z']} action="撤销" />
              <ShortcutItem keys={['Ctrl', 'Shift', 'Z']} action="重做" />
              <ShortcutItem keys={['Ctrl', 'S']} action="保存" />
              <ShortcutItem keys={['Ctrl', 'T']} action="新建表" />
              <ShortcutItem keys={['Ctrl', ',']} action="打开设置" />
              <ShortcutItem keys={['Ctrl', 'Shift', 'E']} action="导入导出" />
              <ShortcutItem keys={['Delete']} action="删除选中表" />
              <ShortcutItem keys={['Esc']} action="关闭弹窗/取消选择" />
              <ShortcutItem keys={['Ctrl', '0']} action="重置缩放" />
              <ShortcutItem keys={['Ctrl', '+']} action="放大" />
              <ShortcutItem keys={['Ctrl', '-']} action="缩小" />
              <ShortcutItem keys={['Ctrl', 'A']} action="全选" />
              <ShortcutItem keys={['Ctrl', 'C']} action="复制" />
              <ShortcutItem keys={['Ctrl', 'V']} action="粘贴" />
              <ShortcutItem keys={['Ctrl', 'F']} action="查找" />
            </div>
          </SettingSection>
        )

      case 'connections':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>数据库连接</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>配置和管理数据库连接，支持连接测试</Text>
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              onClick={() => {
                onOpenConnections?.()
              }}
            >
              打开连接管理
            </Button>
          </div>
        )

      case 'type-convert':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>数据库类型转换</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>在不同数据库之间转换数据类型</Text>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => {
                onOpenTypeConvert?.()
              }}
            >
              打开类型转换工具
            </Button>
          </div>
        )

      case 'ai-assistant':
        return <AIAssistantSettings />

      case 'table-prefix':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>表前缀</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>配置默认的表前缀，导出 SQL 时会自动添加</Text>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>快速选择预设</Text>
                <Space wrap>
                  {tablePrefixPresets.map((prefix) => (
                    <Tag
                      key={prefix || 'empty'}
                      color={tablePrefix === prefix ? 'blue' : 'default'}
                      closable={prefix !== ''}
                      onClose={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeTablePrefixPreset(prefix)
                      }}
                      style={{ cursor: 'pointer', padding: '4px 12px' }}
                      onClick={() => setTablePrefix(prefix)}
                    >
                      {prefix || '无'}
                    </Tag>
                  ))}
                  <Tag
                    color="success"
                    style={{ cursor: 'pointer', padding: '4px 12px' }}
                    onClick={() => {
                      const newPrefix = prompt('请输入新的表前缀（例如: my_）', '')
                      if (newPrefix !== null) {
                        addTablePrefixPreset(newPrefix)
                      }
                    }}
                  >
                    <PlusOutlined /> 添加
                  </Tag>
                </Space>
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>自定义输入</Text>
                <Input
                  value={tablePrefix}
                  onChange={(e) => setTablePrefix(e.target.value)}
                  placeholder="输入自定义的表前缀，留空则无前缀"
                  size="large"
                />
              </div>
              {tablePrefix && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  当前配置的表前缀：<strong>{tablePrefix}</strong>
                </Text>
              )}
            </Space>
          </div>
        )

      case 'auto-add-id':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>自动添加id列</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>创建新表时是否自动添加id列作为主键</Text>
            <Switch
              checked={autoAddIdColumn}
              onChange={setAutoAddIdColumn}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              当前状态：<strong>{autoAddIdColumn ? '已开启' : '已关闭'}</strong>
            </Text>
          </div>
        )

      case 'operation-history':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>操作历史</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              查看和导出项目的操作历史记录，包括创建、更新、删除等操作
            </Text>

            <Divider style={{ margin: '16px 0' }} />

            {isLocalMode ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <HistoryOutlined style={{ fontSize: 48, color: UI_COLORS.GRAY, marginBottom: 16 }} />
                <Text type="secondary">操作历史功能需要在线模式</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>本地模式下暂不支持操作历史记录</Text>
              </div>
            ) : !currentProject ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">请先打开一个项目</Text>
              </div>
            ) : (
              <div>
                <Button
                  type="primary"
                  icon={<HistoryOutlined />}
                  size="large"
                  onClick={() => setHistoryModalOpen(true)}
                >
                  查看操作历史
                </Button>
                <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
                  当前项目：<strong>{currentProject.name}</strong>
                </Text>
              </div>
            )}
          </div>
        )

      case 'changelog':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>更新日志</Title>
            <Timeline
              mode="left"
              items={updateLogs.map((log) => ({
                key: log.id,
                color: log.type === 'feature' ? 'blue' : log.type === 'bugfix' ? 'red' : log.type === 'security' ? 'orange' : 'green',
                children: (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{log.version}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{log.date}</Text>
                    </div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                      {log.description}
                    </Text>
                    {log.details && log.details.length > 0 && (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {log.details.map((detail, idx) => (
                          <li key={idx}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{detail}</Text>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              }))}
            />
          </div>
        )

      default:
        return (
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text type="secondary">请选择左侧的设置项</Text>
          </div>
        )
    }
  }, [selectedKey, theme, themeOptions, fontConfig, compactMode, canvasZoom, showMiniMap, showEdgeLabels, edgeStyle, autoSaveInterval, tablePrefix, tablePrefixPresets, autoAddIdColumn, isLocalMode, currentProject, updateLogs, searchValue, onOpenConnections, onOpenLLM, onOpenTypeConvert, setTheme, setThemeColor, setFontSize, setCompactMode, setCanvasZoom, setShowMiniMap, setShowEdgeLabels, setEdgeStyle, setAutoSaveInterval, setTablePrefix, addTablePrefixPreset, removeTablePrefixPreset, setAutoAddIdColumn])

  const onTreeSelect = useCallback((selectedKeys: Key[]) => {
    if (selectedKeys.length > 0) {
      setSelectedKey(selectedKeys[0] as string)
    }
  }, [])

  return (
    <>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: 220, borderRight: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', flexDirection: 'column', background: UI_COLORS.WHITE }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined />
            <span style={{ fontWeight: 500 }}>设置</span>
          </div>
          <Input
            placeholder="搜索设置..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ padding: '12px 16px', borderBottom: `1px solid ${UI_COLORS.BORDER}` }}
            size="small"
          />
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={[selectedKey]}
              onSelect={onTreeSelect}
              style={{ padding: '0 8px' }}
              showIcon
            />
          </div>
          <div style={{ padding: '16px', borderTop: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', gap: 8 }}>
            <Button onClick={handleReset} size="small" style={{ flex: 1 }}>重置默认</Button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: UI_COLORS.BG }}>
          {renderContent}
        </div>
      </div>

      {/* 操作历史弹窗 */}
      {currentProject && (
        <HistoryModal
          open={historyModalOpen}
          onCancel={() => setHistoryModalOpen(false)}
          projectId={currentProject.id}
          projectName={currentProject.name}
        />
      )}
    </>
  )
}