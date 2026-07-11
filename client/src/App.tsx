import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Layout, Typography, Badge, Tooltip, Button, message, Avatar, Dropdown, Tabs } from 'antd'
import { MessageOutlined, DatabaseOutlined, CloseOutlined, CloudOutlined, CloudSyncOutlined, CloudUploadOutlined, SyncOutlined, WifiOutlined, DisconnectOutlined, SettingOutlined, LeftOutlined, RightOutlined, TeamOutlined, CodeOutlined, UserOutlined, LogoutOutlined, LoginOutlined, BranchesOutlined, GithubOutlined, RobotOutlined } from '@ant-design/icons'
import { useAppStore } from './stores/appStore'
import { useTheme } from './theme/useTheme'
import ProjectList from './components/ProjectList'
import Canvas from './components/Canvas'
import TableEditor from './components/TableEditor'
import ModeSwitch from './components/ModeSwitch'
import { SettingsTab } from './components/SettingsTab'
import { ProjectMemberTab } from './components/ProjectMemberTab'
import { CreateProjectTab } from './components/CreateProjectTab'
import { ImportExportTab } from './components/ImportExportTab'
import { TeamManagementTab } from './components/TeamManagementTab'
import { LLMTab } from './components/LLMTab'
import { EditProjectTab } from './components/EditProjectTab'
import { VersionManagementTab } from './components/VersionManagementTab'
import { CommentTab } from './components/CommentTab'
import { TypeConvertTab } from './components/TypeConvertTab'
import { ConnectionConfigModal } from './components/ConnectionConfigModal'
import { DatabaseImportModal } from './components/DatabaseImportModal'
import { DatabaseSyncModal } from './components/DatabaseSyncModal'
import { SqliteImportTab } from './components/SqliteImportTab'
import BranchManagerTab from './components/BranchManagerTab'
import GitConfigTab from './components/GitConfigTab'
import { AuthModal } from './components/AuthModal'
import LoginPage from './components/LoginPage'
import { SQLEditorTab } from './components/SQLEditorTab'
import NetworkStatus from './components/NetworkStatus'
import SyncQueueModal from './components/SyncQueueModal'
import { CollabProvider } from './providers/CollabProvider'
import { CollabUsers } from './components/CollabUsers'
import { TableInfo, TableSuggestion } from './services/api'
import localStorageService from './services/localStorageService'

const { Header, Content } = Layout
const { Title } = Typography

const LAYOUT = {
  LEFT_INITIAL_WIDTH: 350,
  LEFT_MIN_WIDTH: 250,
  LEFT_MAX_WIDTH: 500,
  RIGHT_INITIAL_WIDTH: 900,
  RIGHT_MIN_WIDTH: 400,
  RIGHT_MAX_WIDTH: 1200,
  COLLAPSED_WIDTH: 36,
  DRAG_HANDLE_WIDTH: 4,
  HEADER_HEIGHT: 48,
  TABLE_EDITOR_HEADER_HEIGHT: 44,
  CENTER_MIN_WIDTH: 300,
}

const ZOOM = {
  MIN: 0.5,
  MAX: 2,
  STEP: 0.05,
} as const

const TABLE_GRID = {
  START_X: 100,
  START_Y: 100,
  X_STEP: 250,
  Y_STEP: 200,
  COLUMNS_PER_ROW: 3,
} as const

const TIME = {
  JUST_NOW_MS: 60000,
  HOUR_MS: 3600000,
  STATUS_REFRESH_INTERVAL: 5000,
  TABLE_CREATE_DELAY_MS: 50,
  LLM_TABLE_CREATE_DELAY_MS: 100,
} as const

const DragHandle = React.memo(({ 
  isDragging, 
  onMouseDown, 
  tooltipTitle, 
  onClick 
}: { 
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  tooltipTitle: string
  onClick: () => void
}) => (
  <div style={{
    width: LAYOUT.DRAG_HANDLE_WIDTH,
    background: isDragging ? 'var(--theme-primary)' : 'var(--theme-border)',
    cursor: 'col-resize',
    flexShrink: 0,
    transition: 'background 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
    onMouseDown={onMouseDown}
  >
    <Tooltip title={tooltipTitle}>
      <Button 
        type="text" 
        size="small"
        icon={<LeftOutlined style={{ color: 'var(--theme-text-secondary)', fontSize: 12 }} />} 
        onClick={onClick}
        style={{ 
          padding: '4px 2px', 
          position: 'absolute',
          zIndex: 1
        }}
      />
    </Tooltip>
  </div>
))
DragHandle.displayName = 'DragHandle'

const TabContentRenderer = React.memo(({ 
  activeTab, 
  onOpenTypeConvert, 
  onOpenLLM, 
  setShowConnections,
  handleApplyLLMTables,
  currentProject,
  selectProject 
}: { 
  activeTab: any
  onOpenTypeConvert: () => void
  onOpenLLM: () => void
  setShowConnections: (v: boolean) => void
  handleApplyLLMTables: (tables: TableSuggestion[]) => Promise<void>
  currentProject: any
  selectProject: (id: string) => Promise<any>
}) => {
  if (!activeTab) return <Canvas />
  
  switch (activeTab.type) {
    case 'settings':
      return (
        <SettingsTab
          onOpenTypeConvert={onOpenTypeConvert}
          onOpenLLM={onOpenLLM}
          onOpenConnections={() => setShowConnections(true)}
        />
      )
    case 'members':
      return (
        <ProjectMemberTab
          projectId={activeTab.projectId || ''}
          projectName={activeTab.title.replace(' - 成员管理', '')}
        />
      )
    case 'createProject':
      return <CreateProjectTab />
    case 'importExport':
      return <ImportExportTab />
    case 'teamManagement':
      return <TeamManagementTab />
    case 'editProject':
      return (
        <EditProjectTab
          projectId={activeTab.projectId || ''}
        />
      )
    case 'versionManagement':
      return (
        <VersionManagementTab
          projectId={activeTab.projectId || ''}
          projectName={activeTab.title.replace('版本 - ', '')}
        />
      )
    case 'comments':
      return <CommentTab />
    case 'sqliteImport':
      return <SqliteImportTab />
    case 'branchManagement':
      return (
        <BranchManagerTab
          projectId={activeTab.projectId || ''}
          onBranchChange={() => {
            if (currentProject?.id) {
              selectProject(currentProject.id)
            }
          }}
        />
      )
    case 'gitConfig':
      return (
        <GitConfigTab
          projectId={activeTab.projectId || ''}
        />
      )
    case 'typeConvert':
      return <TypeConvertTab />
    case 'sqlEditor':
      return <SQLEditorTab />
    default:
      return <Canvas />
  }
})
TabContentRenderer.displayName = 'TabContentRenderer'

function AppContent() {
  const { theme, themeOptions, setTheme, fontConfig, colors } = useTheme()
  const { currentProject, projects, loadProjects, selectedTableId, selectedTableIds, tables, selectTable, undo, redo, canUndo, canRedo, isOnline, isSyncing, lastSaved, loadSettings, loadShortcuts, loadFontConfig, createTable, createColumn, createIndex, createRelationship, saveToLocal, deleteTable, setCanvasZoom, canvasZoom, copyTable, pasteTable, selectAllTables, shortcuts, loadUpdateLogs, addUpdateLog, updateLogs, setOnline, refreshSyncQueueCount, syncQueueCount, currentUser, authToken, authLoading, checkAuth, logout, openTabs, activeTabId, openProjectTab, closeTab, setActiveTab, openSettingsTab, openMemberTab, openCreateProjectTab, openImportExportTab, openTeamManagementTab, openLLMTab, openEditProjectTab, openVersionManagementTab, openCommentTab, openSqliteImportTab, openBranchManagementTab, openGitConfigTab, selectProject, openTypeConvertTab, openSQLEditorTab } = useAppStore()

  // 网络状态监听
  React.useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  // 定期刷新同步队列计数
  React.useEffect(() => {
    refreshSyncQueueCount()
    const timer = setInterval(refreshSyncQueueCount, TIME.STATUS_REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [refreshSyncQueueCount])
  
  const [leftWidth, setLeftWidth] = useState(LAYOUT.LEFT_INITIAL_WIDTH)
  const [rightWidth, setRightWidth] = useState(LAYOUT.RIGHT_INITIAL_WIDTH)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const [showConnections, setShowConnections] = useState(false)
  const [showDatabaseImport, setShowDatabaseImport] = useState(false)
  const [showDatabaseSync, setShowDatabaseSync] = useState(false)
  const [showSyncQueue, setShowSyncQueue] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startLeftWidthRef = useRef(0)
  const startRightWidthRef = useRef(0)
  const [leftLastWidth, setLeftLastWidth] = useState(LAYOUT.LEFT_INITIAL_WIDTH)
  const [rightLastWidth, setRightLastWidth] = useState(LAYOUT.RIGHT_INITIAL_WIDTH)
  
  // 使用 ref 跟踪最新的 leftCollapsed 状态，避免闭包陷阱
  const leftCollapsedRef = useRef(leftCollapsed)
  useEffect(() => {
    leftCollapsedRef.current = leftCollapsed
  }, [leftCollapsed])

  useEffect(() => {
    const getCurrentZoom = () => {
      return useAppStore.getState().canvasZoom || 1
    }

    const zoomIn = () => {
      const currentZoom = getCurrentZoom()
      const newZoom = Math.min(currentZoom + ZOOM.STEP, ZOOM.MAX)
      setCanvasZoom(Math.round(newZoom * 100) / 100)
    }

    const zoomOut = () => {
      const currentZoom = getCurrentZoom()
      const newZoom = Math.max(currentZoom - ZOOM.STEP, ZOOM.MIN)
      setCanvasZoom(Math.round(newZoom * 100) / 100)
    }

    const matchesShortcut = (e: KeyboardEvent, shortcutKeys: string[] | undefined) => {
    if (!shortcutKeys || shortcutKeys.length === 0) return false
    const key = e.key.toLowerCase()
    const hasCtrl = e.ctrlKey || e.metaKey
    const hasShift = e.shiftKey
    const hasAlt = e.altKey

    const ctrlRequired = shortcutKeys.includes('ctrl')
    const shiftRequired = shortcutKeys.includes('shift')
    const altRequired = shortcutKeys.includes('alt')
    const keyRequired = shortcutKeys.find(k => !['ctrl', 'shift', 'alt'].includes(k))

      return (
        hasCtrl === ctrlRequired &&
        hasShift === shiftRequired &&
        hasAlt === altRequired &&
        (keyRequired ? key === keyRequired : true)
      )
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (matchesShortcut(e, shortcuts.undo)) {
        e.preventDefault()
        if (canUndo()) {
          undo()
        }
      } else if (matchesShortcut(e, shortcuts.redo) || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
      } else if (matchesShortcut(e, shortcuts.save)) {
        e.preventDefault()
        if (!isInput) {
          saveToLocal()
        }
      } else if (matchesShortcut(e, shortcuts.newTable)) {
        e.preventDefault()
        if (!isInput && currentProject) {
          createTable(currentProject.id, {
            name: '新表',
            positionX: 100,
            positionY: 100
          })
        }
      } else if (matchesShortcut(e, shortcuts.resetZoom)) {
        e.preventDefault()
        if (!isInput) {
          setCanvasZoom(1)
        }
      } else if (matchesShortcut(e, shortcuts.zoomIn) || ((e.key === '+' || e.key === '=' || e.code === 'Equal') && e.ctrlKey && !e.altKey)) {
        e.preventDefault()
        if (!isInput) {
          zoomIn()
        }
      } else if (matchesShortcut(e, shortcuts.zoomOut) || ((e.key === '-' || e.code === 'Minus') && e.ctrlKey && !e.altKey)) {
        e.preventDefault()
        if (!isInput) {
          zoomOut()
        }
      } else if (matchesShortcut(e, shortcuts.settings)) {
        e.preventDefault()
        if (!isInput) {
          openSettingsTab()
        }
      } else if (matchesShortcut(e, shortcuts.importExport)) {
        e.preventDefault()
        if (!isInput) {
          openImportExportTab()
        }
      } else if (matchesShortcut(e, shortcuts.selectAll)) {
        e.preventDefault()
        if (!isInput) {
          selectAllTables()
        }
      } else if (matchesShortcut(e, shortcuts.copy)) {
        if (!isInput) {
          e.preventDefault()
          if (selectedTableId) {
            copyTable(selectedTableId)
            message.success('已复制表')
          }
        }
      } else if (matchesShortcut(e, shortcuts.paste)) {
        if (!isInput) {
          e.preventDefault()
          if (currentProject) {
            pasteTable()
          }
        }
      } else if (matchesShortcut(e, shortcuts.find)) {
        e.preventDefault()
        if (!isInput) {
          message.info('查找功能')
        }
      } else if (matchesShortcut(e, shortcuts.toggleLeftSidebar)) {
        e.preventDefault()
        toggleLeftCollapse()
      } else if ((e.key === 'Backspace' || e.key === 'Delete')) {
        if (!isInput && selectedTableId) {
          e.preventDefault()
          deleteTable(selectedTableId)
        }
      } else if (e.key === 'Escape') {
        if (!isInput) {
          e.preventDefault()
          if (showConnections) {
            setShowConnections(false)
          } else if (showDatabaseImport) {
            setShowDatabaseImport(false)
          } else if (showDatabaseSync) {
            setShowDatabaseSync(false)
          } else if (showSyncQueue) {
            setShowSyncQueue(false)
          } else if (showAuthModal) {
            setShowAuthModal(false)
          } else if (selectedTableId) {
            selectTable(null)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo, canUndo, canRedo, currentProject, createTable, saveToLocal, selectedTableId, deleteTable, selectTable, showConnections, showDatabaseImport, showDatabaseSync, showSyncQueue, showAuthModal, setCanvasZoom, shortcuts, copyTable, pasteTable, selectAllTables, createColumn, tables])

  const logAddedRef = useRef(false)
  
  useEffect(() => {
    const initApp = async () => {
      await checkAuth()
      await loadProjects()
      loadSettings()
      loadShortcuts()
      loadFontConfig()
      loadUpdateLogs()
    }
    
    // 添加更新日志，避免重复添加
    const initUpdateLog = async () => {
      if (logAddedRef.current) return
      
      const savedLogs = (await localStorageService.getMeta<any[]>('updateLogs')) || []
      const today = new Date().toISOString().split('T')[0]
      
      // 检查是否已有v1.8.0的日志
      const hasV18Log = Array.isArray(savedLogs) && savedLogs.some((log: any) => 
        log.description?.includes?.('字段级锁机制与操作历史导出')
      )
      
      if (!hasV18Log) {
        addUpdateLog({
          version: 'v1.8.0',
          type: 'feature',
          description: '字段级锁机制与操作历史导出',
          details: [
            '后端实现字段级锁服务（LockService.ts），支持表级锁和字段级锁',
            '锁超时机制：5分钟无操作自动释放',
            '后端 WebSocket 消息协议新增 LOCK_ACQUIRE/LOCK_RELEASE/LOCK_GRANTED/LOCK_DENIED/LOCK_STATE 消息类型',
            '协作房间（Room）集成锁状态广播',
            '操作历史支持 JSON/CSV 格式导出',
            '前端创建操作历史模态框组件（HistoryModal.tsx）',
            '操作历史支持统计展示、搜索、筛选、分页',
            '设置面板新增"操作历史"入口',
            '前端锁状态管理 Hook（useCollabLocks.ts）',
            'TypeScript 零错误'
          ]
        })
      }
      
      // 检查是否已有v1.7.0的日志
      const hasV17Log = savedLogs.some((log: any) => 
        log.description?.includes?.('标签页功能实现')
      )
      
      if (!hasV17Log) {
        addUpdateLog({
          version: 'v1.7.0',
          type: 'feature',
          description: '标签页功能实现',
          details: [
            '在appStore.ts中添加标签页状态管理（openTabs、activeTabId）',
            '实现openProjectTab方法，支持打开项目标签页',
            '实现closeTab方法，支持关闭标签页',
            '实现setActiveTab方法，支持切换激活标签页',
            '在App.tsx中使用Ant Design Tabs组件实现标签页UI',
            '支持editable-card模式，可关闭标签页',
            '修改ProjectList组件使用openProjectTab替代selectProject',
            '每个标签页显示对应项目的Canvas画布',
            '无标签页时显示友好提示',
            'TypeScript零错误'
          ]
        })
      }
      
      // 检查是否已有v1.6.0的日志
      const hasV16Log = savedLogs.some((log: any) => 
        log.description?.includes?.('登录注册页面与权限控制完成')
      )
      
      if (!hasV16Log) {
        addUpdateLog({
          version: 'v1.6.0',
          type: 'feature',
          description: '登录注册页面与权限控制完成',
          details: [
            '创建独立登录注册页面（LoginPage.tsx），采用全屏布局而非弹窗模式',
            '实现登录和注册两个Tab界面',
            '完整的表单验证逻辑',
            '与appStore认证状态管理集成',
            '实现App.tsx权限控制：未登录显示登录页，已登录显示主应用',
            '确保未登录用户无法访问主应用功能',
            '认证加载状态处理',
            '美观的UI设计，支持主题适配',
            'TypeScript零错误'
          ]
        })
      }
      
      // 检查是否已有v1.5.0的日志
      const hasV15Log = savedLogs.some((log: any) => 
        log.description?.includes?.('用户系统与团队系统数据模型完成')
      )
      
      if (!hasV15Log) {
        addUpdateLog({
          version: 'v1.5.0',
          type: 'feature',
          description: '用户系统与团队系统数据模型完成',
          details: [
            '完成前置条件分析与规划，确认用户系统缺失和团队系统不完整的现状',
            '在 Prisma Schema 中添加 User 数据模型，包含用户认证所需字段',
            '在 Prisma Schema 中添加 Team 数据模型，包含团队基本信息和所有者关联',
            '在 Prisma Schema 中添加 TeamMember 数据模型，管理团队成员角色和权限',
            '在 Prisma Schema 中添加 TeamProject 数据模型，管理团队与项目关联',
            '修复 Prisma Schema 双向关系，确保数据模型完整性',
            '修复 WebSocket 服务器 TypeScript 类型安全问题',
            '安装后端所需依赖：bcrypt（密码加密）、jsonwebtoken（JWT认证）',
            '成功执行 Prisma 数据库同步，新增 User、Team、TeamMember、TeamProject 表'
          ]
        })
      }
      
      // 检查是否已有协作功能的日志
      const hasCollabLog = savedLogs.some((log: any) => 
        log.description?.includes?.('新增团队协作功能')
      )
      
      if (!hasCollabLog) {
        addUpdateLog({
          version: 'v1.4.0',
          type: 'feature',
          description: '新增团队协作功能',
          details: [
            '实现 WebSocket 实时通信服务，支持多人同时在线协作',
            '新增协作房间管理，按项目隔离协作环境',
            '实现在线用户列表和用户加入/离开通知',
            '集成消息协议，支持操作同步',
            '添加协作用户颜色标识，区分不同用户',
            '在设置面板新增更新日志入口'
          ]
        })
      }
      
      // 检查是否已有 v1.3.0 日志
      const hasV13Log = savedLogs.some((log: any) => 
        log.date === today && log.description?.includes?.('新增快捷键 Alt + Q')
      )
      
      if (!hasV13Log) {
        addUpdateLog({
          version: 'v1.3.0',
          type: 'feature',
          description: '新增快捷键功能与布局优化',
          details: [
            '新增快捷键 Alt + Q，开关左侧项目栏',
            '优化列列表布局，支持可拖动调整宽度',
            '修复主题颜色选择按钮颜色显示问题',
            '优化弹窗标题颜色与深色主题适配',
            '修复快捷键加载时缺失字段的问题'
          ]
        })
      }
      logAddedRef.current = true
    }
    
    initApp()
    initUpdateLog()
  }, [checkAuth, loadProjects, loadSettings, loadShortcuts, loadFontConfig, loadUpdateLogs, addUpdateLog])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontConfig.base}px`
  }, [fontConfig])

  const handleDatabaseImport = useCallback(async (importedTables: TableInfo[], targetProjectId?: string) => {
    // 使用 useAppStore.getState() 绕过React渲染周期获取最新Zustand状态
    const storeGet = () => useAppStore.getState()
    const projectId = targetProjectId || currentProject?.id
    if (!projectId) {
      message.error('请先选择或创建项目')
      return
    }

    console.log('[DatabaseImport] 开始导入，表数量:', importedTables.length)
    if (importedTables.length > 0) {
      console.log('[DatabaseImport] 第一张表数据示例:', {
        name: importedTables[0].name,
        columnsCount: importedTables[0].columns?.length || 0,
        hasColumns: Array.isArray(importedTables[0].columns) && importedTables[0].columns.length > 0,
        sampleColumns: importedTables[0].columns?.slice(0, 2)
      })
    }

    let x = TABLE_GRID.START_X
    let y = TABLE_GRID.START_Y
    const tableMap = new Map<string, { tableId: string; columnMap: Map<string, string> }>()
    let successCount = 0
    let failedTableCount = 0
    let totalColumnsCreated = 0

    for (let index = 0; index < importedTables.length; index++) {
      const tableInfo = importedTables[index]

      if (!tableInfo || !tableInfo.name) {
        console.warn('[DatabaseImport] 跳过无效的表信息:', tableInfo)
        continue
      }

      if (!Array.isArray(tableInfo.columns)) {
        console.error(`[DatabaseImport] 表 ${tableInfo.name} 的 columns 字段无效:`, tableInfo.columns)
        message.warning(`表 "${tableInfo.name}" 的列数据异常，将跳过该表的列导入`)
      }

      // 记录导入前的表数量，用于定位新创建的表
      const tablesBeforeCreate = storeGet().tables.filter(t => t.projectId === projectId).length

      await createTable(projectId, {
        name: tableInfo.name,
        comment: tableInfo.comment || undefined,
        positionX: x,
        positionY: y,
      }, true)

      // 等待store状态更新完成
      await new Promise(resolve => setTimeout(resolve, TIME.TABLE_CREATE_DELAY_MS))

      // 【关键修复】使用 storeGet().tables 从Zustand直接获取最新状态，而非依赖React闭包中的旧值
      let newTable = storeGet().tables.find(t => t.name === tableInfo.name && t.projectId === projectId)

      // 如果按名称找不到（可能同名表），尝试通过数量变化定位新表
      if (!newTable) {
        const tablesAfterCreate = storeGet().tables.filter(t => t.projectId === projectId)
        if (tablesAfterCreate.length > tablesBeforeCreate) {
          // 新增的表就是最后一张
          newTable = tablesAfterCreate[tablesAfterCreate.length - 1]
          console.log(`[DatabaseImport] 通过数量变化定位到新表 "${newTable.name}" (ID: ${newTable.id})`)
        }
      }

      // 最后的重试：等待更长时间
      if (!newTable) {
        await new Promise(resolve => setTimeout(resolve, 300))
        newTable = storeGet().tables.find(t => t.name === tableInfo.name && t.projectId === projectId)
        if (!newTable) {
          const tablesAfterRetry = storeGet().tables.filter(t => t.projectId === projectId)
          if (tablesAfterRetry.length > tablesBeforeCreate) {
            newTable = tablesAfterRetry[tablesAfterRetry.length - 1]
          }
        }
      }

      if (newTable) {
        successCount++
        const columnMap = new Map<string, string>()
        const columnsToCreate = tableInfo.columns || []

        console.log(`[DatabaseImport] 处理表 "${tableInfo.name}" (ID: ${newTable.id})，列数量: ${columnsToCreate.length}`)

        if (columnsToCreate.length > 0) {
          for (let colIndex = 0; colIndex < columnsToCreate.length; colIndex++) {
            const col = columnsToCreate[colIndex]

            try {
              await createColumn(newTable.id, {
                name: col.name,
                dataType: col.type,
                nullable: col.isNullable,
                defaultValue: col.defaultValue || undefined,
                autoIncrement: col.autoIncrement || false,
                primaryKey: col.isPrimaryKey,
                unique: false,
                comment: col.comment || undefined,
                order: colIndex,
              })

              await new Promise(resolve => setTimeout(resolve, 50))

              // 同样使用 storeGet() 获取最新状态来查找刚创建的列
              const updatedTable = storeGet().tables.find(t => t.id === newTable.id)
              const createdColumn = updatedTable?.columns?.find(c => c.name === col.name)
              if (createdColumn) {
                columnMap.set(col.name, createdColumn.id)
                totalColumnsCreated++
              }
            } catch (columnError) {
              console.error(`[DatabaseImport] 创建列 "${col.name}" 失败:`, columnError)
            }
          }

          console.log(`[DatabaseImport] 表 "${tableInfo.name}" 成功创建 ${columnMap.size}/${columnsToCreate.length} 列`)
        } else {
          console.warn(`[DatabaseImport] 表 "${tableInfo.name}" 没有列数据需要导入`)
        }

        tableMap.set(tableInfo.name, { tableId: newTable.id, columnMap })

        // 创建索引
        if (tableInfo.indexes && tableInfo.indexes.length > 0) {
          for (const idx of tableInfo.indexes) {
            if (idx.isPrimary) continue

            const columnIds = idx.columns.map(colName => columnMap.get(colName)).filter(Boolean) as string[]

            if (columnIds.length > 0) {
              try {
                await createIndex(newTable.id, {
                  name: idx.name,
                  columns: columnIds,
                  unique: idx.isUnique,
                  type: 'BTREE'
                })
              } catch (indexError) {
                console.error(`[DatabaseImport] 创建索引 "${idx.name}" 失败:`, indexError)
              }
            }
          }
        }
      } else {
        failedTableCount++
        console.error(`[DatabaseImport] 无法找到刚创建的表 "${tableInfo.name}"，已尝试名称查找和数量定位`)
        console.error(`[DatabaseImport] 当前项目中所有表:`, storeGet().tables.filter(t => t.projectId === projectId).map(t => ({ id: t.id, name: t.name })))
        message.error(`无法找到表 "${tableInfo.name}"，可能创建失败`)
      }

      x += TABLE_GRID.X_STEP
      if (index > 0 && index % TABLE_GRID.COLUMNS_PER_ROW === 0) {
        x = TABLE_GRID.START_X
        y += TABLE_GRID.Y_STEP
      }
    }

    // 创建外键关系
    for (const tableInfo of importedTables) {
      const sourceInfo = tableMap.get(tableInfo.name)
      if (!sourceInfo || !tableInfo.foreignKeys) continue

      for (const fk of tableInfo.foreignKeys) {
        const targetInfo = tableMap.get(fk.referencedTable)
        if (!targetInfo) continue

        const sourceColumnId = sourceInfo.columnMap.get(fk.column)
        const targetColumnId = targetInfo.columnMap.get(fk.referencedColumn)

        if (sourceColumnId && targetColumnId) {
          try {
            await createRelationship(projectId, {
              sourceTableId: sourceInfo.tableId,
              sourceColumnId: sourceColumnId,
              targetTableId: targetInfo.tableId,
              targetColumnId: targetColumnId,
              relationshipType: 'one-to-many',
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            })
          } catch (relError) {
            console.error('[DatabaseImport] 创建外键关系失败:', relError)
          }
        }
      }
    }

    console.log('[DatabaseImport] 导入完成:', {
      totalTables: importedTables.length,
      successTables: successCount,
      failedTables: failedTableCount,
      totalColumnsCreated
    })

    if (failedTableCount > 0) {
      message.warning(`成功导入 ${successCount} 张表（${failedTableCount} 张表失败），共创建 ${totalColumnsCreated} 个字段`)
    } else {
      message.success(`成功导入 ${successCount} 张表，共创建 ${totalColumnsCreated} 个字段`)
    }
  }, [currentProject, createTable, createColumn, createIndex, createRelationship])

  const handleApplyLLMTables = useCallback(async (suggestedTables: TableSuggestion[]) => {
    if (!currentProject) {
      message.error('请先选择或创建项目')
      return
    }

    let x = TABLE_GRID.START_X
    let y = TABLE_GRID.START_Y

    for (let index = 0; index < suggestedTables.length; index++) {
      const tableSuggestion = suggestedTables[index]
      
      await createTable(currentProject.id, {
        name: tableSuggestion.tableName,
        comment: tableSuggestion.tableComment || undefined,
        positionX: x,
        positionY: y,
      }, true)
      
      await new Promise(resolve => setTimeout(resolve, TIME.LLM_TABLE_CREATE_DELAY_MS))
      
      const updatedTables = useAppStore.getState().tables
      const newTable = updatedTables.find(t => t.name === tableSuggestion.tableName && t.projectId === currentProject.id)
      
      if (newTable) {
        for (let colIndex = 0; colIndex < tableSuggestion.columns.length; colIndex++) {
          const col = tableSuggestion.columns[colIndex]
          await createColumn(newTable.id, {
            name: col.name,
            dataType: col.dataType,
            nullable: col.nullable,
            defaultValue: col.defaultValue || undefined,
            autoIncrement: col.primaryKey || false,
            primaryKey: col.primaryKey,
            unique: col.unique,
            comment: col.comment || undefined,
            order: colIndex,
          })
          
          await new Promise(resolve => setTimeout(resolve, TIME.LLM_TABLE_CREATE_DELAY_MS))
        }
        
        const updatedTable = useAppStore.getState().tables.find(t => t.id === newTable.id)
        if (!updatedTable || !updatedTable.columns) {
          console.error(`创建表 ${tableSuggestion.tableName} 后未找到`)
        }
      }
      
      x += TABLE_GRID.X_STEP
      if (index > 0 && index % TABLE_GRID.COLUMNS_PER_ROW === 0) {
        x = TABLE_GRID.START_X
        y += TABLE_GRID.Y_STEP
      }
    }
    
    message.success(`成功添加 ${suggestedTables.length} 张表到画布`)
  }, [currentProject, createTable, createColumn])

  const selectedTable = tables.find(t => t.id === selectedTableId)
  const shouldShowTableEditor = selectedTableId !== null && selectedTableIds.length <= 1

  const handleLeftDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingLeft(true)
    startXRef.current = e.clientX
    startLeftWidthRef.current = leftWidth
  }, [leftWidth])

  const handleRightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingRight(true)
    startXRef.current = e.clientX
    startRightWidthRef.current = rightWidth
  }, [rightWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const delta = e.clientX - startXRef.current
        const newWidth = Math.max(LAYOUT.LEFT_MIN_WIDTH, Math.min(LAYOUT.LEFT_MAX_WIDTH, startLeftWidthRef.current + delta))
        setLeftWidth(newWidth)
      }
      if (isDraggingRight) {
        const delta = e.clientX - startXRef.current
        const newWidth = Math.max(LAYOUT.RIGHT_MIN_WIDTH, Math.min(LAYOUT.RIGHT_MAX_WIDTH, startRightWidthRef.current - delta))
        setRightWidth(newWidth)
      }
      
    }

    const handleMouseUp = () => {
      setIsDraggingLeft(false)
      setIsDraggingRight(false)
    }

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = isDraggingLeft || isDraggingRight ? 'col-resize' : 'default'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }
  }, [isDraggingLeft, isDraggingRight])

  const lastSavedText = useMemo(() => {
    if (!lastSaved) return '未保存'
    const diff = Date.now() - lastSaved
    if (diff < TIME.JUST_NOW_MS) return '刚刚保存'
    if (diff < TIME.HOUR_MS) return `${Math.floor(diff / TIME.JUST_NOW_MS)} 分钟前保存`
    return `${Math.floor(diff / TIME.HOUR_MS)} 小时前保存`
  }, [lastSaved])

  const userMenuItems = useMemo(() => currentUser ? [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          个人资料
        </span>
      ),
    },
    {
      key: 'logout',
      label: (
        <span>
          <LogoutOutlined style={{ marginRight: 8 }} />
          退出登录
        </span>
      ),
      onClick: () => {
        logout()
        message.success('已退出登录')
      },
    },
  ] : [], [currentUser, logout])

  const toggleLeftCollapse = useCallback(() => {
    const currentCollapsed = leftCollapsedRef.current
    if (currentCollapsed) {
      setLeftWidth(leftLastWidth)
      setLeftCollapsed(false)
    } else {
      setLeftLastWidth(leftWidth)
      setLeftWidth(LAYOUT.COLLAPSED_WIDTH)
      setLeftCollapsed(true)
    }
  }, [leftWidth, leftLastWidth])

  const toggleRightCollapse = useCallback(() => {
    if (rightCollapsed) {
      setRightWidth(rightLastWidth)
      setRightCollapsed(false)
    } else {
      setRightLastWidth(rightWidth)
      setRightWidth(LAYOUT.COLLAPSED_WIDTH)
      setRightCollapsed(true)
    }
  }, [rightCollapsed, rightWidth, rightLastWidth])

  const tabItems = useMemo(() => openTabs.map(tab => ({
    key: tab.id,
    label: tab.title
  })), [openTabs])

  const handleTabChange = useCallback((key: string) => {
    const tab = openTabs.find(t => t.id === key)
    if (tab) {
      setActiveTab(key)
      if (tab.type === 'project' && tab.projectId) {
        selectProject(tab.projectId).catch(err => {
          console.error('Error switching project:', err)
          message.error('切换项目失败')
        })
      }
    }
  }, [openTabs, setActiveTab, selectProject])

  const handleTabEdit = useCallback((targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => {
    if (action === 'remove') {
      closeTab(targetKey as string)
    }
  }, [closeTab])

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: 'var(--theme-background)' }}>
      <NetworkStatus />
      <Header style={{
        background: 'var(--theme-background-secondary)',
        borderBottom: '1px solid var(--theme-border)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: LAYOUT.HEADER_HEIGHT,
        flexShrink: 0,
        minWidth: 'auto'
      }}>
        <DatabaseOutlined style={{ fontSize: fontConfig.toolbar, color: 'var(--theme-text-secondary)', marginRight: 8 }} />
        <Title level={5} style={{ margin: 0, fontSize: fontConfig.title * 0.7, color: 'var(--theme-text)', fontWeight: 500 }}>数据库可视化设计工具</Title>
        {currentProject && (
          <span style={{ marginLeft: 16, color: 'var(--theme-text-secondary)', fontSize: fontConfig.caption }}>
            — {currentProject.name}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <ModeSwitch />

          <Tooltip title={isOnline ? '已连接到服务器' : '离线模式 - 数据将保存到本地'}>
            <Badge dot={!isOnline} status={isOnline ? 'success' : 'error'}>
              {isOnline ? (
                <WifiOutlined style={{ fontSize: 14, color: 'var(--theme-text-secondary)' }} />
              ) : (
                <DisconnectOutlined style={{ fontSize: 14, color: 'var(--theme-text-secondary)' }} />
              )}
            </Badge>
          </Tooltip>

          <Tooltip title={isSyncing ? `正在同步...` : (syncQueueCount > 0 ? `待同步 ${syncQueueCount} 项 - 点击查看` : lastSavedText)}>
            <Button
              type="text"
              style={{ 
                padding: 4,
                minWidth: 'auto',
                height: 'auto',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
              onClick={() => setShowSyncQueue(true)}
            >
              <Badge count={syncQueueCount} overflowCount={99} style={{ backgroundColor: syncQueueCount > 0 ? '#faad14' : '#52c41a' }}>
                {isSyncing ? (
                  <SyncOutlined spin style={{ fontSize: 14, color: 'var(--theme-text-secondary)' }} />
                ) : (
                  <CloudSyncOutlined style={{ fontSize: 14, color: 'var(--theme-text-secondary)' }} />
                )}
              </Badge>
            </Button>
          </Tooltip>

          <Tooltip title="从数据库导入" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<DatabaseOutlined style={{ fontSize: 14 }} />}
              onClick={() => setShowDatabaseImport(true)}
              style={{ 
                color: 'var(--theme-text-secondary)',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="同步到数据库" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<CloudUploadOutlined style={{ fontSize: 14 }} />}
              onClick={() => setShowDatabaseSync(true)}
              style={{ 
                color: 'var(--theme-text-secondary)',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <CollabUsers />

          <Tooltip title="团队管理" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<TeamOutlined style={{ fontSize: 14 }} />}
              onClick={openTeamManagementTab}
              style={{ 
                color: 'var(--theme-text-secondary)',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="SQL编辑器" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<CodeOutlined style={{ fontSize: 14 }} />}
              onClick={openSQLEditorTab}
              style={{ 
                color: 'var(--theme-text-secondary)',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="AI 助手" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<RobotOutlined style={{ fontSize: 14, color: showAIPanel ? '#1890ff' : undefined }} />}
              onClick={() => setShowAIPanel(v => !v)}
              style={{ 
                color: showAIPanel ? '#1890ff' : 'var(--theme-text-secondary)',
                border: showAIPanel ? '1px solid #1890ff' : 'none',
                boxShadow: 'none',
                outline: 'none',
                background: showAIPanel ? 'rgba(24,144,255,0.08)' : 'transparent',
                borderRadius: 4
              }}
            />
          </Tooltip>

          {currentUser ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4
              }}>
                <Avatar 
                  size={24} 
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
                <span style={{ 
                  marginLeft: 8, 
                  fontSize: fontConfig.caption,
                  color: 'var(--theme-text)'
                }}>
                  {currentUser.displayName || currentUser.username}
                </span>
              </div>
            </Dropdown>
          ) : (
            <Tooltip title="登录/注册" mouseEnterDelay={0.1}>
              <Button
                type="text"
                icon={<LoginOutlined style={{ fontSize: 14 }} />}
                onClick={() => setShowAuthModal(true)}
                style={{ 
                  color: colors.textSecondary,
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                  background: 'transparent'
                }}
              >
                登录
              </Button>
            </Tooltip>
          )}

          <Tooltip title="评论" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<MessageOutlined style={{ fontSize: 14 }} />}
              onClick={() => {
                if (selectedTableIds.length === 1) {
                  const tbl = tables.find(t => t.id === selectedTableIds[0])
                  if (tbl) openCommentTab(tbl.id, tbl.name)
                }
              }}
              disabled={selectedTableIds.length !== 1}
              style={{ 
                color: colors.textSecondary,
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="设置" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<SettingOutlined style={{ fontSize: 14 }} />}
              onClick={() => openSettingsTab()}
              style={{ 
                color: colors.textSecondary,
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="导入 SQLite" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<DatabaseOutlined style={{ fontSize: 14 }} />}
              onClick={openSqliteImportTab}
              style={{ 
                color: colors.textSecondary,
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="分支管理" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<BranchesOutlined style={{ fontSize: 14 }} />}
              onClick={() => {
                if (!currentProject?.id) {
                  message.warning('请先选择一个项目')
                  return
                }
                openBranchManagementTab(currentProject.id, currentProject.name)
              }}
              style={{ 
                color: colors.textSecondary,
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>

          <Tooltip title="Git 配置" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<GithubOutlined style={{ fontSize: 14 }} />}
              onClick={() => {
                if (!currentProject?.id) {
                  message.warning('请先选择一个项目')
                  return
                }
                openGitConfigTab(currentProject.id, currentProject.name)
              }}
              style={{ 
                color: colors.textSecondary,
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </Tooltip>
        </div>
      </Header>
      <ConnectionConfigModal visible={showConnections} onClose={() => setShowConnections(false)} />
      <DatabaseImportModal 
        visible={showDatabaseImport} 
        onClose={() => setShowDatabaseImport(false)}
        onImport={handleDatabaseImport}
        projects={projects}
        currentProjectId={currentProject?.id}
      />
      <DatabaseSyncModal 
        visible={showDatabaseSync} 
        onClose={() => setShowDatabaseSync(false)}
        tables={tables}
      />
      <SyncQueueModal 
        visible={showSyncQueue} 
        onClose={() => setShowSyncQueue(false)}
      />
      <AuthModal 
        visible={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: 0, paddingTop: 0, backgroundColor: 'var(--theme-background)' }} ref={containerRef}>
        <div style={{
          width: leftWidth,
          background: 'var(--theme-background)',
          borderRight: '1px solid var(--theme-border)',
          overflow: leftCollapsed ? 'hidden' : 'auto',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          marginTop: 0,
          transition: 'width 0.1s ease'
        }}>
          {!leftCollapsed ? (
            <ProjectList />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
              <Button 
                type="text" 
                icon={<RightOutlined style={{ color: 'var(--theme-text-secondary)' }} />} 
                onClick={toggleLeftCollapse}
                style={{ padding: '4px 8px', marginBottom: 8 }}
              />
            </div>
          )}
        </div>

        {!leftCollapsed && (
          <DragHandle
            isDragging={isDraggingLeft}
            onMouseDown={handleLeftDragStart}
            tooltipTitle={leftCollapsed ? "展开项目列表" : "折叠项目列表"}
            onClick={toggleLeftCollapse}
          />
        )}

        <div style={{
          flex: 1,
          background: 'var(--theme-background)',
          overflow: 'hidden',
          minWidth: LAYOUT.CENTER_MIN_WIDTH,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {openTabs.length > 0 ? (
            <>
              <Tabs
                activeKey={activeTabId || ''}
                onChange={handleTabChange}
                type="editable-card"
                onEdit={handleTabEdit}
                items={tabItems}
              />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <TabContentRenderer
                  activeTab={activeTabId ? openTabs.find(t => t.id === activeTabId) : null}
                  onOpenTypeConvert={openTypeConvertTab}
                  onOpenLLM={openLLMTab}
                  setShowConnections={setShowConnections}
                  handleApplyLLMTables={handleApplyLLMTables}
                  currentProject={currentProject}
                  selectProject={selectProject}
                />
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
              color: 'var(--theme-text-secondary)',
              fontSize: 13
            }}>
              请选择一个项目开始设计
            </div>
          )}
        </div>



        {shouldShowTableEditor && (
          <>
            {!rightCollapsed && (
              <DragHandle
                isDragging={isDraggingRight}
                onMouseDown={handleRightDragStart}
                tooltipTitle={rightCollapsed ? "展开表编辑器" : "折叠表编辑器"}
                onClick={toggleRightCollapse}
              />
            )}

            <div style={{
              width: rightWidth,
              background: 'var(--theme-background)',
              borderLeft: '1px solid var(--theme-border)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              transition: 'width 0.1s ease'
            }}>
              {!rightCollapsed ? (
                <>
                  <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: LAYOUT.TABLE_EDITOR_HEADER_HEIGHT,
                    flexShrink: 0,
                    backgroundColor: 'var(--theme-background-secondary)'
                  }}>
                    <Title level={5} style={{ margin: 0, fontSize: 12, color: 'var(--theme-text)' }}>编辑表: {selectedTable?.name || ''}</Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tooltip title="折叠面板">
                        <Button 
                          type="text" 
                          size="small"
                          icon={<RightOutlined style={{ color: 'var(--theme-text-secondary)', fontSize: 12 }} />} 
                          onClick={toggleRightCollapse}
                          style={{ padding: '4px 8px' }}
                        />
                      </Tooltip>
                      <CloseOutlined
                        style={{ cursor: 'pointer', fontSize: 12, color: 'var(--theme-text-secondary)' }}
                        onClick={() => selectTable(null)}
                      />
                    </div>
                  </div>
                  <div style={{ height: `calc(100% - ${LAYOUT.TABLE_EDITOR_HEADER_HEIGHT}px)`, overflow: 'auto' }}>
                    {selectedTable && <TableEditor table={selectedTable} onClose={() => selectTable(null)} />}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                    <Button 
                      type="text" 
                      icon={<LeftOutlined style={{ color: 'var(--theme-text-secondary)' }} />} 
                      onClick={toggleRightCollapse}
                      style={{ padding: '4px 8px', marginBottom: 8 }}
                    />
                  </div>
                  {selectedTable && (
                    <div style={{ display: 'none' }}>
                      <TableEditor table={selectedTable} onClose={() => selectTable(null)} />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* AI 助手浮动面板 */}
        {showAIPanel && (
          <div style={{
            width: 380,
            background: 'var(--theme-background)',
            borderLeft: '1px solid var(--theme-border)',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease'
          }}>
            <LLMTab onApplyTables={handleApplyLLMTables} onClose={() => setShowAIPanel(false)} />
          </div>
        )}
      </div>
      <div style={{ display: 'none' }}>
        <TableEditor 
          table={{
            id: 'hidden',
            projectId: 'hidden',
            name: 'hidden',
            positionX: 0,
            positionY: 0,
            columns: [],
            indexes: [],
            createdAt: '',
            updatedAt: ''
          }} 
          onClose={() => {}} 
        />
      </div>
    </div>
  )
}

function App() {
  const { currentUser, checkAuth, isAuthenticated, authLoading } = useAppStore()
  
  // 初始化时检查认证状态
  React.useEffect(() => {
    checkAuth()
  }, [checkAuth])
  
  // 默认显示主应用，身份校验失败时跳转登录
  if (isAuthenticated === false) {
    return <LoginPage />
  }
  
  // 已认证成功，显示主应用
  return (
    <CollabProvider>
      <AppContent />
    </CollabProvider>
  )
}

export default App
