import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Layout, Typography, Badge, Tooltip, Button } from 'antd'
import { DatabaseOutlined, CloseOutlined, CloudOutlined, CloudSyncOutlined, SyncOutlined, WifiOutlined, DisconnectOutlined, SettingOutlined } from '@ant-design/icons'
import { useAppStore } from './stores/appStore'
import ProjectList from './components/ProjectList'
import Canvas from './components/Canvas'
import TableEditor from './components/TableEditor'
import ModeSwitch from './components/ModeSwitch'
import { SettingsModal } from './components/SettingsModal'
import { TypeConvertModal } from './components/TypeConvertModal'
import { LLMModal } from './components/LLMModal'

const { Header } = Layout
const { Title } = Typography

function App() {
  const { currentProject, loadProjects, selectedTableId, tables, selectTable, undo, redo, canUndo, canRedo, isOnline, isSyncing, lastSaved, fontSize, themeColor, loadSettings } = useAppStore()
  const [leftWidth, setLeftWidth] = useState(350)
  const [rightWidth, setRightWidth] = useState(900)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTypeConvert, setShowTypeConvert] = useState(false)
  const [showLLM, setShowLLM] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startLeftWidthRef = useRef(0)
  const startRightWidthRef = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo, canUndo, canRedo])

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

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: `${fontSize}px` }}>
      <Header style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 64,
        flexShrink: 0,
        minWidth: 'auto'
      }}>
        <DatabaseOutlined style={{ fontSize: `${fontSize + 10}px`, color: themeColor, marginRight: '12px' }} />
        <Title level={3} style={{ margin: 0, fontSize: `${fontSize + 4}px` }}>数据库可视化设计工具</Title>
        {currentProject && (
          <span style={{ marginLeft: 'auto', color: '#666' }}>
            当前项目: <strong>{currentProject.name}</strong>
          </span>
        )}
        <div style={{ marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ModeSwitch />

          <Tooltip title={isOnline ? '已连接到服务器' : '离线模式 - 数据将保存到本地'}>
            <Badge dot={!isOnline} status={isOnline ? 'success' : 'error'}>
              {isOnline ? (
                <WifiOutlined style={{ fontSize: `${fontSize + 4}px`, color: '#52c41a' }} />
              ) : (
                <DisconnectOutlined style={{ fontSize: `${fontSize + 4}px`, color: '#ff4d4f' }} />
              )}
            </Badge>
          </Tooltip>

          <Tooltip title={isSyncing ? '正在保存...' : getLastSavedText()}>
            {isSyncing ? (
              <SyncOutlined spin style={{ fontSize: `${fontSize + 4}px`, color: '#1890ff' }} />
            ) : (
              <CloudOutlined style={{ fontSize: `${fontSize + 4}px`, color: isOnline ? '#52c41a' : '#999' }} />
            )}
          </Tooltip>

          <Tooltip title="设置">
            <Button
              type="text"
              icon={<SettingOutlined style={{ fontSize: `${fontSize + 4}px` }} />}
              onClick={() => setShowSettings(true)}
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: 0, paddingTop: 0 }} ref={containerRef}>
        <div style={{
          width: leftWidth,
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          marginTop: 0
        }}>
          <ProjectList />
        </div>

        <div style={{
          width: 6,
          background: isDraggingLeft ? '#1890ff' : '#f0f0f0',
          cursor: 'col-resize',
          flexShrink: 0,
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
          onMouseDown={handleLeftDragStart}
        >
          {isDraggingLeft && (
            <div style={{ width: 2, height: 30, background: '#fff', borderRadius: 1 }} />
          )}
        </div>

        <div style={{
          flex: 1,
          background: '#f5f5f5',
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
              color: '#999',
              fontSize: '18px'
            }}>
              请选择一个项目开始设计
            </div>
          )}
        </div>

        {selectedTable && (
          <>
            <div style={{
              width: 6,
              background: isDraggingRight ? '#1890ff' : '#f0f0f0',
              cursor: 'col-resize',
              flexShrink: 0,
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
              onMouseDown={handleRightDragStart}
            >
              {isDraggingRight && (
                <div style={{ width: 2, height: 30, background: '#fff', borderRadius: 1 }} />
              )}
            </div>

            <div style={{
              width: rightWidth,
              background: '#fff',
              borderLeft: '1px solid #f0f0f0',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 64,
                flexShrink: 0
              }}>
                <Title level={4} style={{ margin: 0 }}>编辑表: {selectedTable.name}</Title>
                <CloseOutlined
                  style={{ cursor: 'pointer', fontSize: '18px', color: '#666' }}
                  onClick={() => selectTable(null)}
                />
              </div>
              <div style={{ height: 'calc(100% - 64px)', overflow: 'auto' }}>
                <TableEditor table={selectedTable} onClose={() => selectTable(null)} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App