import React, { useState } from 'react'
import { Modal, Slider, Button, Space, Typography, Tag, Switch, Card, Row, Col, Input, Tree, TreeDataNode } from 'antd'
import { SettingOutlined, FontSizeOutlined, BgColorsOutlined, CompressOutlined, AimOutlined, ThunderboltOutlined, LinkOutlined, SaveOutlined, SwapOutlined, RobotOutlined, PaletteOutlined, EyeOutlined, DatabaseOutlined, KeyboardOutlined, SparklesOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

const { Title, Text } = Typography

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
  onOpenTypeConvert?: () => void
  onOpenLLM?: () => void
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
    icon: <PaletteOutlined style={{ fontSize: 14 }} />,
    children: [
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
      { title: '小地图', key: 'minimap', icon: <SparklesOutlined style={{ fontSize: 12 }} /> },
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
    icon: <KeyboardOutlined style={{ fontSize: 14 }} />,
  },
  {
    title: '工具',
    key: 'tools',
    icon: <DatabaseOutlined style={{ fontSize: 14 }} />,
    children: [
      { title: '数据库转换', key: 'type-convert', icon: <SwapOutlined style={{ fontSize: 12 }} /> },
      { title: 'AI 助手', key: 'ai-assistant', icon: <RobotOutlined style={{ fontSize: 12 }} /> },
    ],
  },
]

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, onOpenTypeConvert, onOpenLLM }) => {
  const [selectedKey, setSelectedKey] = useState('appearance')
  const [searchValue, setSearchValue] = useState('')

  const fontSize = useAppStore(state => state.fontSize)
  const setFontSize = useAppStore(state => state.setFontSize)
  const themeColor = useAppStore(state => state.themeColor)
  const setThemeColor = useAppStore(state => state.setThemeColor)
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

  const handleReset = () => {
    setFontSize(14)
    setThemeColor('#1890ff')
    setCompactMode(false)
    setCanvasZoom(1)
    setShowMiniMap(true)
    setAutoSaveInterval(30000)
    setEdgeStyle('smooth')
    setShowEdgeLabels(true)
  }

  const formatInterval = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${ms / 1000}秒`
    return `${ms / 60000}分钟`
  }

  const renderContent = () => {
    switch (selectedKey) {
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
                    <Tag color="blue">N</Tag>
                  </Space>
                  <Text type="secondary">新建表</Text>
                </div>
              </Col>
            </Row>
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

      default:
        return (
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Text type="secondary">请选择左侧的设置项</Text>
          </div>
        )
    }
  }

  const onTreeSelect = (selectedKeys: string[]) => {
    if (selectedKeys.length > 0) {
      setSelectedKey(selectedKeys[0])
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
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ display: 'flex', height: 500 }}>
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
