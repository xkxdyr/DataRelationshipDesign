import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Layout, Typography, Badge, Tooltip, Button } from 'antd'
import { DatabaseOutlined, CloseOutlined, CloudOutlined, CloudSyncOutlined, SyncOutlined, WifiOutlined, DisconnectOutlined, SettingOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
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

const { Header } = Layout
const { Title } = Typography

function App() {
  const { currentProject, loadProjects, selectedTableId, tables, selectTable, undo, redo, canUndo, canRedo, isOnline, isSyncing, lastSaved, fontSize, themeColor, loadSettings, createTable, saveToLocal, deleteTable } = useAppStore()
  const { colors } = useTheme()
  const [leftWidth, setLeftWidth] = useState(350)
  const [rightWidth, setRightWidth] = useState(900)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTypeConvert, setShowTypeConvert] = useState(false)
  const [showLLM, setShowLLM] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startLeftWidthRef = useRef(0)
  const startRightWidthRef = useRef(0)
  const [leftLastWidth, setLeftLastWidth] = useState(350)
  const [rightLastWidth, setRightLastWidth] = useState(900)

  useEffect(() => {
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
        } else if (e.key === 'n') {
          e.preventDefault()
          if (!isInput && currentProject) {
            createTable(currentProject.id, {
              name: '新表',
              positionX: 100,
              positionY: 100
            })
          }
        } else if (e.key === ',') {
          e.preventDefault()
          if (!isInput) {
            setShowSettings(true)
          }
        } else if (e.key === 'e' && e.shiftKey) {
          e.preventDefault()
          if (!isInput && currentProject) {
            setShowImportExport(true)
          }
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault()
          if (!isInput && selectedTableId) {
            deleteTable(selectedTableId)
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          if (!isInput) {
            if (showSettings) {
              setShowSettings(false)
            } else if (showImportExport) {
              setShowImportExport(false)
            } else if (showTypeConvert) {
              setShowTypeConvert(false)
            } else if (showLLM) {
              setShowLLM(false)
            } else if (selectedTableId) {
              selectTable(null)
            }
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo, canUndo, canRedo, currentProject, createTable, saveToLocal, selectedTableId, deleteTable, selectTable, showSettings, showImportExport, showTypeConvert, showLLM])

  useEffect(() => {
    loadSettings()
    loadProjects()
  }, [])

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

          <Tooltip title="设置">
            <Button
              type="text"
              icon={<SettingOutlined style={{ fontSize: 14 }} />}
              onClick={() => setShowSettings(true)}
              style={{ color: colors.textSecondary }}
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
      />
      <TypeConvertModal visible={showTypeConvert} onClose={() => setShowTypeConvert(false)} />
      <LLMModal visible={showLLM} onClose={() => setShowLLM(false)} />
      <ImportExportModal open={showImportExport} onClose={() => setShowImportExport(false)} />

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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                  <Button 
                    type="text" 
                    icon={<LeftOutlined style={{ color: colors.textSecondary }} />} 
                    onClick={toggleRightCollapse}
                    style={{ padding: '4px 8px', marginBottom: 8 }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App