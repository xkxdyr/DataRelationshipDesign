import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Input, Button, Space, Typography, Select, Card, message, Tag, Divider, Alert, Popconfirm, Modal, Radio, Table, Switch, Checkbox, Progress, Statistic, Row, Col, Tooltip, Empty, Spin, Form, Tabs } from 'antd'
import { RobotOutlined, SettingOutlined, ThunderboltOutlined, CheckCircleOutlined, DeleteOutlined, RotateLeftOutlined, XOutlined, PlusOutlined, DatabaseOutlined, KeyOutlined, TeamOutlined, UserOutlined, SafetyCertificateOutlined, ExclamationCircleOutlined, HistoryOutlined, CloudUploadOutlined, CopyOutlined, DashboardOutlined, FieldTimeOutlined, ApiOutlined, SearchOutlined, BulbOutlined, BarChartOutlined, FileSearchOutlined, StarOutlined, WarningOutlined, SendOutlined, PaperClipOutlined, ReloadOutlined, EyeOutlined, ToolOutlined, EditOutlined, ProfileOutlined, NodeIndexOutlined } from '@ant-design/icons'
import { llmApi, teamApi, Team, TableSuggestion, LLMConfigInfo, MockDataResult, MockDataRequest, ConnectionTestResult, ConversationMessage, conversationApi, connectionApi, ConnectionConfig } from '../services/api'
import localStorageService from '../services/localStorageService'
import { useAppStore } from '../stores/appStore'
import type { Table as TableType, Column as ColumnType } from '../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface LLMTabProps {
  onApplyTables?: (tables: TableSuggestion[]) => void
  onClose?: () => void
}

// ====== 对话消息类型 ======
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  type?: 'text' | 'analysis' | 'tables' | 'mock' | 'recommend' | 'performance' | 'optimization'
  data?: any
}

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

const databaseTypes = [
  { value: 'MYSQL', label: 'MySQL' }, { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQLITE', label: 'SQLite' }, { value: 'SQLSERVER', label: 'SQL Server' },
]
const defaultPortMap: Record<string, number> = { MYSQL: 3306, POSTGRESQL: 5432, SQLITE: 0, SQLSERVER: 1433 }
const rowCountOptions = [10, 50, 100, 500, 1000]

const getScoreColor = (score: number) => score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'

// ====== 主组件 ======
export const LLMTab: React.FC<LLMTabProps> = ({ onApplyTables, onClose }) => {
  const { currentUser, currentProject, tables, getProjectSnapshot, updateColumn, updateTable, createIndex, createRelationship, deleteRelationship, pushHistory } = useAppStore()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  // 配置相关
  const [userConfigs, setUserConfigs] = useState<LLMConfigInfo[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [configForm] = Form.useForm() // eslint-disable-line
  const [configScope, setConfigScope] = useState<'user' | 'team'>('user')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResultModal, setTestResultModal] = useState<ConnectionTestResult | null>(null)
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const selectedProvider = Form.useWatch('provider', configForm) || 'ollama'

  // 子弹窗
  const [mockDetailModal, setMockDetailModal] = useState<{ visible: boolean; data: MockDataResult | null }>({ visible: false, data: null })
  const [writeToDbModalVisible, setWriteToDbModalVisible] = useState(false)
  const [writeToDbForm] = Form.useForm() // eslint-disable-line
  const [writeToDbLoading, setWriteToDbLoading] = useState(false)
  const [perfTestModalVisible, setPerfTestModalVisible] = useState(false)
  const [dbConnectionForm] = Form.useForm() // eslint-disable-line
  const [perfTestResult, setPerfTestResult] = useState<any>(null)
  const [perfTestLoading, setPerfTestLoading] = useState(false)
  const [tableSelectModal, setTableSelectModal] = useState<{ visible: boolean; mode: string }>({ visible: false, mode: '' })
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [mockRowCount, setMockRowCount] = useState(100)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [pendingTables, setPendingTables] = useState<TableSuggestion[]>([])

  // 数据库连接列表（复用已有连接）
  const [dbConnections, setDbConnections] = useState<ConnectionConfig[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [selectedConnectionIdForPerf, setSelectedConnectionIdForPerf] = useState<string>('')

  // ====== 初始化 ======
  useEffect(() => { loadUserConfigs(); loadTeams(); loadDbConnections() }, []) // eslint-disable-line
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  // 欢迎消息
  useEffect(() => {
    if (chatMessages.length === 0) {
      addSystemMessage('👋 你好！我是AI数据库助手，可以帮你分析项目、生成表结构、模拟数据等。点击上方快捷操作或直接输入需求开始。')
    }
  }, []) // eslint-disable-line

  // ====== 辅助函数 ======
  const addMessage = useCallback((role: ChatMessage['role'], content: string, type?: ChatMessage['type'], data?: any): string => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const msg: ChatMessage = { id, role, content, timestamp: Date.now(), type, data }
    setChatMessages(prev => [...prev, msg])
    return id
  }, [])

  const addSystemMessage = useCallback((content: string) => {
    addMessage('system', content)
  }, [addMessage])

  const loadTeams = useCallback(async () => {
    if (!currentUser) return
    try {
      const response = await teamApi.getTeamsByUserId(currentUser.id)
      if (response.success && response.data) setTeams(response.data)
    } catch (e) { /* 忽略 */ }
  }, [currentUser])

  const loadDbConnections = useCallback(async () => {
    try {
      const response = await connectionApi.getAll()
      if (response.success && response.data) setDbConnections(response.data)
    } catch (e) { console.error('加载连接列表失败:', e) }
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
              const tr = await llmApi.getTeamConfigs(team.id)
              if (tr.success && tr.data) configs = [...configs, ...tr.data]
            } catch (e) { /* 忽略 */ }
          }
        }
        setUserConfigs(configs)
        const defaultConfig = configs.find(c => c.isDefault)
        if (defaultConfig) setSelectedConfigId(defaultConfig.id)
        else if (configs.length > 0) setSelectedConfigId(configs[0].id)
      }
    } catch (e) { console.error('加载配置失败:', e) }
  }, [currentUser, teams])

  const ensureConfig = useCallback((): boolean => {
    if (!selectedConfigId && userConfigs.length === 0) {
      addSystemMessage('⚠️ 请先配置大模型。点击右上角 ⚙ 按钮或在设置>AI助手中添加配置。')
      return false
    }
    if (!selectedConfigId) {
      addSystemMessage('⚠️ 请在顶部选择一个模型配置后再操作。')
      return false
    }
    return true
  }, [selectedConfigId, userConfigs, addSystemMessage])

  // ====== 快捷操作 ======
  const handleAnalyzeProject = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法分析。'); return }
    addMessage('user', `📊 分析当前项目的数据库设计${currentProject?.name ? `（${currentProject.name}）` : ''}`)
    setLoading(true)
    try {
      const tablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, comment: c.comment || '' }))
      }))
      const response = await llmApi.analyzeProject(tablesData, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `📊 项目分析完成`, 'analysis', response.data)
      } else {
        addSystemMessage(`❌ 分析失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 分析失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [tables, selectedConfigId, ensureConfig, addMessage, addSystemMessage, currentProject])

  const handleAnalyzeTable = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表。'); return }
    setTableSelectModal({ visible: true, mode: 'analyze' })
  }, [ensureConfig, tables, addSystemMessage])

  const handleGenerateTables = useCallback(async () => {
    if (!ensureConfig()) return
    if (!inputValue.trim()) { addSystemMessage('⚠️ 请在输入框描述你需要的表结构。'); return }
    const desc = inputValue.trim()
    setInputValue('')
    // 构建项目上下文：已有表 + 项目描述
    let contextDesc = desc
    if (currentProject) {
      const projectInfo = [currentProject.name].filter(Boolean).join(' - ')
      if (tables.length > 0) {
        const existingTables = tables.map((t: TableType) => {
          const cols = (t.columns || []).map(c => c.name).join(', ')
          return `  - ${t.name}${t.comment ? `(${t.comment})` : ''} [${cols}]`
        }).join('\n')
        contextDesc = `${desc}\n\n【当前项目信息】\n项目: ${projectInfo}\n\n【已存在的表】\n${existingTables}\n\n请生成与现有表协调、不重复的新表结构。`
      } else if (projectInfo) {
        contextDesc = `${desc}\n\n【项目信息】${projectInfo}`
      }
    }
    addMessage('user', `✨ 生成表结构: ${desc}`)
    setLoading(true)
    try {
      const snapshot = getProjectSnapshot()
      if (currentProject && snapshot) {
        try { await llmApi.createSnapshot(currentProject.id, 'ai_generate', 'AI生成前快照', snapshot) } catch (e) { /* 忽略 */ }
      }
      const response = await llmApi.generateTables(contextDesc, undefined, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `✨ 已生成 ${response.data.length} 个表`, 'tables', response.data)
      } else {
        addSystemMessage(`❌ 生成失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 生成失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [inputValue, selectedConfigId, ensureConfig, addMessage, addSystemMessage, currentProject, tables, getProjectSnapshot])

  const handleMockData = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法模拟数据。'); return }
    setTableSelectModal({ visible: true, mode: 'mock' })
  }, [ensureConfig, tables, addSystemMessage])

  const handleRecommendTables = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法推荐。'); return }
    addMessage('user', '💡 推荐当前项目可能需要的新表')
    setLoading(true)
    try {
      const tablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, comment: c.comment || '' }))
      }))
      // 追加项目上下文到请求数据中
      if (currentProject?.name) {
        ;(tablesData as any)._projectContext = `项目名称: ${currentProject.name}${currentProject.description ? `\n项目描述: ${currentProject.description}` : ''}`
      }
      const response = await llmApi.recommendTables(tablesData, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `💡 推荐了 ${response.data.length} 个新表`, 'recommend', response.data)
      } else {
        addSystemMessage(`❌ 推荐失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 推荐失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [tables, selectedConfigId, ensureConfig, addMessage, addSystemMessage, currentProject])

  // ====== 优化项目 ======
  const handleOptimizeProject = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法优化。'); return }
    addMessage('user', '🔧 优化整个项目')
    setLoading(true)
    try {
      const tablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '' }))
      }))
      const response = await llmApi.optimizeProject(tablesData, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `🔧 项目优化分析完成，共 ${response.data.optimizations?.length || 0} 条建议`, 'optimization', { ...response.data, optimizeType: 'project' })
      } else {
        addSystemMessage(`❌ 优化失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 优化失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [tables, selectedConfigId, ensureConfig, addMessage, addSystemMessage])

  // ====== 优化单表 ======
  const handleOptimizeTable = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法优化。'); return }
    setTableSelectModal({ visible: true, mode: 'optimizeTable' })
  }, [ensureConfig, tables, addSystemMessage])

  // 执行单表优化
  const handleOptimizeTableConfirm = useCallback(async (tableId: string) => {
    const table = tables.find((t: TableType) => t.id === tableId)
    if (!table) return
    addMessage('user', `🔧 优化表 ${table.name}`)
    setLoading(true)
    try {
      const tableData = {
        name: table.name, comment: table.comment || '',
        columns: (table.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '' }))
      }
      const allTablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, comment: c.comment || '' }))
      }))
      const response = await llmApi.optimizeTable(tableData, allTablesData, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `🔧 表 ${table.name} 优化完成`, 'optimization', { ...response.data, optimizeType: 'table' })
      } else {
        addSystemMessage(`❌ 优化失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 优化失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [tables, selectedConfigId, addMessage, addSystemMessage])

  // ====== 优化表结构 ======
  const handleOptimizeTableStructure = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法优化。'); return }
    setTableSelectModal({ visible: true, mode: 'optimizeStructure' })
  }, [ensureConfig, tables, addSystemMessage])

  // 执行表结构优化
  const handleOptimizeStructureConfirm = useCallback(async (tableId: string) => {
    const table = tables.find((t: TableType) => t.id === tableId)
    if (!table) return
    addMessage('user', `🏗️ 优化表 ${table.name} 的结构`)
    setLoading(true)
    try {
      const tableData = {
        name: table.name, comment: table.comment || '',
        columns: (table.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '', length: c.length || null }))
      }
      const response = await llmApi.optimizeTableStructure(tableData, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `🏗️ 表 ${table.name} 结构优化完成`, 'optimization', { ...response.data, optimizeType: 'structure' })
      } else {
        addSystemMessage(`❌ 优化失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 优化失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [tables, selectedConfigId, addMessage, addSystemMessage])

  // ====== 优化表关系 ======
  const handleOptimizeRelationships = useCallback(async () => {
    if (!ensureConfig()) return
    if (tables.length === 0) { addSystemMessage('⚠️ 当前项目没有表，无法优化关系。'); return }
    addMessage('user', '🔗 优化表关系')
    setLoading(true)
    try {
      const tablesData = tables.map((t: TableType) => ({
        name: t.name, comment: t.comment || '',
        columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '' }))
      }))
      const response = await llmApi.optimizeTableRelationships(tablesData, undefined, selectedConfigId)
      if (response.success && response.data) {
        addMessage('assistant', `🔗 表关系优化完成，共 ${response.data.relationshipOptimizations?.length || 0} 条建议`, 'optimization', { ...response.data, optimizeType: 'relationships' })
      } else {
        addSystemMessage(`❌ 优化失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      addSystemMessage(`❌ 优化失败: ${(error as Error).message}`)
    } finally { setLoading(false) }
  }, [tables, selectedConfigId, ensureConfig, addMessage, addSystemMessage])

  // ====== 应用优化：表结构优化（字段类型/命名/约束） ======
  const handleApplyStructureOptimization = useCallback(async (data: any) => {
    if (!data.tableName || !currentProject) { message.warning('缺少表信息'); return }
    const table = tables.find((t: TableType) => t.name === data.tableName)
    if (!table) { message.error(`未找到表: ${data.tableName}`); return }

    let appliedCount = 0
    const errors: string[] = []

    pushHistory()

    // 应用字段类型变更
    if (data.columnChanges?.length > 0) {
      for (const cc of data.columnChanges) {
        const col = (table.columns || []).find((c: ColumnType) => c.name === cc.columnName)
        if (!col) { errors.push(`未找到字段: ${cc.columnName}`); continue }
        try {
          const updateData: any = {}
          if (cc.suggestedType && cc.suggestedType !== col.dataType) updateData.dataType = cc.suggestedType
          if (cc.suggestedLength !== undefined && cc.suggestedLength !== null) updateData.length = Number(cc.suggestedLength)
          else if (cc.suggestedLength === null) updateData.length = null
          if (Object.keys(updateData).length > 0) {
            await updateColumn(col.id, updateData)
            appliedCount++
          }
        } catch (e) { errors.push(`更新${cc.columnName}失败`) }
      }
    }

    // 应用命名修改
    if (data.namingIssues?.length > 0) {
      for (const n of data.namingIssues) {
        const col = (table.columns || []).find((c: ColumnType) => c.name === n.currentName)
        if (!col) { errors.push(`未找到字段: ${n.currentName}`); continue }
        try {
          await updateColumn(col.id, { name: n.suggestedName })
          appliedCount++
        } catch (e) { errors.push(`重命名${n.currentName}失败`) }
      }
    }

    // 应用缺失约束
    if (data.missingConstraints?.length > 0) {
      for (const mc of data.missingConstraints) {
        const col = (table.columns || []).find((c: ColumnType) => c.name === mc.column)
        if (!col) { errors.push(`未找到字段: ${mc.column}`); continue }
        try {
          const constraintData: any = {}
          if (mc.constraint.includes('NOT NULL')) constraintData.nullable = false
          if (mc.constraint.includes('UNIQUE')) constraintData.unique = true
          if (mc.constraint.includes('DEFAULT') && mc.constraint.match(/DEFAULT\s+(.+)/)) {
            constraintData.defaultValue = mc.constraint.match(/DEFAULT\s+(.+)/)?.[1] || ''
          }
          if (Object.keys(constraintData).length > 0) {
            await updateColumn(col.id, constraintData)
            appliedCount++
          }
        } catch (e) { errors.push(`添加${mc.column}约束失败`) }
      }
    }

    if (appliedCount > 0) {
      message.success(`已应用 ${appliedCount} 项结构优化到表 ${data.tableName}`)
      addSystemMessage(`✅ 已对 ${data.tableName} 应用 ${appliedCount} 项结构优化`)
    }
    if (errors.length > 0) message.warning(`${errors.length} 项失败: ${errors.slice(0, 3).join(', ')}`)
  }, [tables, currentProject, updateColumn, pushHistory, addSystemMessage])

  // ====== 应用优化：单表优化（字段+索引+约束） ======
  const handleApplyTableOptimization = useCallback(async (data: any) => {
    if (!data.tableName || !currentProject) { message.warning('缺少表信息'); return }
    const table = tables.find((t: TableType) => t.name === data.tableName)
    if (!table) { message.error(`未找到表: ${data.tableName}`); return }

    let appliedCount = 0
    const errors: string[] = []
    pushHistory()

    // 应用字段优化
    if (data.fieldOptimizations?.length > 0) {
      for (const f of data.fieldOptimizations) {
        const col = (table.columns || []).find((c: ColumnType) => c.name === f.field)
        if (!col) { errors.push(`未找到字段: ${f.field}`); continue }
        try {
          // 根据建议内容智能解析变更
          const updateData: any = {}
          const suggestionLower = f.suggestedChange.toLowerCase()
          if (suggestionLower.includes('varchar') || suggestionLower.includes('int') || suggestionLower.includes('text') || suggestionLower.includes('decimal') || suggestionLower.includes('date') || suggestionLower.includes('bool') || suggestionLower.includes('bigint')) {
            const typeMatch = f.suggestedChange.match(/[A-Za-z]+(?:\(\d+\))?/)
            if (typeMatch) updateData.dataType = typeMatch[0].toUpperCase()
          }
          if (suggestionLower.includes('not null')) updateData.nullable = false
          if (suggestionLower.includes('nullable') || suggestionLower.includes('可空')) updateData.nullable = true
          if (suggestionLower.includes('unique')) updateData.unique = true
          if (suggestionLower.includes('rename') || suggestionLower.includes('重命名')) {
            const nameMatch = f.suggestedChange.match(/['"]?(\w+)['"]?\s*$/)
            if (nameMatch) updateData.name = nameMatch[1]
          }
          if (Object.keys(updateData).length > 0) {
            await updateColumn(col.id, updateData)
            appliedCount++
          }
        } catch (e) { errors.push(`更新${f.field}失败`) }
      }
    }

    // 创建索引
    if (data.indexSuggestions?.length > 0) {
      for (const idx of data.indexSuggestions) {
        try {
          const colNames = idx.columns.split(',').map((c: string) => c.trim())
          const colIds = colNames.map((cn: string) => {
            const found = (table.columns || []).find((c: ColumnType) => c.name === cn)
            return found?.id || ''
          }).filter(Boolean)
          if (colIds.length > 0) {
            await createIndex(table.id, {
              name: `idx_${table.name}_${colNames.join('_')}`,
              columns: colIds,
              unique: idx.type?.toUpperCase() === 'UNIQUE',
              type: idx.type?.toUpperCase() === 'FULLTEXT' ? 'FULLTEXT' : 'BTREE'
            })
            appliedCount++
          }
        } catch (e) { errors.push(`创建索引失败: ${idx.columns}`) }
      }
    }

    // 应用约束变更
    if (data.constraintChanges?.length > 0) {
      for (const c of data.constraintChanges) {
        // 约束变更通常需要匹配具体字段，这里尝试从detail中提取字段名
        const fieldMatch = c.detail.match(/(\w+)/)
        if (!fieldMatch) continue
        const col = (table.columns || []).find((cl: ColumnType) => cl.name === fieldMatch[1])
        if (!col) continue
        try {
          const constraintData: any = {}
          if (c.type.includes('NOT_NULL') || c.type === 'NOT NULL') constraintData.nullable = false
          if (c.type.includes('UNIQUE')) constraintData.unique = true
          if (c.type.includes('DEFAULT') && c.detail.match(/DEFAULT\s+.+/)) {
            constraintData.defaultValue = c.detail.match(/DEFAULT\s+(.+)/)?.[1] || ''
          }
          if (Object.keys(constraintData).length > 0) {
            await updateColumn(col.id, constraintData)
            appliedCount++
          }
        } catch (e) { errors.push(`应用约束失败: ${c.detail}`) }
      }
    }

    if (appliedCount > 0) {
      message.success(`已应用 ${appliedCount} 项优化到表 ${data.tableName}`)
      addSystemMessage(`✅ 已对 ${data.tableName} 应用 ${appliedCount} 项优化`)
    }
    if (errors.length > 0) message.warning(`${errors.length} 项失败: ${errors.slice(0,3).join(', ')}`)
  }, [tables, currentProject, updateColumn, createIndex, pushHistory, addSystemMessage])

  // ====== 应用优化：关系优化 ======
  const handleApplyRelationshipsOptimization = useCallback(async (data: any) => {
    if (!currentProject) { message.warning('请先选择项目'); return }
    if (!data.relationshipOptimizations || data.relationshipOptimizations.length === 0) { message.warning('没有可应用的优化项'); return }

    let appliedCount = 0
    let removedCount = 0
    const errors: string[] = []
    pushHistory()

    for (const r of data.relationshipOptimizations) {
      try {
        if (r.actionType === 'add') {
          const fromTable = tables.find((t: TableType) => t.name === r.fromTable)
          const toTable = tables.find((t: TableType) => t.name === r.toTable)
          if (!fromTable || !toTable) { errors.push(`未找到表: ${r.fromTable}/${r.toTable}`); continue }
          const fromCol = (fromTable.columns || []).find((c: ColumnType) => c.name === r.fromColumn)
          const toCol = (toTable.columns || []).find((c: ColumnType) => c.name === r.toColumn)
          if (!fromCol || !toCol) { errors.push(`未找到列: ${r.fromColumn}/${r.toColumn}`); continue }
          await createRelationship(currentProject.id, {
            sourceTableId: fromTable.id,
            sourceColumnId: fromCol.id,
            targetTableId: toTable.id,
            targetColumnId: toCol.id,
            relationshipType: 'ONE_TO_MANY',
            onUpdate: 'NO ACTION',
            onDelete: 'SET NULL'
          })
          appliedCount++
        } else if (r.actionType === 'remove') {
          const rel = useAppStore.getState().relationships.find(
            (rel: any) =>
              rel.sourceTableId === tables.find((t: TableType) => t.name === r.fromTable)?.id &&
              rel.targetTableId === tables.find((t: TableType) => t.name === r.toTable)?.id
          )
          if (rel) {
            await deleteRelationship(rel.id)
            removedCount++
          }
        } else if (r.actionType === 'modify') {
          // 修改关系 = 删除旧的 + 新增新的
          const oldRel = useAppStore.getState().relationships.find(
            (rel: any) =>
              rel.sourceTableId === tables.find((t: TableType) => t.name === r.fromTable)?.id &&
              rel.targetTableId === tables.find((t: TableType) => t.name === r.toTable)?.id
          )
          if (oldRel) await deleteRelationship(oldRel.id)
          const fromTable = tables.find((t: TableType) => t.name === r.fromTable)
          const toTable = tables.find((t: TableType) => t.name === r.toTable)
          if (fromTable && toTable) {
            const fromCol = (fromTable.columns || []).find((c: ColumnType) => c.name === r.fromColumn)
            const toCol = (toTable.columns || []).find((c: ColumnType) => c.name === r.toColumn)
            if (fromCol && toCol) {
              await createRelationship(currentProject.id, {
                sourceTableId: fromTable.id, sourceColumnId: fromCol.id,
                targetTableId: toTable.id, targetColumnId: toCol.id,
                relationshipType: 'ONE_TO_MANY', onUpdate: 'NO ACTION', onDelete: 'SET NULL'
              })
              appliedCount++
            }
          }
        }
      } catch (e) { errors.push(`${r.fromTable}->${r.toTable}: ${(e as Error).message}`) }
    }

    const parts: string[] = []
    if (appliedCount > 0) parts.push(`新增 ${appliedCount} 个关系`)
    if (removedCount > 0) parts.push(`移除 ${removedCount} 个关系`)
    if (parts.length > 0) {
      message.success(parts.join(', '))
      addSystemMessage(`✅ 关系优化已应用: ${parts.join(', ')}`)
    }
    if (errors.length > 0) message.warning(`${errors.length} 项失败`)
  }, [tables, currentProject, createRelationship, deleteRelationship, pushHistory, addSystemMessage])

  // ====== 应用优化：项目级优化（智能批量应用所有建议） ======
  const handleApplyProjectOptimization = useCallback(async (data: any) => {
    if (!data.optimizations || data.optimizations.length === 0) { message.warning('没有可应用的优化建议'); return }
    if (!currentProject) { message.warning('请先选择项目'); return }

    let appliedCount = 0
    const errors: string[] = []
    const details: string[] = []
    pushHistory()

    // 构建表名→表的映射，方便快速查找
    const tableMap = new Map<string, TableType>()
    for (const t of tables) tableMap.set(t.name.toLowerCase(), t)

    // 从建议文本中提取表名的辅助函数
    const extractTableName = (text: string): string | null => {
      // 匹配 "表xxx"、"xxx表"、"表 xxx" 等模式
      const patterns = [
        /(?:表[：:\s]*)([\w\u4e00-\u9fff]+)/,
        /([\w\u4e00-\u9fff]+)(?:表)/,
        /`?([\w]+)`?\s*表/,
        /表\s*`?([\w]+)`?/
      ]
      for (const p of patterns) {
        const m = text.match(p)
        if (m && m[1]) {
          const name = m[1].trim()
          if (tableMap.has(name.toLowerCase())) return name
          // 模糊匹配
          for (const [tableName] of tableMap) {
            if (tableName.includes(name.toLowerCase()) || name.toLowerCase().includes(tableName)) return tableMap.get(tableName)?.name || null
          }
        }
      }
      return null
    }

    // 从建议文本中提取字段名的辅助函数
    const extractFieldName = (text: string, targetTable: TableType): ColumnType | null => {
      const colNames = (targetTable.columns || []).map(c => c.name.toLowerCase())
      for (const col of targetTable.columns || []) {
        if (text.toLowerCase().includes(col.name.toLowerCase())) return col
      }
      // 尝试常见模式
      const fieldMatch = text.match(/(?:字段|列)[：:\s]*`?(\w+)`?/)
      if (fieldMatch) {
        const found = (targetTable.columns || []).find(c => c.name.toLowerCase() === fieldMatch[1].toLowerCase())
        if (found) return found
      }
      return null
    }

    for (const opt of data.optimizations) {
      try {
        const fullText = `${opt.area} ${opt.issue} ${opt.suggestion}`
        const tableName = extractTableName(fullText)
        const areaLower = (opt.area || '').toLowerCase()
        const issueLower = (opt.issue || '').toLowerCase()
        const suggestionLower = (opt.suggestion || '').toLowerCase()

        // ---- 关系/外键类优化 ----
        if (areaLower.includes('关系') || areaLower.includes('外键') || areaLower.includes('关联') ||
            issueLower.includes('外键') || issueLower.includes('关系') || issueLower.includes('关联')) {
          // 尝试提取两个表名和列名来创建关系
          const allTableNames = Array.from(tableMap.keys())
          const mentionedTables = allTableNames.filter((tn: string) =>
            fullText.toLowerCase().includes(tn) || fullText.includes(tableMap.get(tn)?.name || '')
          )
          if (mentionedTables.length >= 2) {
            const t1 = tableMap.get(mentionedTables[0])
            const t2 = tableMap.get(mentionedTables[1])
            if (t1 && t2) {
              // 找可能的FK列（通常含id或主表名）
              const fromCol = (t1.columns || []).find((c: ColumnType) =>
                c.primaryKey || c.name.toLowerCase().includes('id') ||
                t2.name.toLowerCase().replace(/s$/, '').includes(c.name.toLowerCase())
              ) || (t1.columns || []).find(c => c.primaryKey)
              const toCol = (t2.columns || []).find((c: ColumnType) =>
                c.primaryKey || c.name.toLowerCase().includes('id')
              ) || (t2.columns || []).find(c => c.primaryKey)
              if (fromCol && toCol) {
                await createRelationship(currentProject.id, {
                  sourceTableId: t1.id, sourceColumnId: fromCol.id,
                  targetTableId: t2.id, targetColumnId: toCol.id,
                  relationshipType: 'ONE_TO_MANY', onUpdate: 'NO ACTION', onDelete: 'SET NULL'
                })
                appliedCount++
                details.push(`关系: ${t1.name}.${fromCol.name} → ${t2.name}.${toCol.name}`)
                continue
              }
            }
          }
        }

        // ---- 索引类优化 ----
        if (areaLower.includes('索引') || suggestionLower.includes('索引') || suggestionLower.includes('index') ||
            issueLower.includes('查询慢') || issueLower.includes('缺少索引')) {
          if (tableName) {
            const targetTable = tableMap.get(tableName.toLowerCase())
            if (targetTable) {
              // 从建议中提取需要建索引的列
              const colsToIndex: ColumnType[] = []
              for (const col of (targetTable.columns || [])) {
                if (fullText.toLowerCase().includes(col.name.toLowerCase())) colsToIndex.push(col)
              }
              if (colsToIndex.length > 0) {
                await createIndex(targetTable.id, {
                  name: `idx_${targetTable.name}_${colsToIndex.map(c => c.name).join('_')}`,
                  columns: colsToIndex.map(c => c.id),
                  unique: suggestionLower.includes('unique'),
                  type: 'BTREE'
                })
                appliedCount++
                details.push(`索引: ${targetTable.name}(${colsToIndex.map(c => c.name).join(',')})`)
                continue
              } else if ((targetTable.columns || []).length > 0) {
                // 对主键列建索引
                const pkCol = (targetTable.columns || []).find(c => c.primaryKey)
                if (pkCol) {
                  await createIndex(targetTable.id, {
                    name: `idx_${targetTable.name}_${pkCol.name}`,
                    columns: [pkCol.id],
                    unique: false,
                    type: 'BTREE'
                  })
                  appliedCount++
                  details.push(`索引: ${targetTable.name}(${pkCol.name})`)
                  continue
                }
              }
            }
          }
        }

        // ---- 字段类型/设计类优化 ----
        if (areaLower.includes('类型') || areaLower.includes('数据类型') || areaLower.includes('字段') ||
            areaLower.includes('命名') || areaLower.includes('范式') || areaLower.includes('冗余') ||
            issueLower.includes('varchar') || issueLower.includes('int') || issueLower.includes('text') ||
            issueLower.includes('decimal') || issueLower.includes('date') || issueLower.includes('bool') ||
            suggestionLower.includes('改为') || suggestionLower.includes('修改为') || suggestionLower.includes('重命名')) {
          if (tableName) {
            const targetTable = tableMap.get(tableName.toLowerCase())
            if (targetTable) {
              const field = extractFieldName(fullText, targetTable)
              if (field) {
                const updateData: any = {}
                // 智能解析类型变更
                const typePatterns = [
                  /(?:改为|修改为|使用|改成|应改为|建议用)\s*([A-Za-z]+)(?:\((\d+)\))?/i,
                  /(VARCHAR|INT|TEXT|DECIMAL|DATE|DATETIME|BOOL|BIGINT|SMALLINT|FLOAT|DOUBLE|TIMESTAMP|CHAR)\b(?:\((\d+\))?)?/gi
                ]
                for (const tp of typePatterns) {
                  const tm = opt.suggestion.match(tp) || issueLower.match(tp)
                  if (tm && tm[1]) {
                    updateData.dataType = tm[1].toUpperCase()
                    if (tm[2]) updateData.length = Number(tm[2])
                    break
                  }
                }
                // 解析约束变更
                if (suggestionLower.includes('not null') || issueLower.includes('可空')) updateData.nullable = false
                if (suggestionLower.includes('unique')) updateData.unique = true
                // 解析重命名
                if (suggestionLower.includes('重命名') || suggestionLower.includes('rename')) {
                  const renameMatch = opt.suggestion.match(/['"]?(\w+)['"]?\s*$/)
                  if (renameMatch) updateData.name = renameMatch[1]
                }
                if (Object.keys(updateData).length > 0) {
                  await updateColumn(field.id, updateData)
                  appliedCount++
                  details.push(`${targetTable.name}.${field.name}: ${Object.entries(updateData).map(([k,v]) => `${k}=${v}`).join(', ')}`)
                  continue
                }
              }
            }
          }
          // 如果没匹配到具体表，尝试全局搜索字段
          if (!tableName) {
            for (const [, tbl] of tableMap) {
              const field = extractFieldName(fullText, tbl)
              if (field) {
                const updateData: any = {}
                if (suggestionLower.includes('not null')) updateData.nullable = false
                if (suggestionLower.includes('unique')) updateData.unique = true
                const typeMatch = opt.suggestion.match(/[A-Za-z]+(?:\(\d+\))?/)
                if (typeMatch) updateData.dataType = typeMatch[0].toUpperCase()
                if (Object.keys(updateData).length > 0) {
                  await updateColumn(field.id, updateData)
                  appliedCount++
                  details.push(`${tbl.name}.${field.name}: 已更新`)
                  break
                }
              }
            }
          }
        }

      } catch (e) {
        errors.push(`${opt.area}: ${(e as Error).message}`)
      }
    }

    // 结果反馈
    if (appliedCount > 0) {
      message.success(`已批量应用 ${appliedCount} 项优化建议`)
      addSystemMessage(`✅ 项目优化已应用 ${appliedCount} 项:\n${details.slice(0, 8).join('\n')}${details.length > 8 ? `\n...等${details.length}项` : ''}`)
    } else {
      message.info('未能自动匹配到具体的表/字段，建议使用下方"优化表"或"优化结构"功能逐一应用')
    }
    if (errors.length > 0) message.warning(`${errors.length} 项执行失败`)

  }, [tables, currentProject, updateColumn, createIndex, createRelationship, pushHistory, addSystemMessage])

  // ====== 表选择后执行 ======
  const handleTableSelectConfirm = useCallback(async () => {
    if (!selectedTableId) return
    const table = tables.find((t: TableType) => t.id === selectedTableId)
    if (!table) return
    setTableSelectModal({ visible: false, mode: '' })

    if (tableSelectModal.mode === 'analyze') {
      addMessage('user', `🔍 分析表 ${table.name}`)
      setLoading(true)
      try {
        const tableData = {
          name: table.name, comment: table.comment || '',
          columns: (table.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '' }))
        }
        const allTablesData = tables.map((t: TableType) => ({
          name: t.name, comment: t.comment || '',
          columns: (t.columns || []).map((c: ColumnType) => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, comment: c.comment || '' }))
        }))
        const response = await llmApi.analyzeTable(tableData, allTablesData, selectedConfigId)
        if (response.success && response.data) {
          addMessage('assistant', `🔍 表 ${table.name} 分析完成`, 'analysis', { ...response.data, tableName: table.name })
        } else {
          addSystemMessage(`❌ 分析失败: ${response.error || '未知错误'}`)
        }
      } catch (error) {
        addSystemMessage(`❌ 分析失败: ${(error as Error).message}`)
      } finally { setLoading(false) }
    } else if (tableSelectModal.mode === 'mock') {
      addMessage('user', `📝 为表 ${table.name} 生成 ${mockRowCount} 条模拟数据`)
      setLoading(true)
      try {
        const request: MockDataRequest & { configId?: string } = {
          tableName: table.name, tableComment: table.comment,
          columns: (table.columns || []).map((col: ColumnType) => ({ name: col.name, dataType: col.dataType, nullable: col.nullable, primaryKey: col.primaryKey, unique: col.unique, comment: col.comment })),
          rowCount: mockRowCount, configId: selectedConfigId
        }
        const response = await llmApi.generateMockData(request)
        if (response.success && response.data) {
          addMessage('assistant', `📝 已为 ${table.name} 生成 ${response.data.rows.length} 条数据`, 'mock', response.data)
        } else {
          addSystemMessage(`❌ 模拟数据生成失败: ${response.error || '未知错误'}`)
        }
      } catch (error) {
        addSystemMessage(`❌ 模拟数据生成失败: ${(error as Error).message}`)
      } finally { setLoading(false) }
    } else if (tableSelectModal.mode === 'optimizeTable') {
      await handleOptimizeTableConfirm(selectedTableId)
    } else if (tableSelectModal.mode === 'optimizeStructure') {
      await handleOptimizeStructureConfirm(selectedTableId)
    }
  }, [selectedTableId, tables, tableSelectModal, mockRowCount, selectedConfigId, addMessage, addSystemMessage, handleOptimizeTableConfirm, handleOptimizeStructureConfirm])

  // ====== 发送消息 ======
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    handleGenerateTables()
  }, [inputValue, handleGenerateTables])

  // ====== 应用表到画布 ======
  const handleApplyTables = useCallback((tableSuggestions: TableSuggestion[]) => {
    setPendingTables(tableSuggestions)
    setConfirmModalVisible(true)
  }, [])

  const handleConfirmApply = useCallback(() => {
    if (pendingTables.length > 0 && onApplyTables) {
      onApplyTables(pendingTables)
      message.success('已应用到画布')
    }
    setConfirmModalVisible(false)
    setPendingTables([])
  }, [pendingTables, onApplyTables])

  // ====== 写入数据库 ======
  const handleWriteToDb = useCallback(async () => {
    if (!mockDetailModal.data) return
    if (!selectedConnectionId) { message.warning('请选择数据库连接'); return }
    setWriteToDbLoading(true)
    try {
      const conn = dbConnections.find(c => c.id === selectedConnectionId)
      if (!conn) { message.error('连接不存在'); return }
      const connection = {
        databaseType: conn.databaseType, host: conn.host,
        port: conn.port, databaseName: conn.databaseName,
        username: conn.username, password: conn.password,
        sslEnabled: conn.sslEnabled || false,
      }
      const response = await llmApi.writeMockDataToDb({ connection, tableName: mockDetailModal.data!.tableName, data: mockDetailModal.data!.rows })
      if (response.success && response.data && response.data.success) {
        message.success(`成功写入 ${response.data.insertedCount} 条数据`)
        setWriteToDbModalVisible(false)
        addSystemMessage(`✅ 成功将 ${response.data.insertedCount} 条数据写入 ${conn.name}`)
      } else {
        message.error(`写入失败: ${response.data?.errors?.join(', ') || response.error || '未知错误'}`)
      }
    } catch (error) {
      message.error('写入失败: ' + (error as Error).message)
    } finally { setWriteToDbLoading(false) }
  }, [mockDetailModal.data, selectedConnectionId, dbConnections, addSystemMessage])

  // ====== 性能测试 ======
  const handleRunPerfTest = useCallback(async () => {
    if (!selectedConnectionIdForPerf) { message.warning('请选择数据库连接'); return }
    setPerfTestLoading(true)
    try {
      const conn = dbConnections.find(c => c.id === selectedConnectionIdForPerf)
      if (!conn) { message.error('连接不存在'); return }
      const connection = {
        databaseType: conn.databaseType, host: conn.host,
        port: conn.port, databaseName: conn.databaseName,
        username: conn.username, password: conn.password,
        sslEnabled: conn.sslEnabled || false,
      }
      const response = await llmApi.testDbPerformance(connection, { testWrite: true, testQuery: true, writeRowCount: 100 })
      if (response.success && response.data) {
        setPerfTestResult(response.data)
        addSystemMessage(`📊 ${conn.name} 性能测试完成 - 连接: ${response.data.connectionTest?.connectTimeMs || '?'}ms, 查询: ${response.data.queryTest?.queryTimeMs || '?'}ms, 写入: ${response.data.writeTest?.writeSpeedPerSec || '?'}条/秒`)
      } else { message.error('性能测试失败') }
    } catch (error) { message.error('性能测试失败: ' + (error as Error).message) }
    finally { setPerfTestLoading(false) }
  }, [selectedConnectionIdForPerf, dbConnections, addSystemMessage])

  // ====== 配置管理 ======
  const handleProviderChange = useCallback((value: string) => {
    const endpoint = defaultEndpoints[value] || ''
    configForm.setFieldsValue({ endpoint })
    const models = modelOptions[value] || []
    if (models.length > 0) configForm.setFieldsValue({ model: [models[0].value] })
    else configForm.setFieldsValue({ model: undefined })
  }, [configForm])

  const handleTestConnection = useCallback(async () => {
    const values = await configForm.validateFields().catch(() => null)
    if (!values) return
    setTestingConnection(true)
    try {
      const model = Array.isArray(values.model) ? values.model[0] : values.model
      const response = await llmApi.testConnection(undefined, values.apiKey, values.endpoint, model, values.provider)
      setTestResultModal(response.data || {
        success: false, error: response.error || '连接失败',
        security: { isHttps: false, isLocalhost: false, endpointSecure: false, apiKeyMasked: '', apiKeyStrength: 'none', warnings: [], score: 'unsafe', summary: '未知' },
        availability: { tested: false, responseTimeMs: 0, modelConfirmed: false, modelReported: '', capable: false, details: '无可用性数据' }
      })
    } catch (error) {
      setTestResultModal({ success: false, error: '连接测试失败: ' + (error as Error).message,
        security: { isHttps: false, isLocalhost: false, endpointSecure: false, apiKeyMasked: '', apiKeyStrength: 'none', warnings: [], score: 'unsafe', summary: '未知' },
        availability: { tested: false, responseTimeMs: 0, modelConfirmed: false, modelReported: '', capable: false, details: '无可用性数据' }
      })
    } finally { setTestingConnection(false) }
  }, [configForm])

  const handleSaveConfig = useCallback(async () => {
    if (!currentUser) { message.warning('请先登录'); return }
    const values = await configForm.validateFields().catch(() => null)
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
        const updateData: any = { ...configData }
        if (!values.apiKey) delete updateData.apiKey
        const response = await llmApi.updateConfig(editingConfigId, updateData)
        if (response.success) { message.success('配置更新成功'); setConfigModalVisible(false); configForm.resetFields(); setEditingConfigId(null); loadUserConfigs() }
        else message.error(response.error || '更新失败')
      } else {
        const response = configScope === 'team'
          ? await llmApi.createTeamConfig(selectedTeamId, configData)
          : await llmApi.createUserConfig(currentUser.id, configData)
        if (response.success) {
          message.success('配置保存成功')
          setConfigModalVisible(false)
          configForm.resetFields()
          loadUserConfigs()
        } else { message.error(response.error || '保存失败') }
      }
    } catch (error) { message.error('保存失败: ' + (error as Error).message) }
    finally { setLoading(false) }
  }, [currentUser, configForm, configScope, selectedTeamId, loadUserConfigs, editingConfigId])

  const handleDeleteConfig = useCallback(async (configId: string) => {
    try {
      await llmApi.deleteConfig(configId)
      message.success('配置已删除')
      if (selectedConfigId === configId) setSelectedConfigId('')
      loadUserConfigs()
    } catch (error) { message.error('删除失败') }
  }, [selectedConfigId, loadUserConfigs])

  // ====== 关闭 ======
  const handleClose = useCallback(() => {
    if (onClose) onClose()
  }, [onClose])

  // ====== 渲染对话消息 ======
  const renderMessage = useCallback((msg: ChatMessage) => {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'

    if (isSystem) {
      return (
        <div key={msg.id} style={{ textAlign: 'center', margin: '12px 0' }}>
          <Text type="secondary" style={{ fontSize: 12, background: '#f5f5f5', padding: '4px 12px', borderRadius: 12 }}>{msg.content}</Text>
        </div>
      )
    }

    return (
      <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', margin: '12px 0' }}>
        <div style={{ maxWidth: '85%', display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row' }}>
          {/* 头像 */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isUser ? '#1890ff' : '#f0f0f0', color: isUser ? '#fff' : '#666', flexShrink: 0, fontSize: 14
          }}>
            {isUser ? <UserOutlined /> : <RobotOutlined />}
          </div>
          {/* 内容 */}
          <div style={{
            background: isUser ? '#1890ff' : '#fff', color: isUser ? '#fff' : '#333',
            padding: '10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            border: isUser ? 'none' : '1px solid #f0f0f0', boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
          }}>
            {/* 纯文本 */}
            {msg.type === 'text' || !msg.type ? <div style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</div> : null}

            {/* 分析结果 */}
            {msg.type === 'analysis' && msg.data && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{msg.content}</div>
                <div style={{ background: isUser ? 'rgba(255,255,255,0.15)' : '#fafafa', borderRadius: 8, padding: 12, color: isUser ? '#fff' : '#333' }}>
                  {msg.data.summary && <div style={{ marginBottom: 8 }}>{msg.data.summary}</div>}
                  {(msg.data.normalizationScore !== undefined || msg.data.designScore !== undefined) && (
                    <Row gutter={8} style={{ marginBottom: 8 }}>
                      {msg.data.normalizationScore !== undefined && (
                        <Col span={12} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isUser ? '#fff' : getScoreColor(msg.data.normalizationScore) }}>{msg.data.normalizationScore}</div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>范式评分</div>
                        </Col>
                      )}
                      {msg.data.coverageScore !== undefined && (
                        <Col span={12} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isUser ? '#fff' : getScoreColor(msg.data.coverageScore) }}>{msg.data.coverageScore}</div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>覆盖度</div>
                        </Col>
                      )}
                      {msg.data.designScore !== undefined && (
                        <Col span={12} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: isUser ? '#fff' : getScoreColor(msg.data.designScore) }}>{msg.data.designScore}</div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>设计评分</div>
                        </Col>
                      )}
                    </Row>
                  )}
                  {msg.data.strengths?.length > 0 && <div style={{ marginBottom: 4 }}>✅ {msg.data.strengths.join('；')}</div>}
                  {msg.data.weaknesses?.length > 0 && <div style={{ marginBottom: 4 }}>⚠️ {msg.data.weaknesses.join('；')}</div>}
                  {msg.data.suggestions?.length > 0 && <div>💡 {msg.data.suggestions.join('；')}</div>}
                  {msg.data.columnAnalysis?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {msg.data.columnAnalysis.slice(0, 5).map((c: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                          <Tag color="blue" style={{ marginRight: 4 }}>{c.name}</Tag>
                          {c.assessment}{c.suggestion ? ` → 💡${c.suggestion}` : ''}
                        </div>
                      ))}
                      {msg.data.columnAnalysis.length > 5 && <div style={{ fontSize: 11, opacity: 0.7 }}>...还有 {msg.data.columnAnalysis.length - 5} 个字段</div>}
                    </div>
                  )}
                  {msg.data.indexSuggestions?.length > 0 && <div style={{ marginTop: 4, fontSize: 12 }}>📇 索引: {msg.data.indexSuggestions.join('、')}</div>}
                  {msg.data.relationshipSuggestions?.length > 0 && <div style={{ fontSize: 12 }}>🔗 关系: {msg.data.relationshipSuggestions.join('、')}</div>}
                </div>
                <div style={{ marginTop: 8 }}>
                  {msg.data.tableName
                    ? <Button size="small" icon={<ReloadOutlined />} onClick={() => { setSelectedTableId(tables.find((t: TableType) => t.name === msg.data.tableName)?.id || ''); setTableSelectModal({ visible: true, mode: 'analyze' }) }}>重新分析</Button>
                    : <Button size="small" icon={<ReloadOutlined />} onClick={handleAnalyzeProject} loading={loading}>重新分析</Button>
                  }
                </div>
              </div>
            )}

            {/* 表生成结果 */}
            {msg.type === 'tables' && msg.data && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{msg.content}</div>
                <div style={{ background: isUser ? 'rgba(255,255,255,0.15)' : '#fafafa', borderRadius: 8, padding: 10, color: isUser ? '#fff' : '#333' }}>
                  {(msg.data as TableSuggestion[]).map((table: TableSuggestion, idx: number) => (
                    <div key={idx} style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{table.tableName}</span>
                      {table.tableComment && <span style={{ opacity: 0.7, marginLeft: 4 }}>({table.tableComment})</span>}
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {(table.columns || []).slice(0, 4).map((col, cidx) => (
                          <Tag key={cidx} style={{ marginBottom: 2, fontSize: 10, background: isUser ? 'rgba(255,255,255,0.2)' : undefined, color: isUser ? '#fff' : undefined, border: 'none' }}>
                            {col.name}:{col.dataType}{col.primaryKey ? ' PK' : ''}
                          </Tag>
                        ))}
                        {(table.columns || []).length > 4 && <span style={{ fontSize: 10, opacity: 0.6 }}> +{(table.columns || []).length - 4}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApplyTables(msg.data)} style={{ marginTop: 8 }}>
                  应用到画布
                </Button>
              </div>
            )}

            {/* 推荐表结果 */}
            {msg.type === 'recommend' && msg.data && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{msg.content}</div>
                <div style={{ background: isUser ? 'rgba(255,255,255,0.15)' : '#f6ffed', borderRadius: 8, padding: 10, color: isUser ? '#fff' : '#333' }}>
                  {(msg.data as TableSuggestion[]).map((table: TableSuggestion, idx: number) => (
                    <div key={idx} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{table.tableName}</span>
                        {table.tableComment && <span style={{ opacity: 0.7, marginLeft: 4 }}>({table.tableComment})</span>}
                        <div style={{ fontSize: 11 }}>
                          {(table.columns || []).slice(0, 3).map((col, cidx) => (
                            <Tag key={cidx} style={{ fontSize: 10, background: isUser ? 'rgba(255,255,255,0.2)' : undefined, color: isUser ? '#fff' : undefined, border: 'none' }}>
                              {col.name}:{col.dataType}
                            </Tag>
                          ))}
                        </div>
                      </div>
                      <Button size="small" type="link" onClick={() => handleApplyTables([table])} style={{ color: isUser ? '#fff' : undefined }}>使用</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 模拟数据结果 */}
            {msg.type === 'mock' && msg.data && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{msg.content}</div>
                <div style={{ background: isUser ? 'rgba(255,255,255,0.15)' : '#fafafa', borderRadius: 8, padding: 10, color: isUser ? '#fff' : '#333' }}>
                  <div>表: {msg.data.tableName} | 数据量: {msg.data.rows?.length || 0} 条</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    {(msg.data.columns || []).slice(0, 5).map((col: any, i: number) => (
                      <Tag key={i} style={{ fontSize: 10, background: isUser ? 'rgba(255,255,255,0.2)' : undefined, color: isUser ? '#fff' : undefined, border: 'none' }}>{col.name}</Tag>
                    ))}
                  </div>
                </div>
                <Space size="small" style={{ marginTop: 8 }}>
                  <Button size="small" icon={<EyeOutlined />} onClick={() => setMockDetailModal({ visible: true, data: msg.data })}>预览</Button>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard?.writeText(msg.data.sql); message.success('SQL已复制') }}>复制SQL</Button>
                  <Button size="small" icon={<CloudUploadOutlined />} onClick={() => { setSelectedConnectionId(''); setWriteToDbModalVisible(true) }}>写入远程DB</Button>
                  <Button size="small" icon={<DashboardOutlined />} onClick={() => { setSelectedConnectionIdForPerf(''); setPerfTestResult(null); setPerfTestModalVisible(true) }}>性能测试</Button>
                </Space>
              </div>
            )}

            {/* 优化结果 */}
            {msg.type === 'optimization' && msg.data && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{msg.content}</div>
                <div style={{ background: isUser ? 'rgba(255,255,255,0.15)' : '#fff7e6', borderRadius: 8, padding: 12, color: isUser ? '#fff' : '#333' }}>
                  {msg.data.summary && <div style={{ marginBottom: 10, fontWeight: 500 }}>{msg.data.summary}</div>}

                  {/* 项目优化 */}
                  {msg.data.optimizeType === 'project' && msg.data.optimizations?.length > 0 && (
                    <div>
                      {msg.data.optimizations.map((opt: any, i: number) => (
                        <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < msg.data.optimizations.length - 1 ? '1px dashed #ffe7ba' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Tag color={opt.priority === 'high' ? 'red' : opt.priority === 'medium' ? 'orange' : 'blue'} style={{ margin: 0, fontSize: 10 }}>
                              {opt.priority === 'high' ? '高优先级' : opt.priority === 'medium' ? '中优先级' : '低优先级'}
                            </Tag>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>{opt.area}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>问题: {opt.issue}</div>
                          <div style={{ fontSize: 12, color: '#1890ff' }}>建议: {opt.suggestion}</div>
                        </div>
                      ))}
                      {msg.data.estimatedImpact && <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>预期影响: {msg.data.estimatedImpact}</div>}
                    </div>
                  )}

                  {/* 单表优化 */}
                  {msg.data.optimizeType === 'table' && (
                    <div>
                      {msg.data.overallScore && (
                        <Row gutter={12} style={{ marginBottom: 10 }}>
                          <Col span={12} style={{ textAlign: 'center', background: '#fafafa', borderRadius: 6, padding: '8px 0' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: getScoreColor(msg.data.overallScore.before) }}>{msg.data.overallScore.before}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>优化前评分</div>
                          </Col>
                          <Col span={12} style={{ textAlign: 'center', background: '#f6ffed', borderRadius: 6, padding: '8px 0' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{msg.data.overallScore.after}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>优化后评分</div>
                          </Col>
                        </Row>
                      )}
                      {msg.data.fieldOptimizations?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>字段优化建议</div>
                          {msg.data.fieldOptimizations.map((f: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 4, paddingLeft: 8, borderLeft: '3px solid #faad14' }}>
                              <Tag color="blue" style={{ marginRight: 4, fontSize: 10 }}>{f.field}</Tag>
                              <span>{f.currentIssue}</span> → <span style={{ color: '#52c41a' }}>{f.suggestedChange}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.data.indexSuggestions?.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>索引建议</div>
                          {msg.data.indexSuggestions.map((idx: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>📇 {idx.columns} ({idx.type}): {idx.reason}</div>
                          ))}
                        </div>
                      )}
                      {msg.data.constraintChanges?.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>约束变更</div>
                          {msg.data.constraintChanges.map((c: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>🔒 {c.type}: {c.detail} - {c.reason}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 表结构优化 */}
                  {msg.data.optimizeType === 'structure' && (
                    <div>
                      {msg.data.columnChanges?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>字段类型变更</div>
                          {msg.data.columnChanges.map((cc: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 4, background: isUser ? 'rgba(255,255,255,0.1)' : '#fafafa', borderRadius: 4, padding: '4px 8px' }}>
                              <Tag style={{ marginRight: 4, fontSize: 10 }}>{cc.columnName}</Tag>
                              <span style={{ color: '#ff4d4f' }}>{cc.currentType}{cc.currentLength ? `(${cc.currentLength})` : ''}</span>
                              <span style={{ margin: '0 4px' }}>→</span>
                              <span style={{ color: '#52c41a' }}>{cc.suggestedType}{cc.suggestedLength ? `(${cc.suggestedLength})` : ''}</span>
                              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{cc.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.data.namingIssues?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>命名规范问题</div>
                          {msg.data.namingIssues.map((n: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>
                              <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>{n.currentName}</span>
                              <span style={{ margin: '0 4px' }}>→</span>
                              <span style={{ color: '#52c41a' }}>{n.suggestedName}</span>
                              <span style={{ color: '#999', marginLeft: 4 }}>({n.reason})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.data.missingConstraints?.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>缺失约束</div>
                          {msg.data.missingConstraints.map((mc: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>⚠️ {mc.column}: 建议{mc.constraint} - {mc.reason}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 关系优化 */}
                  {msg.data.optimizeType === 'relationships' && (
                    <div>
                      {msg.data.relationshipOptimizations?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>关系优化建议</div>
                          {msg.data.relationshipOptimizations.map((r: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 6, background: isUser ? 'rgba(255,255,255,0.1)' : '#fafafa', borderRadius: 4, padding: '6px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Tag color={r.actionType === 'add' ? 'green' : r.actionType === 'remove' ? 'red' : 'blue'} style={{ margin: 0, fontSize: 10 }}>
                                  {r.actionType === 'add' ? '新增' : r.actionType === 'remove' ? '移除' : '修改'}
                                </Tag>
                                <span style={{ fontWeight: 500 }}>{r.fromTable}.{r.fromColumn}</span>
                                <span>→</span>
                                <span style={{ fontWeight: 500 }}>{r.toTable}.{r.toColumn}</span>
                              </div>
                              <div style={{ fontSize: 10, color: '#666' }}>问题: {r.currentIssue}</div>
                              <div style={{ fontSize: 10, color: '#1890ff' }}>建议: {r.suggestedAction}</div>
                              <div style={{ fontSize: 10, color: '#999' }}>{r.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.data.cascadeRecommendations?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>级联推荐</div>
                          {msg.data.cascadeRecommendations.map((cr: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>🔗 {cr.recommendation}: {cr.recommendation}</div>
                          ))}
                        </div>
                      )}
                      {msg.data.redundancyWarnings?.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>冗余警告</div>
                          {msg.data.redundancyWarnings.map((rw: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>⚠️ {rw.description} → {rw.suggestion}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {msg.data.optimizeType === 'project' && (
                    <>
                      <Popconfirm title={`确认将 ${msg.data.optimizations?.length || 0} 条优化建议全部应用到画布？`} onConfirm={() => handleApplyProjectOptimization(msg.data)} okText="全部应用" cancelText="取消">
                        <Button size="small" icon={<ThunderboltOutlined />} type="primary">应用所有优化</Button>
                      </Popconfirm>
                      <Button size="small" icon={<ReloadOutlined />} onClick={handleOptimizeProject} loading={loading}>重新优化</Button>
                    </>
                  )}
                  {msg.data.optimizeType === 'table' && msg.data.tableName && (
                    <>
                      <Popconfirm title="确认应用所有优化到画布？" onConfirm={() => handleApplyTableOptimization(msg.data)} okText="应用" cancelText="取消">
                        <Button size="small" icon={<CheckCircleOutlined />} type="primary">应用优化</Button>
                      </Popconfirm>
                      <Button size="small" icon={<ReloadOutlined />} onClick={() => { setSelectedTableId(tables.find((t: TableType) => t.name === msg.data.tableName)?.id || ''); setTableSelectModal({ visible: true, mode: 'optimizeTable' }) }}>重新优化</Button>
                    </>
                  )}
                  {msg.data.optimizeType === 'structure' && msg.data.tableName && (
                    <>
                      <Popconfirm title="确认应用所有结构变更到画布？" onConfirm={() => handleApplyStructureOptimization(msg.data)} okText="应用" cancelText="取消">
                        <Button size="small" icon={<CheckCircleOutlined />} type="primary">应用优化</Button>
                      </Popconfirm>
                      <Button size="small" icon={<ReloadOutlined />} onClick={() => { setSelectedTableId(tables.find((t: TableType) => t.name === msg.data.tableName)?.id || ''); setTableSelectModal({ visible: true, mode: 'optimizeStructure' }) }}>重新优化</Button>
                    </>
                  )}
                  {msg.data.optimizeType === 'relationships' && (
                    <>
                      <Popconfirm title="确认应用所有关系到画布？" onConfirm={() => handleApplyRelationshipsOptimization(msg.data)} okText="应用" cancelText="取消">
                        <Button size="small" icon={<CheckCircleOutlined />} type="primary">应用优化</Button>
                      </Popconfirm>
                      <Button size="small" icon={<ReloadOutlined />} onClick={handleOptimizeRelationships} loading={loading}>重新优化</Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 时间戳 */}
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
              {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    )
  }, [handleApplyTables, writeToDbForm, dbConnectionForm, handleOptimizeProject, handleOptimizeRelationships, loading])

  // ====== 快捷操作按钮 ======
  const quickActions = useMemo(() => [
    { key: 'analyze', icon: <BarChartOutlined />, label: '分析项目', desc: '整体评估', onClick: handleAnalyzeProject, color: '#1890ff' },
    { key: 'tableAnalyze', icon: <FileSearchOutlined />, label: '表分析', desc: '单表深度', onClick: handleAnalyzeTable, color: '#722ed1' },
    { key: 'optimizeProject', icon: <ToolOutlined />, label: '优化项目', desc: '全局优化', onClick: handleOptimizeProject, color: '#f5222d' },
    { key: 'optimizeTable', icon: <EditOutlined />, label: '优化表', desc: '单表优化', onClick: handleOptimizeTable, color: '#fa541c' },
    { key: 'optimizeStructure', icon: <ProfileOutlined />, label: '优化结构', desc: '字段类型', onClick: handleOptimizeTableStructure, color: '#faad14' },
    { key: 'optimizeRelationships', icon: <NodeIndexOutlined />, label: '优化关系', desc: '外键关联', onClick: handleOptimizeRelationships, color: '#2f54eb' },
    { key: 'generate', icon: <ThunderboltOutlined />, label: '生成表', desc: '描述需求', onClick: () => { setInputValue(''); message.info('在底部输入框描述你需要的表结构') }, color: '#52c41a' },
    { key: 'mock', icon: <DatabaseOutlined />, label: '模拟数据', desc: '生成测试', onClick: handleMockData, color: '#fa8c16' },
    { key: 'recommend', icon: <BulbOutlined />, label: '推荐新表', desc: '智能推荐', onClick: handleRecommendTables, color: '#eb2f96' },
    { key: 'perf', icon: <DashboardOutlined />, label: '性能测试', desc: 'DB速度', onClick: () => { setSelectedConnectionIdForPerf(''); setPerfTestResult(null); setPerfTestModalVisible(true) }, color: '#13c2c2' },
  ], [handleAnalyzeProject, handleAnalyzeTable, handleOptimizeProject, handleOptimizeTable, handleOptimizeTableStructure, handleOptimizeRelationships, handleMockData, handleRecommendTables])

  // ====== 渲染 ======
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* 顶栏 */}
      <div style={{
        padding: '12px 20px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
            <RobotOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>AI 助手</div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {userConfigs.length > 0
                ? (selectedConfigId ? `使用 ${userConfigs.find(c => c.id === selectedConfigId)?.name || '模型'}` : '未选择模型')
                : '未配置模型'}
            </div>
          </div>
        </div>
        <Space size="small">
          <Select
            value={selectedConfigId || undefined}
            onChange={setSelectedConfigId}
            placeholder="选择模型"
            style={{ width: 150 }}
            size="small"
            options={userConfigs.map(c => ({ value: c.id, label: `${c.name} (${c.model})` }))}
            notFoundContent={<span style={{ fontSize: 12 }}>暂无配置</span>}
          />
          {userConfigs.length === 0 && (
            <Tooltip title="添加模型配置">
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingConfigId(null)
                configForm.resetFields()
                configForm.setFieldsValue({ provider: 'ollama', endpoint: defaultEndpoints.ollama, model: ['llama3'], isDefault: false })
                setConfigModalVisible(true)
              }} />
            </Tooltip>
          )}
          <Tooltip title="清空对话">
            <Button size="small" icon={<DeleteOutlined />} onClick={() => { setChatMessages([]); addSystemMessage('💬 对话已清空') }} />
          </Tooltip>
          <Tooltip title="模型配置管理">
            <Button size="small" icon={<SettingOutlined />} onClick={() => {
              setEditingConfigId(null)
              configForm.resetFields()
              configForm.setFieldsValue({ provider: 'ollama', endpoint: defaultEndpoints.ollama, model: ['llama3'], isDefault: false })
              setConfigModalVisible(true)
            }} />
          </Tooltip>
          {onClose && <Button size="small" type="text" icon={<XOutlined />} onClick={handleClose} />}
        </Space>
      </div>

      {/* 快捷操作 */}
      <div style={{ padding: '12px 16px 8px', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {quickActions.map(action => (
            <div
              key={action.key}
              onClick={action.onClick}
              style={{
                minWidth: 80, cursor: 'pointer', borderRadius: 10, border: '1px solid #f0f0f0',
                padding: '10px 10px', textAlign: 'center', flexShrink: 0,
                transition: 'all 0.2s', background: '#fff'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.background = `${action.color}08` }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.background = '#fff' }}
            >
              <div style={{ fontSize: 20, color: action.color, marginBottom: 3 }}>{action.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 对话区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {chatMessages.map(msg => renderMessage(msg))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              <RobotOutlined />
            </div>
            <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', border: '1px solid #f0f0f0' }}>
              <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>思考中...</Text>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 底部输入 */}
      <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="描述你需要的表结构，例如：用户表、订单表、商品表..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1, borderRadius: 20, resize: 'none' }}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={loading}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={!inputValue.trim() || loading}
            style={{ flexShrink: 0, width: 40, height: 40, background: inputValue.trim() ? '#1890ff' : '#d9d9d9' }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 6, textAlign: 'center' }}>
          Enter 发送 · Shift+Enter 换行 · 输入描述即可生成表结构
        </div>
      </div>

      {/* ====== 配置管理弹窗 ====== */}
      <Modal title="模型配置管理" open={configModalVisible} onCancel={() => { setConfigModalVisible(false); setEditingConfigId(null) }} footer={null} width={700} destroyOnHidden>
        {userConfigs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>已有配置</Text>
            {userConfigs.map(config => (
              <div key={config.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: selectedConfigId === config.id ? '#e6f7ff' : '#fafafa', borderRadius: 8, marginBottom: 8, border: selectedConfigId === config.id ? '1px solid #91d5ff' : '1px solid #f0f0f0' }}>
                <div>
                  <Space>
                    <Text strong>{config.name}</Text>
                    {config.isDefault && <Tag color="blue">默认</Tag>}
                    <Tag>{config.provider}</Tag>
                    <Tag color="geekblue">{config.model}</Tag>
                  </Space>
                </div>
                <Space size="small">
                  <Button size="small" type={selectedConfigId === config.id ? 'primary' : 'default'} onClick={() => { setSelectedConfigId(config.id); message.success(`已切换到 ${config.name}`) }}>
                    {selectedConfigId === config.id ? '使用中' : '使用'}
                  </Button>
                  <Button size="small" icon={<SettingOutlined />} onClick={() => {
                    setEditingConfigId(config.id)
                    configForm.resetFields()
                    configForm.setFieldsValue({ name: config.name, provider: config.provider, model: [config.model], endpoint: config.endpoint, apiKey: '', isDefault: config.isDefault })
                  }}>编辑</Button>
                  <Popconfirm title="确定删除？" onConfirm={() => handleDeleteConfig(config.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            ))}
            <Divider style={{ margin: '12px 0' }} />
          </div>
        )}
        <Text strong style={{ marginBottom: 12, display: 'block' }}>{editingConfigId ? '编辑配置' : '新建配置'}</Text>
        <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
          {!editingConfigId && (
            <Form.Item label="配置范围">
              <Radio.Group value={configScope} onChange={(e) => setConfigScope(e.target.value)}>
                <Radio value="user"><UserOutlined /> 个人</Radio>
                <Radio value="team"><TeamOutlined /> 团队</Radio>
              </Radio.Group>
            </Form.Item>
          )}
          {!editingConfigId && configScope === 'team' && (
            <Form.Item label="选择团队">
              <Select value={selectedTeamId || undefined} onChange={setSelectedTeamId} placeholder="选择团队" style={{ width: '100%' }}
                options={teams.map(t => ({ value: t.id, label: t.name }))} />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="例如：我的 DeepSeek" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="provider" label="服务提供商" rules={[{ required: true }]}>
                <Select options={providerOptions} onChange={handleProviderChange} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="model" label="模型" rules={[{ required: true }]}>
                <Select options={modelOptions[selectedProvider] || []} mode="tags" maxTagCount={1} placeholder="选择或输入" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endpoint" label="API端点" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="https://api.openai.com/v1" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="apiKey" label={editingConfigId ? 'API密钥（留空则不修改）' : 'API密钥'} rules={editingConfigId ? [] : [{ required: selectedProvider !== 'ollama', message: '请输入' }]}>
            <Input.Password placeholder={selectedProvider === 'ollama' ? '本地无需密钥' : 'sk-...'} />
          </Form.Item>
          <Form.Item name="isDefault" label="设为默认" valuePropName="checked"><Switch /></Form.Item>
          <Space>
            <Button onClick={handleTestConnection} loading={testingConnection} icon={<CheckCircleOutlined />}>测试连接</Button>
            <Button type="primary" htmlType="submit" loading={loading}>{editingConfigId ? '更新配置' : '保存配置'}</Button>
            {editingConfigId && <Button onClick={() => { setEditingConfigId(null); configForm.resetFields(); configForm.setFieldsValue({ provider: 'ollama', endpoint: defaultEndpoints.ollama, model: ['llama3'], isDefault: false }) }}>取消编辑</Button>}
          </Space>
        </Form>
      </Modal>

      {/* ====== 表选择弹窗 ====== */}
      <Modal
        title={tableSelectModal.mode === 'analyze' ? '选择要分析的表' : '选择要模拟数据的表'}
        open={tableSelectModal.visible}
        onOk={handleTableSelectConfirm}
        onCancel={() => setTableSelectModal({ visible: false, mode: '' })}
        okText="确认"
        width={500}
      >
        <Select
          value={selectedTableId || undefined}
          onChange={setSelectedTableId}
          placeholder="选择表"
          style={{ width: '100%', marginBottom: 12 }}
          options={(tables || []).map((t: TableType) => ({ value: t.id, label: `${t.name}${t.comment ? ` (${t.comment})` : ''}` }))}
        />
        {tableSelectModal.mode === 'mock' && (
          <div>
            <Text>生成数量：</Text>
            <Select value={mockRowCount} onChange={setMockRowCount} style={{ width: 120 }}
              options={rowCountOptions.map(n => ({ value: n, label: `${n} 条` }))} />
          </div>
        )}
      </Modal>

      {/* ====== 确认应用弹窗 ====== */}
      <Modal title="确认应用到画布" open={confirmModalVisible} onOk={handleConfirmApply}
        onCancel={() => { setConfirmModalVisible(false); setPendingTables([]) }}
        okText="确认应用" width={500}
      >
        <Alert message={`将创建 ${pendingTables.length} 个表：${pendingTables.map(t => t.tableName).join(', ')}`} type="info" showIcon />
      </Modal>

      {/* ====== 模拟数据详情弹窗 ====== */}
      <Modal title={`模拟数据 - ${mockDetailModal.data?.tableName || ''}`} open={mockDetailModal.visible}
        onCancel={() => setMockDetailModal({ visible: false, data: null })} footer={null} width={800} destroyOnHidden
      >
        {mockDetailModal.data && (
          <div>
            <Tabs items={[
              {
                key: 'preview', label: '数据预览', children: (
                  <Table size="small"
                    rowKey={(record: any) => record._key || record.id || JSON.stringify(record)}
                    dataSource={mockDetailModal.data.rows.slice(0, 20)}
                    pagination={{ pageSize: 10, total: Math.min(mockDetailModal.data.rows.length, 20) }}
                    columns={(mockDetailModal.data.columns || []).map((col: any) => ({
                      title: col.name, dataIndex: col.name, key: col.name, ellipsis: true,
                      render: (v: any) => v === null || v === undefined ? <Text type="secondary">NULL</Text> : String(v)
                    }))}
                    scroll={{ x: 800 }} />
                )
              },
              {
                key: 'sql', label: 'SQL语句', children: (
                  <div>
                    <TextArea rows={12} readOnly value={mockDetailModal.data.sql} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <Button type="primary" icon={<CopyOutlined />} style={{ marginTop: 8 }}
                      onClick={() => { navigator.clipboard?.writeText(mockDetailModal.data!.sql); message.success('已复制') }}>复制SQL</Button>
                  </div>
                )
              }
            ]} />
          </div>
        )}
      </Modal>

      {/* ====== 写入远程数据库弹窗 ====== */}
      <Modal title="写入远程数据库" open={writeToDbModalVisible} onOk={handleWriteToDb}
        onCancel={() => setWriteToDbModalVisible(false)} okText="确认写入" width={500} confirmLoading={writeToDbLoading}
      >
        <Alert message={`将数据写入表 ${mockDetailModal.data?.tableName || ''}`} type="info" showIcon style={{ marginBottom: 12 }} />
        {dbConnections.length > 0 ? (
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>选择数据库连接</Text>
            <Select value={selectedConnectionId || undefined} onChange={setSelectedConnectionId}
              placeholder="选择已保存的数据库连接" style={{ width: '100%' }}
              options={dbConnections.map(c => ({
                value: c.id,
                label: <Space><Tag color="blue">{c.databaseType}</Tag>{c.name}<Text type="secondary">{c.host}:{c.port}/{c.databaseName}</Text></Space>
              }))}
            />
            {selectedConnectionId && (() => {
              const conn = dbConnections.find(c => c.id === selectedConnectionId)
              return conn ? (
                <Card size="small" style={{ marginTop: 12, background: '#fafafa' }}>
                  <Row gutter={8}>
                    <Col span={12}><Text type="secondary">主机：</Text>{conn.host}:{conn.port}</Col>
                    <Col span={12}><Text type="secondary">数据库：</Text>{conn.databaseName}</Col>
                  </Row>
                </Card>
              ) : null
            })()}
          </div>
        ) : (
          <Alert message="暂无数据库连接" description="请先在「设置 > 数据库连接」中添加连接" type="warning" showIcon />
        )}
      </Modal>

      {/* ====== 性能测试弹窗 ====== */}
      <Modal title="数据库性能测试" open={perfTestModalVisible} onCancel={() => setPerfTestModalVisible(false)} footer={null} width={550}>
        {dbConnections.length > 0 ? (
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>选择数据库连接</Text>
            <Select value={selectedConnectionIdForPerf || undefined} onChange={setSelectedConnectionIdForPerf}
              placeholder="选择已保存的数据库连接" style={{ width: '100%', marginBottom: 12 }}
              options={dbConnections.map(c => ({
                value: c.id,
                label: <Space><Tag color="blue">{c.databaseType}</Tag>{c.name}<Text type="secondary">{c.host}:{c.port}/{c.databaseName}</Text></Space>
              }))}
            />
            <Button type="primary" loading={perfTestLoading} onClick={handleRunPerfTest} icon={<FieldTimeOutlined />} block
              disabled={!selectedConnectionIdForPerf}>运行完整性能测试</Button>
          </div>
        ) : (
          <Alert message="暂无数据库连接" description="请先在「设置 > 数据库连接」中添加连接" type="warning" showIcon />
        )}
        {perfTestResult && (
          <Card size="small" title="测试结果" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="连接速度" value={perfTestResult.connectionTest?.connectTimeMs || 0} suffix="ms"
                  valueStyle={{ color: (perfTestResult.connectionTest?.connectTimeMs || 9999) < 500 ? '#3f8600' : '#faad14' }} prefix={<ApiOutlined />} />
              </Col>
              {perfTestResult.queryTest && (
                <Col span={8}>
                  <Statistic title="查询速度" value={perfTestResult.queryTest.queryTimeMs} suffix="ms"
                    valueStyle={{ color: perfTestResult.queryTest.queryTimeMs < 500 ? '#3f8600' : '#faad14' }} prefix={<FieldTimeOutlined />} />
                </Col>
              )}
              {perfTestResult.writeTest && (
                <Col span={8}>
                  <Statistic title="写入速度" value={perfTestResult.writeTest.writeSpeedPerSec} suffix="条/秒"
                    valueStyle={{ color: perfTestResult.writeTest.writeSpeedPerSec > 500 ? '#3f8600' : '#faad14' }} prefix={<DashboardOutlined />} />
                </Col>
              )}
            </Row>
            {perfTestResult.connectionTest?.error && <Alert message={`连接错误: ${perfTestResult.connectionTest.error}`} type="error" showIcon style={{ marginTop: 8 }} />}
          </Card>
        )}
      </Modal>

      {/* ====== 连接测试报告弹窗 ====== */}
      <Modal title="连接测试报告" open={!!testResultModal} onCancel={() => setTestResultModal(null)}
        footer={<Button onClick={() => setTestResultModal(null)}>关闭</Button>} width={600} destroyOnHidden
      >
        {testResultModal && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert type={testResultModal.success ? 'success' : 'error'}
              message={testResultModal.success ? '连接测试通过' : '连接测试失败'}
              description={testResultModal.success ? `模型: ${testResultModal.model || '未知'}` : testResultModal.error || '未知错误'} showIcon />
            {testResultModal.security && (
              <Card size="small" title={<Space><SafetyCertificateOutlined /> 安全性评估 <Tag color={testResultModal.security.score === 'safe' ? 'success' : testResultModal.security.score === 'warning' ? 'warning' : 'error'}>{testResultModal.security.score === 'safe' ? '安全' : testResultModal.security.score === 'warning' ? '注意' : '危险'}</Tag></Space>}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary">传输加密：</Text>
                  <Tag color={testResultModal.security.isHttps ? 'success' : 'error'}>{testResultModal.security.isHttps ? 'HTTPS' : 'HTTP'}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">密钥强度：</Text>
                  <Tag color={testResultModal.security.apiKeyStrength === 'strong' ? 'success' : testResultModal.security.apiKeyStrength === 'good' ? 'processing' : 'warning'}>
                    {testResultModal.security.apiKeyStrength === 'strong' ? '强' : testResultModal.security.apiKeyStrength === 'good' ? '良好' : '弱'}
                  </Tag>
                </div>
              </Card>
            )}
            {testResultModal.availability && testResultModal.availability.tested && (
              <Card size="small" title={<Space><ThunderboltOutlined /> 可用性评估 <Tag color={testResultModal.availability.capable ? 'success' : 'error'}>{testResultModal.availability.capable ? '可用' : '不可用'}</Tag></Space>}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">响应时间：</Text>
                  <Tag color={testResultModal.availability.responseTimeMs < 1000 ? 'success' : 'warning'}>{testResultModal.availability.responseTimeMs}ms</Tag>
                </div>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default LLMTab
