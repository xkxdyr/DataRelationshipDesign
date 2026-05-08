import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Space, Slider, Switch, Divider, Select, message } from 'antd'
import { SettingOutlined, UndoOutlined, RedoOutlined, SaveOutlined } from '@ant-design/icons'
import { localStorageService } from '../services/localStorageService'

interface LayoutConfig {
  leftPanelWidth: number
  rightPanelWidth: number
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  showMiniMap: boolean
  snapToGrid: boolean
  gridSize: number
  autoSaveInterval: number
}

interface LayoutPreset {
  id: string
  name: string
  config: LayoutConfig
}

interface LayoutSettingsModalProps {
  visible: boolean
  onClose: () => void
  onApplyLayout: (config: LayoutConfig) => void
  currentConfig: LayoutConfig
}

const DEFAULT_CONFIG: LayoutConfig = {
  leftPanelWidth: 350,
  rightPanelWidth: 900,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  showMiniMap: true,
  snapToGrid: true,
  gridSize: 20,
  autoSaveInterval: 30000
}

const DEFAULT_PRESETS: LayoutPreset[] = [
  {
    id: 'default',
    name: '默认布局',
    config: DEFAULT_CONFIG
  },
  {
    id: 'focus',
    name: '专注模式',
    config: {
      ...DEFAULT_CONFIG,
      leftPanelCollapsed: true,
      rightPanelCollapsed: true
    }
  },
  {
    id: 'wide-right',
    name: '宽右侧面板',
    config: {
      ...DEFAULT_CONFIG,
      leftPanelWidth: 280,
      rightPanelWidth: 1000
    }
  },
  {
    id: 'balanced',
    name: '均衡布局',
    config: {
      ...DEFAULT_CONFIG,
      leftPanelWidth: 300,
      rightPanelWidth: 600
    }
  }
]

const LayoutSettingsModal: React.FC<LayoutSettingsModalProps> = ({
  visible,
  onClose,
  onApplyLayout,
  currentConfig
}) => {
  const [config, setConfig] = useState<LayoutConfig>(currentConfig)
  const [presets, setPresets] = useState<LayoutPreset[]>(DEFAULT_PRESETS)
  const [activePresetId, setActivePresetId] = useState<string>('default')

  useEffect(() => {
    loadPresets()
  }, [])

  useEffect(() => {
    setConfig(currentConfig)
  }, [currentConfig])

  const loadPresets = async () => {
    try {
      const savedPresets = await localStorageService.getMeta<LayoutPreset[]>('layoutPresets')
      if (savedPresets && savedPresets.length > 0) {
        setPresets([...DEFAULT_PRESETS, ...savedPresets])
      }
    } catch (error) {
      console.error('Failed to load layout presets:', error)
    }
  }

  const savePreset = async (name: string) => {
    const newPreset: LayoutPreset = {
      id: `custom_${Date.now()}`,
      name,
      config
    }
    const updatedPresets = [...presets.filter(p => !DEFAULT_PRESETS.find(dp => dp.id === p.id)), newPreset]
    setPresets(updatedPresets)
    await localStorageService.setMeta('layoutPresets', updatedPresets)
    setActivePresetId(newPreset.id)
    message.success('布局预设已保存')
  }

  const applyPreset = (preset: LayoutPreset) => {
    setConfig(preset.config)
    setActivePresetId(preset.id)
    onApplyLayout(preset.config)
    message.success(`已应用: ${preset.name}`)
  }

  const handleApply = () => {
    onApplyLayout(config)
    message.success('布局设置已应用')
    onClose()
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setActivePresetId('default')
  }

  const updateConfig = (key: keyof LayoutConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setActivePresetId('custom')
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>布局设置</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={
        <Space>
          <Button onClick={handleReset} icon={<UndoOutlined />}>
            重置
          </Button>
          <Button onClick={onClose}>
            取消
          </Button>
          <Button type="primary" onClick={handleApply} icon={<SaveOutlined />}>
            应用
          </Button>
        </Space>
      }
    >
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>布局预设</h4>
        <div style={styles.presetGrid}>
          {presets.map(preset => (
            <Button
              key={preset.id}
              type={activePresetId === preset.id ? 'primary' : 'default'}
              onClick={() => applyPreset(preset)}
              style={styles.presetButton}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      <Divider />

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>面板尺寸</h4>
        
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>左侧面板宽度</span>
          <Slider
            min={200}
            max={500}
            value={config.leftPanelWidth}
            onChange={value => updateConfig('leftPanelWidth', value)}
            style={{ flex: 1 }}
            disabled={config.leftPanelCollapsed}
          />
          <span style={styles.sliderValue}>{config.leftPanelWidth}px</span>
        </div>

        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>右侧面板宽度</span>
          <Slider
            min={400}
            max={1200}
            value={config.rightPanelWidth}
            onChange={value => updateConfig('rightPanelWidth', value)}
            style={{ flex: 1 }}
            disabled={config.rightPanelCollapsed}
          />
          <span style={styles.sliderValue}>{config.rightPanelWidth}px</span>
        </div>
      </div>

      <Divider />

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>面板折叠</h4>
        
        <div style={styles.switchRow}>
          <span style={styles.switchLabel}>折叠左侧面板</span>
          <Switch
            checked={config.leftPanelCollapsed}
            onChange={checked => updateConfig('leftPanelCollapsed', checked)}
          />
        </div>

        <div style={styles.switchRow}>
          <span style={styles.switchLabel}>折叠右侧面板</span>
          <Switch
            checked={config.rightPanelCollapsed}
            onChange={checked => updateConfig('rightPanelCollapsed', checked)}
          />
        </div>
      </div>

      <Divider />

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>画布设置</h4>
        
        <div style={styles.switchRow}>
          <span style={styles.switchLabel}>显示小地图</span>
          <Switch
            checked={config.showMiniMap}
            onChange={checked => updateConfig('showMiniMap', checked)}
          />
        </div>

        <div style={styles.switchRow}>
          <span style={styles.switchLabel}>网格吸附</span>
          <Switch
            checked={config.snapToGrid}
            onChange={checked => updateConfig('snapToGrid', checked)}
          />
        </div>

        {config.snapToGrid && (
          <div style={styles.sliderRow}>
            <span style={styles.sliderLabel}>网格大小</span>
            <Slider
              min={10}
              max={50}
              step={5}
              value={config.gridSize}
              onChange={value => updateConfig('gridSize', value)}
              style={{ flex: 1 }}
            />
            <span style={styles.sliderValue}>{config.gridSize}px</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  presetButton: {
    width: '100%',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sliderLabel: {
    width: 100,
    fontSize: 13,
    color: '#666',
  },
  sliderValue: {
    width: 50,
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 13,
    color: '#666',
  },
}

export default LayoutSettingsModal
