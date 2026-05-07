import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Layout, Typography, Badge, Tooltip, Button, message } from 'antd'
import { DatabaseOutlined, CloseOutlined, CloudOutlined, CloudSyncOutlined, CloudUploadOutlined, SyncOutlined, WifiOutlined, DisconnectOutlined, SettingOutlined, LeftOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
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
import { TableInfo } from './services/api'

const { Header } = Layout
const { Title } = Typography

function App() {
  const { currentProject, projects, loadProjects, selectedTableId, tables, selectTable, undo, redo, canUndo, canRedo, isOnline, isSyncing, lastSaved, fontSize, setFontSize, themeColor, loadSettings, createTable, createColumn, createIndex, createRelationship, saveToLocal, deleteTable, setCanvasZoom, canvasZoom, copySelectedTables, pasteTables } = useAppStore()
  const { colors } = useTheme()
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
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startLeftWidthRef = useRef(0)
  const startRightWidthRef = useRef(0)
  const [leftLastWidth, setLeftLastWidth] = useState(350)
  const [rightLastWidth, setRightLastWidth] = useState(900)

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

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          if (canUndo()) {
            undo()
          }
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault()
          if (canRedo()) {
            redo()
          }
        } else if (e.key === 's') {
          e.preventDefault()
          if (!isInput) {
            saveToLocal()
          }
        } else if (e.key === 't') {
          e.preventDefault()
          if (!isInput && currentProject) {
            createTable(currentProject.id, {
              name: '新表',
              positionX: 100,
              positionY: 100
            })
          }
        } else if (e.key === '0') {
          e.preventDefault()
          if (!isInput) {
            setCanvasZoom(1)
          }
        } else if ((e.key === '+' || e.key === '=' || e.code === 'Equal' || e.shiftKey && e.key === '=') && !e.altKey) {
          e.preventDefault()
          if (!isInput) {
            zoomIn()
          }
        } else if ((e.key === '-' || e.code === 'Minus') && !e.altKey) {
          e.preventDefault()
          if (!isInput) {
            zoomOut()
          }
        } else if (e.key === ',' || e.code === 'Comma' || e.keyCode === 188) {
          e.preventDefault()
          if (!isInput) {
            setShowSettings(true)
          }
        } else if ((e.key === 'e' || e.key === 'E') && e.shiftKey) {
          e.preventDefault()
          if (!isInput) {
            setShowImportExport(true)
          }
        } else if (e.key === 'a') {
          e.preventDefault()
          if (!isInput) {
            message.info('全选功能')
          }
        } else if (e.key === 'c') {
          e.preventDefault()
          if (!isInput && selectedTableId) {
            useAppStore.getState().copySelectedTables()
            message.success('已复制 ' + (useAppStore.getState().selectedTableIds?.length || 0) + ' 个表')
          }
        } else if (e.key === 'v') {
          e.preventDefault()
          if (!isInput && currentProject) {
            useAppStore.getState().pasteTables()
            message.success('已粘贴表')
          }
        } else if (e.key === 'f') {
          e.preventDefault()
          if (!isInput) {
            message.info('查找功能')
          }
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
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
  }, [undo, redo, canUndo, canRedo, currentProject, createTable, saveToLocal, selectedTableId, deleteTable, selectTable, showSettings, showImportExport, showTypeConvert, showLLM, showConnections, showDatabaseImport, setCanvasZoom])

  useEffect(() => {
    loadProjects()
    loadSettings()
  }, [])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  const handleDatabaseImport = async (importedTables: TableInfo[], targetProjectId?: string) => {
    console.log('handleDatabaseImport called with:', importedTables, 'targetProjectId:', targetProjectId)
    
    // 使用指定的目标项目或当前项目
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
      }, true) // skipAutoIdColumn=true，导入数据库表时跳过自动添加id列
      
      // Wait for the tables state to update
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
          
          // Get the column ID for foreign key mapping
          await new Promise(resolve => setTimeout(resolve, 50))
          // 从 tables 中获取最新的表数据，然后找到对应的列
          const updatedTable = tables.find(t => t.id === newTable.id)
          const createdColumn = updatedTable?.columns.find(c => c.name === col.name)
          if (createdColumn) {
            columnMap.set(col.name, createdColumn.id)
          }
        }
        
        tableMap.set(tableInfo.name, { tableId: newTable.id, columnMap })
        
        // Create indexes
        if (tableInfo.indexes && tableInfo.indexes.length > 0) {
          for (const idx of tableInfo.indexes) {
            if (idx.isPrimary) continue // Primary key already handled
            
            // 将列名转换为列 ID
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
    
    // Create foreign key relationships after all tables and columns are created
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

  const selectedTable = tables.find(t => t.id === selectedTableId)

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
    if (leftCollapsed) {
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
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: `${fontSize}px`, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: colors.background }}>
      <Header style={{
        background: colors.backgroundSecondary,
        borderBottom: `1px solid ${colors.border}`,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: 36,
        flexShrink: 0,
        minWidth: 'auto'
      }}>
        <DatabaseOutlined style={{ fontSize: 16, color: colors.textSecondary, marginRight: 8 }} />
        <Title level={5} style={{ margin: 0, fontSize: 13, color: colors.text, fontWeight: 500 }}>数据库可视化设计工具</Title>
        {currentProject && (
          <span style={{ marginLeft: 16, color: colors.textSecondary, fontSize: 12 }}>
            — {currentProject.name}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ModeSwitch />

          <Tooltip title={isOnline ? '已连接到服务器' : '离线模式 - 数据将保存到本地'}>
            <Badge dot={!isOnline} status={isOnline ? 'success' : 'error'}>
              {isOnline ? (
                <WifiOutlined style={{ fontSize: 14, color: colors.textSecondary }} />
              ) : (
                <DisconnectOutlined style={{ fontSize: 14, color: colors.textSecondary }} />
              )}
            </Badge>
          </Tooltip>

          <Tooltip title={isSyncing ? '正在保存...' : getLastSavedText()}>
            {isSyncing ? (
              <SyncOutlined spin style={{ fontSize: 14, color: colors.textSecondary }} />
            ) : (
              <CloudOutlined style={{ fontSize: 14, color: colors.textSecondary }} />
            )}
          </Tooltip>

          <Tooltip title="从数据库导入" mouseEnterDelay={0.1}>
            <Button
              type="text"
              icon={<DatabaseOutlined style={{ fontSize: 14 }} />}
              onClick={() => setShowDatabaseImport(true)}
              style={{ 
                color: colors.textSecondary,
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
                color: colors.textSecondary,
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
      <LLMModal visible={showLLM} onClose={() => setShowLLM(false)} />
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: 0, paddingTop: 0, backgroundColor: colors.background }} ref={containerRef}>
        {/* 左侧边栏 */}
        <div style={{
          width: leftWidth,
          background: colors.background,
          borderRight: `1px solid ${colors.border}`,
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
                icon={<RightOutlined style={{ color: colors.textSecondary }} />} 
                onClick={toggleLeftCollapse}
                style={{ padding: '4px 8px', marginBottom: 8 }}
              />
            </div>
          )}
        </div>

        {/* 分割条 */}
        {!leftCollapsed && (
          <div style={{
            width: 4,
            background: isDraggingLeft ? colors.primary : colors.border,
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
                  icon={<LeftOutlined style={{ color: colors.textSecondary, fontSize: 12 }} />} 
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

        {/* 中间画布区域 */}
        <div style={{
          flex: 1,
          background: colors.background,
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
              color: colors.textSecondary,
              fontSize: 13
            }}>
              请选择一个项目开始设计
            </div>
          )}
        </div>

        {/* 始终渲染一个隐藏的 TableEditor，确保 useForm 不会报警告 */}
        <div style={{ display: 'none' }}>
          <TableEditor table={{
            id: 'persistent_table_editor',
            name: 'persistent',
            projectId: 'persistent',
            positionX: 0,
            positionY: 0,
            columns: [],
            indexes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }} onClose={() => {}} />
        </div>

        {/* 右侧边栏 */}
        {selectedTable && (
          <>
            {!rightCollapsed && (
              <div style={{
                width: 4,
                background: isDraggingRight ? colors.primary : colors.border,
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
                    icon={<RightOutlined style={{ color: colors.textSecondary, fontSize: 12 }} />} 
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
              background: colors.background,
              borderLeft: `1px solid ${colors.border}`,
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
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 36,
                    flexShrink: 0,
                    backgroundColor: colors.backgroundSecondary
                  }}>
                    <Title level={5} style={{ margin: 0, fontSize: 12, color: colors.text }}>编辑表: {selectedTable.name}</Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tooltip title="折叠面板">
                        <Button 
                          type="text" 
                          size="small"
                          icon={<RightOutlined style={{ color: colors.textSecondary, fontSize: 12 }} />} 
                          onClick={toggleRightCollapse}
                          style={{ padding: '4px 8px' }}
                        />
                      </Tooltip>
                      <CloseOutlined
                        style={{ cursor: 'pointer', fontSize: 12, color: colors.textSecondary }}
                        onClick={() => selectTable(null)}
                      />
                    </div>
                  </div>
                  <div style={{ height: 'calc(100% - 36px)', overflow: 'auto' }}>
                    <TableEditor table={selectedTable} onClose={() => selectTable(null)} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                    <Button 
                      type="text" 
                      icon={<LeftOutlined style={{ color: colors.textSecondary }} />} 
                      onClick={toggleRightCollapse}
                      style={{ padding: '4px 8px', marginBottom: 8 }}
                    />
                  </div>
                  {/* 折叠时也渲染但隐藏 TableEditor */}
                  <div style={{ display: 'none' }}>
                    <TableEditor table={selectedTable} onClose={() => selectTable(null)} />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App