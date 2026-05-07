import React, { useState } from 'react'
import { Modal, Slider, Button, Space, Typography, Tag, Switch, Card, Row, Col, Input, Tree, TreeDataNode, Select, Timeline, Badge, Tooltip } from 'antd'
import type { Key } from 'react'
import { SettingOutlined, FontSizeOutlined, BgColorsOutlined, CompressOutlined, AimOutlined, ThunderboltOutlined, LinkOutlined, SaveOutlined, SwapOutlined, RobotOutlined, AppstoreOutlined, EyeOutlined, DatabaseOutlined, KeyOutlined, StarOutlined, PlusOutlined, HistoryOutlined, BugOutlined, LockOutlined, PictureOutlined, RocketOutlined, ToolOutlined, TableOutlined, AlignLeftOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { useTheme } from '../theme/useTheme'
import { updateLogs, getChangeTypeLabel, getChangeTypeColor } from '../data/updateLogs'

const { Title, Text } = Typography

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
  onOpenTypeConvert?: () => void
  onOpenLLM?: () => void
  onOpenConnections?: () => void
}

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
      { title: '主题', key: 'theme', icon: <AppstoreOutlined style={{ fontSize: 12 }} /> },
      { title: '字体大小', key: 'font-size', icon: <FontSizeOutlined style={{ fontSize: 12 }} /> },
      { title: '主题颜色', key: 'theme-color', icon: <BgColorsOutlined style={{ fontSize: 12 }} /> },
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
      { title: '网格对齐', key: 'grid-align', icon: <TableOutlined style={{ fontSize: 12 }} /> },
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
    ],
  },
  {
    title: '更新日志',
    key: 'changelog',
    icon: <HistoryOutlined style={{ fontSize: 14 }} />,
  },
]

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, onOpenTypeConvert, onOpenLLM, onOpenConnections }) => {
  const [selectedKey, setSelectedKey] = useState('appearance')
  const [searchValue, setSearchValue] = useState('')

  const { theme, themeOptions, setTheme } = useTheme()
  const fontSize = useAppStore(state => state.fontSize)
  const setFontSize = useAppStore(state => state.setFontSize)
  const themeColor = useAppStore(state => state.themeColor)
  const setThemeColor = useAppStore(state => state.setThemeColor)
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
  const snapToGrid = useAppStore(state => state.snapToGrid)
  const setSnapToGrid = useAppStore(state => state.setSnapToGrid)
  const gridSize = useAppStore(state => state.gridSize)
  const setGridSize = useAppStore(state => state.setGridSize)
  const showGuides = useAppStore(state => state.showGuides)
  const setShowGuides = useAppStore(state => state.setShowGuides)
  const canvasBackground = useAppStore(state => state.canvasBackground)
  const setCanvasBackground = useAppStore(state => state.setCanvasBackground)

  const handleReset = () => {
    setFontSize(14)
    setThemeColor('#1890ff')
    setThemeMode('light')
    setCompactMode(false)
    setCanvasZoom(1)
    setShowMiniMap(true)
    setAutoSaveInterval(30000)
    setEdgeStyle('smooth')
    setShowEdgeLabels(true)
    setTablePrefix('')
    setSnapToGrid(true)
    setGridSize(20)
    setShowGuides(true)
    setAutoAddIdColumn(true)
  }

  const formatInterval = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${ms / 1000}秒`
    return `${ms / 60000}分钟`
  }

  const renderContent = () => {
    switch (selectedKey) {
      case 'theme':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>主题</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>选择界面的颜色主题</Text>
            <Select
              style={{ width: '100%', marginBottom: 16 }}
              value={theme.id}
              onChange={(value) => setTheme(value)}
              options={themeOptions}
              size="large"
            />
            <div style={{ 
              padding: '16px', 
              background: theme.colors.backgroundSecondary, 
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 8,
              marginTop: 16
            }}>
              <Text strong style={{ color: theme.colors.text }}>主题预览</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag style={{ background: theme.colors.primary, color: '#fff', border: 'none' }}>主色</Tag>
                <Tag style={{ background: theme.colors.success, color: '#fff', border: 'none' }}>成功</Tag>
                <Tag style={{ background: theme.colors.warning, color: '#fff', border: 'none' }}>警告</Tag>
                <Tag style={{ background: theme.colors.error, color: '#fff', border: 'none' }}>错误</Tag>
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
              value={fontSize}
              onChange={setFontSize}
              marks={{
                10: '10',
                14: '14',
                20: '20'
              }}
            />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Tag color="blue" style={{ fontSize: fontSize }}>{fontSize}px</Tag>
            </div>
          </div>
        )

      case 'theme-color':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>主题颜色</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>选择界面主题颜色</Text>
            <Space size="middle" wrap>
              {themeColors.map((color) => (
                <Button
                  key={color.value}
                  type={themeColor === color.value ? 'primary' : 'default'}
                  onClick={() => setThemeColor(color.value)}
                  style={{
                    backgroundColor: color.value,
                    borderColor: color.value,
                    color: '#fff',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    padding: 0,
                  }}
                >
                  {themeColor === color.value && '✓'}
                </Button>
              ))}
            </Space>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">当前主题颜色</Text>
              <Tag color={themeColor} style={{ marginLeft: 8 }}>{themeColor}</Tag>
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
            </Space>
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

      case 'grid-align':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              <Space>
                <TableOutlined />
                网格对齐
              </Space>
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              拖拽表节点时自动对齐到网格
            </Text>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <Text strong>启用网格对齐</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>拖拽时自动对齐到网格点</Text>
              </div>
              <Switch checked={snapToGrid} onChange={setSnapToGrid} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <Text strong>显示辅助线</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>在画布上显示网格辅助线</Text>
              </div>
              <Switch checked={showGuides} onChange={setShowGuides} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>网格大小</Text>
              <Slider
                min={10}
                max={50}
                value={gridSize}
                onChange={setGridSize}
                marks={{
                  10: '10px',
                  20: '20px',
                  30: '30px',
                  50: '50px'
                }}
                disabled={!snapToGrid && !showGuides}
              />
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Tag color="blue">{gridSize}px</Tag>
              </div>
            </div>

            <Card size="small" style={{ marginTop: 16, background: '#fafafa' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>提示：</strong>较小的网格适合精细调整，较大的网格适合快速布局。
              </Text>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <div>
                <Text strong>画布背景颜色</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>选择画布背景颜色</Text>
              </div>
              <Space>
                <Tooltip title="浅灰色">
                  <Button
                    shape="circle"
                    size="small"
                    style={{ background: '#fafafa', border: canvasBackground === '#fafafa' ? '2px solid #1890ff' : '1px solid #d9d9d9' }}
                    onClick={() => setCanvasBackground('#fafafa')}
                  />
                </Tooltip>
                <Tooltip title="白色">
                  <Button
                    shape="circle"
                    size="small"
                    style={{ background: '#ffffff', border: canvasBackground === '#ffffff' ? '2px solid #1890ff' : '1px solid #d9d9d9' }}
                    onClick={() => setCanvasBackground('#ffffff')}
                  />
                </Tooltip>
                <Tooltip title="深灰色">
                  <Button
                    shape="circle"
                    size="small"
                    style={{ background: '#2d2d2d', border: canvasBackground === '#2d2d2d' ? '2px solid #1890ff' : '1px solid #d9d9d9' }}
                    onClick={() => setCanvasBackground('#2d2d2d')}
                  />
                </Tooltip>
                <Tooltip title="深色主题">
                  <Button
                    shape="circle"
                    size="small"
                    style={{ background: '#1a1a2e', border: canvasBackground === '#1a1a2e' ? '2px solid #1890ff' : '1px solid #d9d9d9' }}
                    onClick={() => setCanvasBackground('#1a1a2e')}
                  />
                </Tooltip>
              </Space>
            </div>
          </div>
        )

      case 'shortcuts':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>键盘快捷键</Title>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">Z</Tag>
                  </Space>
                  <Text type="secondary">撤销</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">Shift</Tag>
                    <span>+</span>
                    <Tag color="blue">Z</Tag>
                  </Space>
                  <Text type="secondary">重做</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">S</Tag>
                  </Space>
                  <Text type="secondary">保存</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">T</Tag>
                  </Space>
                  <Text type="secondary">新建表</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">,</Tag>
                  </Space>
                  <Text type="secondary">打开设置</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">Shift</Tag>
                    <span>+</span>
                    <Tag color="blue">E</Tag>
                  </Space>
                  <Text type="secondary">导入导出</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Delete</Tag>
                  </Space>
                  <Text type="secondary">删除选中表</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Esc</Tag>
                  </Space>
                  <Text type="secondary">关闭弹窗/取消选择</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">0</Tag>
                  </Space>
                  <Text type="secondary">重置缩放</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">+</Tag>
                  </Space>
                  <Text type="secondary">放大</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">-</Tag>
                  </Space>
                  <Text type="secondary">缩小</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">A</Tag>
                  </Space>
                  <Text type="secondary">全选</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">C</Tag>
                  </Space>
                  <Text type="secondary">复制</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">V</Tag>
                  </Space>
                  <Text type="secondary">粘贴</Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
                  <Space>
                    <Tag color="blue">Ctrl</Tag>
                    <span>+</span>
                    <Tag color="blue">F</Tag>
                  </Space>
                  <Text type="secondary">查找</Text>
                </div>
              </Col>
            </Row>
          </div>
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

      case 'changelog':
        return (
          <div style={{ padding: '16px' }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              <Space>
                <HistoryOutlined />
                更新日志
              </Space>
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              记录每一次功能更新和修复
            </Text>
            
            <Timeline mode="left">
              {updateLogs.map((log) => (
                <Timeline.Item 
                  key={log.date}
                  label={
                    <Space direction="vertical" style={{ minWidth: 100 }}>
                      <Badge color="blue" text={log.version} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{log.date}</Text>
                    </Space>
                  }
                >
                  <Card size="small" style={{ marginBottom: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {log.changes.map((change, index) => (
                        <div key={index} style={{ display: 'flex', gap: 12 }}>
                          <div style={{ flexShrink: 0 }}>
                            {change.type === 'feature' && <RocketOutlined style={{ color: '#52c41a', fontSize: 16 }} />}
                            {change.type === 'improvement' && <ToolOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
                            {change.type === 'bugfix' && <BugOutlined style={{ color: '#f5222d', fontSize: 16 }} />}
                            {change.type === 'security' && <LockOutlined style={{ color: '#722ed1', fontSize: 16 }} />}
                            {change.type === 'ui' && <PictureOutlined style={{ color: '#faad14', fontSize: 16 }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Text strong>{change.title}</Text>
                              <Tag color={getChangeTypeColor(change.type)} style={{ fontSize: 10 }}>
                                {getChangeTypeLabel(change.type)}
                              </Tag>
                            </div>
                            {change.description && (
                              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                                {change.description}
                              </Text>
                            )}
                          </div>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )

      default:
        return (
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text type="secondary">请选择左侧的设置项</Text>
          </div>
        )
    }
  }

  const onTreeSelect = (selectedKeys: Key[]) => {
    if (selectedKeys.length > 0) {
      setSelectedKey(selectedKeys[0] as string)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>设置</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={handleReset}>重置默认</Button>
          <Button type="primary" onClick={onClose}>
            完成
          </Button>
        </Space>
      }
      width={800}
      styles={{ 
        body: { 
          padding: 0,
          maxHeight: '70vh', 
          overflow: 'hidden' 
        } 
      }}
      maskClosable={true}
    >
      <div style={{ display: 'flex', height: '500px', maxHeight: 'calc(70vh - 100px)' }}>
        <div style={{ width: 220, borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column' }}>
          <Input
            placeholder="搜索设置..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ padding: '12px', borderBottom: '1px solid #e8e8e8' }}
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
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: '#fafafa' }}>
          {renderContent()}
        </div>
      </div>
    </Modal>
  )
}
