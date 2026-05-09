import React, { useState, useEffect, useCallback } from 'react'
import { Row, Col, Tag, Button, Space, Typography, Tooltip, Card } from 'antd'
import { EditOutlined, CheckOutlined, XOutlined, RotateLeftOutlined, KeyOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

const { Title, Text } = Typography

const defaultShortcuts = {
  undo: ['ctrl', 'z'],
  redo: ['ctrl', 'shift', 'z'],
  save: ['ctrl', 's'],
  newTable: ['ctrl', 'shift', 't'],
  resetZoom: ['ctrl', '0'],
  zoomIn: ['ctrl', '+'],
  zoomOut: ['ctrl', '-'],
  settings: ['ctrl', ','],
  importExport: ['ctrl', 'shift', 'e'],
  delete: ['delete'],
  selectAll: ['ctrl', 'a'],
  copy: ['ctrl', 'c'],
  paste: ['ctrl', 'v'],
  find: ['ctrl', 'f'],
  toggleLeftSidebar: ['alt', 'q']
}

const shortcutCategories = [
  {
    title: '编辑操作',
    items: [
      { key: 'undo', label: '撤销' },
      { key: 'redo', label: '重做' },
      { key: 'copy', label: '复制' },
      { key: 'paste', label: '粘贴' },
    ]
  },
  {
    title: '项目操作',
    items: [
      { key: 'save', label: '保存' },
      { key: 'newTable', label: '新建表' },
      { key: 'delete', label: '删除选中表' },
      { key: 'importExport', label: '导入导出' },
    ]
  },
  {
    title: '视图操作',
    items: [
      { key: 'zoomIn', label: '放大' },
      { key: 'zoomOut', label: '缩小' },
      { key: 'resetZoom', label: '重置缩放' },
      { key: 'selectAll', label: '全选' },
      { key: 'find', label: '查找' },
      { key: 'settings', label: '打开设置' },
      { key: 'toggleLeftSidebar', label: '开关左侧栏' },
    ]
  }
]

export const ShortcutsPanel: React.FC = () => {
  const shortcuts = useAppStore(state => state.shortcuts)
  const setShortcuts = useAppStore(state => state.setShortcuts)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingShortcut, setEditingShortcut] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [pressedKeys, setPressedKeys] = useState<string[]>([])

  const handleEditStart = (key: string) => {
    setEditingKey(key)
    setEditingShortcut([...(shortcuts as any)[key]])
    setIsRecording(false)
    setPressedKeys([])
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording || !editingKey) return
    
    e.preventDefault()
    e.stopPropagation()

    const key = e.key.toLowerCase()
    
    if (['control', 'shift', 'alt', 'meta'].includes(key)) {
      setPressedKeys(prev => {
        if (!prev.includes(key)) {
          return [...prev, key === 'control' ? 'ctrl' : key]
        }
        return prev
      })
      return
    }

    const newShortcut = [...pressedKeys]
    if (e.ctrlKey || e.metaKey) newShortcut.push('ctrl')
    if (e.shiftKey) newShortcut.push('shift')
    if (e.altKey) newShortcut.push('alt')
    newShortcut.push(key)

    const uniqueKeys = [...new Set(newShortcut)]
    const sortedKeys = uniqueKeys.sort((a, b) => {
      const order = ['ctrl', 'alt', 'shift']
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })

    setEditingShortcut(sortedKeys)
    setIsRecording(false)
    setPressedKeys([])
  }, [isRecording, editingKey, pressedKeys])

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown, true)
      return () => window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isRecording, handleKeyDown])

  const handleSave = () => {
    if (editingKey && editingShortcut.length > 0) {
      setShortcuts({
        ...shortcuts,
        [editingKey]: editingShortcut
      })
    }
    setEditingKey(null)
    setEditingShortcut([])
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditingShortcut([])
    setIsRecording(false)
    setPressedKeys([])
  }

  const handleResetSingle = (key: string) => {
    setShortcuts({
      ...shortcuts,
      [key]: defaultShortcuts[key as keyof typeof defaultShortcuts]
    })
  }

  const handleResetAll = () => {
    setShortcuts({ ...defaultShortcuts })
  }

  const renderKeyTag = (key: string) => {
    const isModifier = ['ctrl', 'shift', 'alt'].includes(key)
    return (
      <Tag 
        color={isModifier ? 'blue' : 'green'}
        style={{ 
          padding: '4px 10px', 
          borderRadius: 4, 
          fontSize: 12,
          fontWeight: 500,
          border: '1px solid transparent'
        }}
      >
        {key.toUpperCase()}
      </Tag>
    )
  }

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <KeyOutlined style={{ fontSize: 20, color: 'var(--theme-primary)' }} />
          <Title level={4} style={{ marginBottom: 0, color: 'var(--theme-text)' }}>键盘快捷键</Title>
        </div>
        <Button 
          size="small" 
          icon={<RotateLeftOutlined />} 
          onClick={handleResetAll}
          style={{ padding: '6px 16px' }}
        >
          重置全部
        </Button>
      </div>

      <Space direction="vertical" style={{ width: '100%', gap: 16 }}>
        {shortcutCategories.map((category) => (
          <Card 
            key={category.title}
            style={{ 
              border: '1px solid var(--theme-border)',
              borderRadius: 12,
              backgroundColor: 'var(--theme-card)',
              boxShadow: 'none'
            }}
            headStyle={{ 
              backgroundColor: 'var(--theme-background-secondary)',
              borderBottom: '1px solid var(--theme-border)',
              padding: '12px 16px'
            }}
            title={
              <span style={{ color: 'var(--theme-text)', fontWeight: 600, fontSize: 14 }}>
                {category.title}
              </span>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {category.items.map((item) => {
                const currentKeys = editingKey === item.key ? editingShortcut : ((shortcuts as any)[item.key] || [])
                const isEditing = editingKey === item.key
                
                return (
                  <div 
                    key={item.key}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      background: isEditing ? 'var(--theme-selected)' : 'transparent',
                      borderRadius: 8,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        background: 'var(--theme-hover)'
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Space size="small">
                        {currentKeys.map((k: string, i: number) => (
                          <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
                            {i > 0 && <span style={{ color: 'var(--theme-text-secondary)', marginRight: 4 }}>+</span>}
                            {renderKeyTag(k)}
                          </span>
                        ))}
                      </Space>
                      {isRecording && pressedKeys.length > 0 && (
                        <span style={{ color: 'var(--theme-primary)', fontSize: 12 }}>
                          (+ {pressedKeys.map(k => k.toUpperCase()).join('+')})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: 'var(--theme-text-secondary)', fontSize: 13 }}>{item.label}</Text>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isEditing ? (
                          <Space size="small">
                            {!isRecording ? (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => setIsRecording(true)}
                                style={{ padding: '4px 12px' }}
                              >
                                录制
                              </Button>
                            ) : (
                              <Tag color="red" style={{ fontSize: 11, padding: '4px 8px' }}>正在录制...</Tag>
                            )}
                            <Tooltip title="保存">
                              <Button 
                                size="small" 
                                icon={<CheckOutlined style={{ fontSize: 14 }} />} 
                                onClick={handleSave}
                              />
                            </Tooltip>
                            <Tooltip title="取消">
                              <Button 
                                size="small" 
                                icon={<XOutlined style={{ fontSize: 14 }} />} 
                                onClick={handleCancel}
                              />
                            </Tooltip>
                          </Space>
                        ) : (
                          <>
                            <Tooltip title="编辑快捷键">
                              <Button 
                                size="small" 
                                icon={<EditOutlined style={{ fontSize: 14 }} />} 
                                onClick={() => handleEditStart(item.key)}
                              />
                            </Tooltip>
                            <Tooltip title="重置为默认">
                              <Button 
                                size="small" 
                                icon={<RotateLeftOutlined style={{ fontSize: 14 }} />} 
                                onClick={() => handleResetSingle(item.key)}
                              />
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </Space>

      {isRecording && (
        <div style={{ 
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '24px 32px',
          background: 'var(--theme-card)',
          border: '2px solid var(--theme-primary)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{ color: 'var(--theme-primary)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            请按下新的快捷键组合
          </div>
          <div style={{ color: 'var(--theme-text-secondary)', fontSize: 14 }}>
            按任意键或组合键完成录制
          </div>
        </div>
      )}
    </div>
  )
}