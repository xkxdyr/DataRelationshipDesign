import React, { useState } from 'react'
import { Modal, Button, Space, Typography, Input, Select, Card, Switch, Form, Popconfirm, message, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, RobotOutlined } from '@ant-design/icons'
import { ModelConfig } from '../types'
import { useAppStore } from '../stores/appStore'
import { llmApi } from '../services/api'

const { Title, Text } = Typography

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'qwen', label: '通义千问' },
  { value: 'chatglm', label: '智谱AI' },
  { value: 'custom', label: '自定义' }
]

const DEFAULT_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  chatglm: 'https://open.bigmodel.cn/api/paas/v4',
  custom: ''
}

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  chatglm: ['glm-4', 'glm-3-turbo']
}

export const ModelManager: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list')
  const [isAdding, setIsAdding] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null)
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [connectionTested, setConnectionTested] = useState(false)
  const [currentProvider, setCurrentProvider] = useState('openai')

  const { modelConfigs, activeModelId, loadModelConfigs, addModelConfig, updateModelConfig, deleteModelConfig, setActiveModel } = useAppStore()

  React.useEffect(() => {
    if (visible) {
      loadModelConfigs()
    }
  }, [visible, loadModelConfigs])

  const handleAddModel = () => {
    setEditingModel(null)
    setConnectionTested(false)
    setCurrentProvider('openai')
    form.resetFields()
    const initialValues = {
      isDefault: modelConfigs.length === 0,
      provider: 'openai',
      endpoint: DEFAULT_ENDPOINTS['openai'] || '',
      model: 'gpt-4'
    }
    form.setFieldsValue(JSON.parse(JSON.stringify(initialValues)))
    setIsAdding(true)
    setActiveTab('add')
  }

  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(JSON.parse(JSON.stringify(model)))
    setConnectionTested(false)
    setCurrentProvider(model.provider)
    const modelValues = {
      name: model.name || '',
      provider: model.provider || '',
      model: model.model || '',
      apiKey: model.apiKey || '',
      endpoint: model.endpoint || '',
      isDefault: !!model.isDefault
    }
    form.setFieldsValue(JSON.parse(JSON.stringify(modelValues)))
    setIsAdding(false)
    setActiveTab('add')
  }

  const handleProviderChange = (provider: string) => {
    try {
      setCurrentProvider(provider)
      const endpoint = DEFAULT_ENDPOINTS[provider] || ''
      form.setFieldValue('endpoint', typeof endpoint === 'string' ? endpoint : '')
      const suggestions = MODEL_SUGGESTIONS[provider]
      if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
        form.setFieldValue('model', typeof suggestions[0] === 'string' ? suggestions[0] : '')
      }
    } catch (e) {
      console.error('handleProviderChange error:', e)
    }
  }

  const handleTestConnection = async () => {
    const values = await form.validateFields()
    console.log('测试连接使用的参数:', values)
    setTestingConnection('adding')
    try {
      const response = await llmApi.testConnection(values.apiKey, values.endpoint, values.model)
      if (response.success) {
        message.success('连接成功！模型: ' + (response.result?.model || values.model))
        setConnectionTested(true)
      } else {
        message.error(response.error || '连接失败')
        setConnectionTested(false)
      }
    } catch (error) {
      message.error('连接测试失败: ' + (error as Error).message)
      setConnectionTested(false)
    } finally {
      setTestingConnection(null)
    }
  }

  const handleTestExistingConnection = async (model: ModelConfig) => {
    setTestingConnection(model.id)
    try {
      const response = await llmApi.testConnection(model.apiKey, model.endpoint, model.model)
      if (response.success) {
        message.success('连接成功！模型: ' + (response.result?.model || model.model))
      } else {
        message.error(response.error || '连接失败')
      }
    } catch (error) {
      message.error('连接测试失败: ' + (error as Error).message)
    } finally {
      setTestingConnection(null)
    }
  }

  const handleSave = async () => {
    if (!connectionTested && isAdding) {
      message.warning('请先测试连接确保配置正确')
      return
    }

    const values = await form.validateFields()
    console.log('保存时的完整数据:', values)
    try {
      if (isAdding) {
        await addModelConfig(values)
      } else if (editingModel) {
        await updateModelConfig(editingModel.id, values)
      }
      setActiveTab('list')
      await loadModelConfigs()
    } catch (error) {
      message.error('保存失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteModelConfig(id)
      await loadModelConfigs()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSetActive = async (model: ModelConfig) => {
    try {
      await setActiveModel(model.id)
      message.success('已切换到模型: ' + model.name)
    } catch (error) {
      message.error('切换失败')
    }
  }

  const handleBackToList = () => {
    setActiveTab('list')
    setConnectionTested(false)
  }

  return (
    <>
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name"><Input /></Form.Item>
          <Form.Item name="provider"><Input /></Form.Item>
          <Form.Item name="model"><Input /></Form.Item>
          <Form.Item name="apiKey"><Input /></Form.Item>
          <Form.Item name="endpoint"><Input /></Form.Item>
          <Form.Item name="isDefault" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </div>
      <Modal
        title={<Space><RobotOutlined /><span>AI模型管理</span></Space>}
        open={visible}
        onCancel={onClose}
        width={900}
        footer={null}
        destroyOnHidden
      >
        {activeTab === 'list' ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>已配置的模型 ({modelConfigs.length})</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddModel}>
              添加模型
            </Button>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {modelConfigs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>暂无配置的AI模型</div>
                <Text type="secondary">点击上方按钮添加您的第一个AI模型</Text>
              </div>
            ) : (
              modelConfigs.map((model) => (
                <Card
                  key={model.id}
                  size="small"
                  style={{
                    border: activeModelId === model.id ? '2px solid #1890ff' : '1px solid #e8e8e8'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Space direction="vertical" size="small">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Title level={5} style={{ margin: 0 }}>{model.name}</Title>
                          {model.isDefault && <Tag color="blue">默认</Tag>}
                          {activeModelId === model.id && <Tag color="green">使用中</Tag>}
                        </div>
                        <div style={{ display: 'flex', gap: 16, color: '#666', fontSize: 13 }}>
                          <span>提供商: {PROVIDERS.find(p => p.value === model.provider)?.label || model.provider}</span>
                          <span>模型: {model.model}</span>
                          {model.endpoint && <span>端点: {model.endpoint}</span>}
                        </div>
                      </Space>
                    </div>
                    <Space>
                      {activeModelId !== model.id && (
                        <Button size="small" onClick={() => handleSetActive(model)}>
                          设为使用
                        </Button>
                      )}
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleTestExistingConnection(model)}
                        loading={testingConnection === model.id}
                      >
                        测试连接
                      </Button>
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleEditModel(model)}>
                        编辑
                      </Button>
                      <Popconfirm
                        title="确定要删除这个模型吗？"
                        onConfirm={() => handleDelete(model.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Space>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button onClick={handleBackToList}>← 返回列表</Button>

          <Title level={5}>{isAdding ? '添加新模型' : '编辑模型'}</Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Form.Item
              name="name"
              label="配置名称"
              rules={[{ required: true, message: '请输入配置名称' }]}
            >
              <Input placeholder="给这个配置起个名字，例如：我的GPT-4" />
            </Form.Item>

            <Form.Item
              name="provider"
              label="模型提供商"
              rules={[{ required: true, message: '请选择模型提供商' }]}
            >
              <Select
                placeholder="选择模型提供商"
                onChange={handleProviderChange}
                options={PROVIDERS}
              />
            </Form.Item>

            <Form.Item
              name="model"
              label="模型名称"
              rules={[{ required: true, message: '请输入模型名称' }]}
              extra="输入模型名称，如 gpt-4o"
            >
              <Input placeholder="输入模型名称，如 gpt-4o" />
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API密钥"
              rules={[{ required: true, message: '请输入API密钥' }]}
            >
              <Input.Password placeholder="输入您的API密钥" />
            </Form.Item>

            <Form.Item
              name="endpoint"
              label="API端点"
              tooltip="留空将使用提供商的默认端点"
            >
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>

            <Form.Item
              name="isDefault"
              label="设为默认模型"
              valuePropName="checked"
              extra="默认模型会在添加新模型时自动选中"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  onClick={handleTestConnection}
                  loading={testingConnection === 'adding'}
                  icon={<CheckCircleOutlined />}
                >
                  测试连接
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  disabled={isAdding && !connectionTested}
                >
                  {isAdding ? '添加' : '保存'}
                </Button>
                <Button onClick={handleBackToList}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      )}
    </Modal>
    </>
  )
}
