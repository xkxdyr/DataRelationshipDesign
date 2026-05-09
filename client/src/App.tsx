import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Layout, Typography, Badge, Tooltip, Button, message } from 'antd'
import { DatabaseOutlined, CloseOutlined, CloudOutlined, CloudSyncOutlined, CloudUploadOutlined, SyncOutlined, WifiOutlined, DisconnectOutlined, SettingOutlined, LeftOutlined, RightOutlined, TeamOutlined, CodeOutlined } from '@ant-design/icons'
import { useAppStore } from './stores/appStore'
import { useTheme } from './theme/useTheme'
import ProjectList from './components/ProjectList'
import Canvas from './components/Canvas'
import TableEditor from './components/TableEditor'
import ModeSwitch from './components/ModeSwitch'
import { SettingsModal } from './components/SettingsModal'
import { TypeConvertModal } from './components/TypeConvertModal'
import { LLMModal } from './components/LLMModal'
import ImportExportModal from './components/ImportExportModal'
import { ConnectionConfigModal } from './components/ConnectionConfigModal'
import { DatabaseImportModal } from './components/DatabaseImportModal'
import { DatabaseSyncModal } from './components/DatabaseSyncModal'
import { TeamManagementModal } from './components/TeamManagementModal'
import { SQLEditor } from './components/SQLEditor'
import NetworkStatus from './components/NetworkStatus'
import SyncQueueModal from './components/SyncQueueModal'
import { TableInfo, TableSuggestion } from './services/api'
import localStorageService from './services/localStorageService'

const { Header } = Layout
const { Title } = Typography

function App() {
  const { theme, themeOptions, setTheme, fontConfig, colors } = useTheme()
  const { currentProject, projects, loadProjects, selectedTableId, selectedTableIds, tables, columns, selectTable, undo, redo, canUndo, canRedo, isOnline, isSyncing, lastSaved, loadSettings, loadShortcuts, loadFontConfig, createTable, createColumn, createIndex, createRelationship, saveToLocal, deleteTable, setCanvasZoom, canvasZoom, copyTable, pasteTable, selectAllTables, shortcuts, loadUpdateLogs, addUpdateLog, updateLogs, setOnline, refreshSyncQueueCount, syncQueueCount } = useAppStore()

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
    const timer = setInterval(refreshSyncQueueCount, 5000)
    return () => clearInterval(timer)
  }, [refreshSyncQueueCount])
  
  const [leftWidth, setLeftWidth] = useState(350)
  const [rightWidth, setRightWidth] = useState(900)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTypeConvert, setShowTypeConvert] = useState(false)
  const [showLLM, setShowLLM] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showConnections, setShowConnections] = useState(false)
  const [showDatabaseImport, setShowDatabaseImport] = useState(false)
  const [showDatabaseSync, setShowDatabaseSync] = useState(false)
  const [showTeamManagement, setShowTeamManagement] = useState(false)
  const [showSQLEditor, setShowSQLEditor] = useState(false)
  const [showSyncQueue, setShowSyncQueue] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startLeftWidthRef = useRef(0)
  const startRightWidthRef = useRef(0)
  const [leftLastWidth, setLeftLastWidth] = useState(350)
  const [rightLastWidth, setRightLastWidth] = useState(900)
  
  // 使用 ref 跟踪最新的 leftCollapsed 状态，避免闭包陷阱
  const leftCollapsedRef = useRef(leftCollapsed)
  useEffect(() => {
    leftCollapsedRef.current = leftCollapsed
  }, [leftCollapsed])

  useEffect(() => {
    const ZOOM_MIN = 0.5
    const ZOOM_MAX = 2
    const ZOOM_STEP = 0.05

    const getCurrentZoom = () => {
      return useAppStore.getState().canvasZoom || 1
    }

    const zoomIn = () => {
      const currentZoom = getCurrentZoom()
      const newZoom = Math.min(currentZoom + ZOOM_STEP, ZOOM_MAX)
      setCanvasZoom(Math.round(newZoom * 100) / 100)
    }

    const zoomOut = () => {
      const currentZoom = getCurrentZoom()
      const newZoom = Math.max(currentZoom - ZOOM_STEP, ZOOM_MIN)
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
          setShowSettings(true)
        }
      } else if (matchesShortcut(e, shortcuts.importExport)) {
        e.preventDefault()
        if (!isInput) {
          setShowImportExport(true)
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
          if (showSettings) {
            setShowSettings(false)
          } else if (showImportExport) {
            setShowImportExport(false)
          } else if (showTypeConvert) {
            setShowTypeConvert(false)
          } else if (showLLM) {
            setShowLLM(false)
          } else if (showConnections) {
            setShowConnections(false)
          } else if (showDatabaseImport) {
            setShowDatabaseImport(false)
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
  }, [undo, redo, canUndo, canRedo, currentProject, createTable, saveToLocal, selectedTableId, deleteTable, selectTable, showSettings, showImportExport, showTypeConvert, showLLM, showConnections, showDatabaseImport, setCanvasZoom, shortcuts, copyTable, pasteTable, selectAllTables, createColumn, tables])

  const logAddedRef = useRef(false)
  
  useEffect(() => {
    loadProjects()
    loadSettings()
    loadShortcuts()
    loadFontConfig()
    loadUpdateLogs()
    
    // 添加更新日志，避免重复添加
    const initUpdateLog = async () => {
      if (logAddedRef.current) return
      
      const savedLogs = await localStorageService.getMeta('updateLogs')
      const today = new Date().toISOString().split('T')[0]
      
      const hasLogToday = savedLogs?.some?.((log: any) => 
        log.date === today && log.description?.includes?.('新增快捷键 Alt + Q')
      )
      
      if (!hasLogToday) {
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
    
    initUpdateLog()
  }, [])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontConfig.base}px`
  }, [fontConfig])

  const handleDatabaseImport = async (importedTables: TableInfo[], targetProjectId?: string) => {
    console.log('handleDatabaseImport called with:', importedTables, 'targetProjectId:', targetProjectId)
    
    const projectId = targetProjectId || currentProject?.id
    if (!projectId) {
      message.error('请先选择或创建项目')
      return
    }
    
    let x = 100
    let y = 100
    const tableMap = new Map<string, { tableId: string; columnMap: Map<string, string> }>()
    
    for (let index = 0; index < importedTables.length; index++) {
      const tableInfo = importedTables[index]
      console.log('Processing table:', tableInfo.name, 'columns:', tableInfo.columns)
      
      await createTable(projectId, {
        name: tableInfo.name,
        comment: tableInfo.comment || undefined,
        positionX: x,
        positionY: y,
      }, true)
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const newTable = tables.find(t => t.name === tableInfo.name && t.projectId === projectId)
      if (newTable) {
        const columnMap = new Map<string, string>()
        
        for (let colIndex = 0; colIndex < tableInfo.columns.length; colIndex++) {
          const col = tableInfo.columns[colIndex]
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
          const updatedTable = tables.find(t => t.id === newTable.id)
          const createdColumn = updatedTable?.columns.find(c => c.name === col.name)
          if (createdColumn) {
            columnMap.set(col.name, createdColumn.id)
          }
        }
        
        tableMap.set(tableInfo.name, { tableId: newTable.id, columnMap })
        
        if (tableInfo.indexes && tableInfo.indexes.length > 0) {
          for (const idx of tableInfo.indexes) {
            if (idx.isPrimary) continue
            
            const columnIds = idx.columns.map(colName => columnMap.get(colName)).filter(Boolean) as string[]
            
            if (columnIds.length > 0) {
              await createIndex(newTable.id, {
                name: idx.name,
                columns: columnIds,
                unique: idx.isUnique,
                type: 'BTREE'
              })
            }
          }
        }
      }
      
      x += 250
      if (index > 0 && index % 3 === 0) {
        x = 100
        y += 200
      }
    }
    
    for (const tableInfo of importedTables) {
      const sourceInfo = tableMap.get(tableInfo.name)
      if (!sourceInfo || !tableInfo.foreignKeys) continue
      
      for (const fk of tableInfo.foreignKeys) {
        const targetInfo = tableMap.get(fk.referencedTable)
        if (!targetInfo) continue
        
        const sourceColumnId = sourceInfo.columnMap.get(fk.column)
        const targetColumnId = targetInfo.columnMap.get(fk.referencedColumn)
        
        if (sourceColumnId && targetColumnId) {
          await createRelationship(projectId, {
            sourceTableId: sourceInfo.tableId,
            sourceColumnId: sourceColumnId,
            targetTableId: targetInfo.tableId,
            targetColumnId: targetColumnId,
            relationshipType: 'one-to-many',
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          })
        }
      }
    }
    
    message.success(`成功导入 ${importedTables.length} 张表，已添加到画布`)
  }

  const handleApplyLLMTables = async (suggestedTables: TableSuggestion[]) => {
    if (!currentProject) {
      message.error('请先选择或创建项目')
      return
    }

    let x = 100
    let y = 100

    for (let index = 0; index < suggestedTables.length; index++) {
      const tableSuggestion = suggestedTables[index]
      
      await createTable(currentProject.id, {
        name: tableSuggestion.tableName,
        comment: tableSuggestion.tableComment || undefined,
        positionX: x,
        positionY: y,
      }, true)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
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
          
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        const updatedTable = useAppStore.getState().tables.find(t => t.id === newTable.id)
        if (updatedTable && updatedTable.columns) {
          const pkColumns = updatedTable.columns.filter(c => c.primaryKey)
          console.log(`表 ${updatedTable.name} 创建成功，主键列:`, pkColumns.map(c => c.name))
        }
      } else {
        console.error(`创建表 ${tableSuggestion.tableName} 后未找到`)
      }
      
      x += 250
      if (index > 0 && index % 3 === 0) {
        x = 100
        y += 200
      }
    }
    
    message.success(`成功添加 ${suggestedTables.length} 张表到画布`)
  }

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
        const newWidth = Math.max(250, Math.min(500, startLeftWidthRef.current + delta))
        setLeftWidth(newWidth)
      }
      if (isDraggingRight) {
        const delta = e.clientX - startXRef.current
        const newWidth = Math.max(400, Math.min(1200, startRightWidthRef.current - delta))
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

  const getLastSavedText = () => {
    if (!lastSaved) return '未保存'
    const diff = Date.now() - lastSaved
    if (diff < 60000) return '刚刚保存'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前保存`
    return `${Math.floor(diff / 3600000)} 小时前保存`
  }

  const toggleLeftCollapse = () => {
    const currentCollapsed = leftCollapsedRef.current
    if (currentCollapsed) {
      setLeftWidth(leftLastWidth)
      setLeftCollapsed(false)
    } else {
      setLeftLastWidth(leftWidth)
      setLeftWidth(36)
      setLeftCollapsed(true)
    }
  }

  const toggleRightCollapse = () => {
    if (rightCollapsed) {
      setRightWidth(rightLastWidth)
      setRightCollapsed(false)
    } else {
      setRightLastWidth(rightWidth)
      setRightWidth(36)
      setRightCollapsed(true)
    }
  }

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: 'var(--theme-background)' }}>
      <NetworkStatus />
      <Header style={{
        background: 'var(--theme-background-secondary)',
        borderBottom: '1px solid var(--theme-border)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: 36,
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
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

          <Tooltip title={isSyncing ? `正在同步...` : (syncQueueCount > 0 ? `待同步 ${syncQueueCount} 项 - 点击查看` : getLastSavedText())}>
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

          <Tooltip title="团队管理" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<TeamOutlined style={{ fontSize: 14 }} />}
              onClick={() => setShowTeamManagement(true)}
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
              onClick={() => setShowSQLEditor(true)}
              style={{ 
                color: 'var(--theme-text-secondary)',
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
              icon={<CodeOutlined style={{ fontSize: 14 }} />}
              onClick={() => setShowSQLEditor(true)}
              style={{ 
                color: 'var(--theme-text-secondary)',
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
              onClick={() => setShowSettings(true)}
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
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenTypeConvert={() => {
          setShowSettings(false)
          setShowTypeConvert(true)
        }}
        onOpenLLM={() => {
          setShowSettings(false)
          setShowLLM(true)
        }}
        onOpenConnections={() => {
          setShowSettings(false)
          setShowConnections(true)
        }}
      />
      <TypeConvertModal visible={showTypeConvert} onClose={() => setShowTypeConvert(false)} />
      <LLMModal visible={showLLM} onClose={() => setShowLLM(false)} onApplyTables={handleApplyLLMTables} />
      <ImportExportModal open={showImportExport} onClose={() => setShowImportExport(false)} />
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
      <TeamManagementModal 
        visible={showTeamManagement} 
        onClose={() => setShowTeamManagement(false)}
      />
      <SyncQueueModal 
        visible={showSyncQueue} 
        onClose={() => setShowSyncQueue(false)}
      />
      <SQLEditor 
        visible={showSQLEditor} 
        onClose={() => setShowSQLEditor(false)}
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
          <div style={{
            width: 4,
            background: isDraggingLeft ? 'var(--theme-primary)' : 'var(--theme-border)',
            cursor: 'col-resize',
            flexShrink: 0,
            transition: 'background 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
            onMouseDown={handleLeftDragStart}
          >
            {!leftCollapsed && (
              <Tooltip title={leftCollapsed ? "展开项目列表" : "折叠项目列表"}>
                <Button 
                  type="text" 
                  size="small"
                  icon={<LeftOutlined style={{ color: 'var(--theme-text-secondary)', fontSize: 12 }} />} 
                  onClick={toggleLeftCollapse}
                  style={{ 
                    padding: '4px 2px', 
                    position: 'absolute',
                    zIndex: 1
                  }}
                />
              </Tooltip>
            )}
          </div>
        )}

        <div style={{
          flex: 1,
          background: 'var(--theme-background)',
          overflow: 'hidden',
          minWidth: 300
        }}>
          {currentProject ? (
            <Canvas />
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
              <div style={{
                width: 4,
                background: isDraggingRight ? 'var(--theme-primary)' : 'var(--theme-border)',
                cursor: 'col-resize',
                flexShrink: 0,
                transition: 'background 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
                onMouseDown={handleRightDragStart}
              >
                <Tooltip title={rightCollapsed ? "展开表编辑器" : "折叠表编辑器"}>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<RightOutlined style={{ color: 'var(--theme-text-secondary)', fontSize: 12 }} />} 
                    onClick={toggleRightCollapse}
                    style={{ 
                      padding: '4px 2px',
                      position: 'absolute',
                      zIndex: 1
                    }}
                  />
                </Tooltip>
              </div>
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
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 36,
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
                  <div style={{ height: 'calc(100% - 36px)', overflow: 'auto' }}>
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

export default App
