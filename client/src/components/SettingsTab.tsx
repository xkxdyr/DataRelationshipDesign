import React, { useState, useMemo, useCallback } from 'react'
import { Slider, Button, Space, Typography, Tag, Switch, Input, Tree, TreeDataNode, Select, Timeline, Divider, message } from 'antd'
import type { Key } from 'react'
import { SettingOutlined, FontSizeOutlined, BgColorsOutlined, CompressOutlined, AimOutlined, ThunderboltOutlined, LinkOutlined, SaveOutlined, SwapOutlined, RobotOutlined, AppstoreOutlined, EyeOutlined, DatabaseOutlined, KeyOutlined, StarOutlined, PlusOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useTheme } from '../theme/useTheme'
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
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>AI 助手</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>使用 AI 辅助生成表结构（可选功能）</Text>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => {
                onOpenLLM?.()
              }}
            >
              打开 AI 助手
            </Button>
            <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
              <strong>注意：</strong>此功能需要配置 OpenAI API 密钥，您可以选择不使用此功能。
            </Text>
          </div>
        )

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
          <div style={{ padding: '12px', borderBottom: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined />
            <span style={{ fontWeight: 500 }}>设置</span>
          </div>
          <Input
            placeholder="搜索设置..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ padding: '12px', borderBottom: `1px solid ${UI_COLORS.BORDER}` }}
            size="small"
          />
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
            <Tree
              treeData={treeData}
              defaultExpandAll
              selectedKeys={[selectedKey]}
              onSelect={onTreeSelect}
              style={{ padding: '0 8px' }}
              showIcon
            />
          </div>
          <div style={{ padding: '12px', borderTop: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', gap: 8 }}>
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