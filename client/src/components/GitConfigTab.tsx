import { useState, useEffect } from 'react'
import { Form, Input, Switch, Button, Space, Spin, message, Alert, Typography } from 'antd'
import { GithubOutlined, SaveOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import { gitConfigApi, GitConfigInfo } from '../services/api'

const { Text } = Typography

interface GitConfigTabProps {
  projectId: string
}

export default function GitConfigTab({ projectId }: GitConfigTabProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<GitConfigInfo | null>(null)

  useEffect(() => {
    if (projectId) {
      loadConfig()
    }
  }, [projectId])

  const loadConfig = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await gitConfigApi.get(projectId)
      if (res.success) {
        setConfig(res.data || null)
        if (res.data) {
          form.setFieldsValue({
            enabled: res.data.enabled,
            repositoryUrl: res.data.repositoryUrl,
            branch: res.data.branch,
            username: res.data.username,
            token: res.data.token,
            sshKeyPath: res.data.sshKeyPath,
            autoCommit: res.data.autoCommit,
            autoPush: res.data.autoPush,
            commitMessageTemplate: res.data.commitMessageTemplate
          })
        } else {
          form.resetFields()
        }
      }
    } catch {
      message.error('加载 Git 配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!projectId) return
    try {
      const values = await form.validateFields()
      setSaving(true)
      const res = await gitConfigApi.upsert(projectId, values)
      if (res.success && res.data) {
        setConfig(res.data)
        message.success('Git 配置已保存')
      }
    } catch {
      message.error('保存 Git 配置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!projectId) return
    try {
      const res = await gitConfigApi.remove(projectId)
      if (res.success) {
        setConfig(null)
        form.resetFields()
        message.success('Git 配置已删除')
      }
    } catch {
      message.error('删除 Git 配置失败')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <GithubOutlined style={{ fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Git 配置集成</span>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="配置 Git 仓库可将项目设计自动提交到版本控制系统。创建版本时如开启自动提交，将执行 git add/commit/push 操作。"
      />

      <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: false,
          branch: 'main',
          autoCommit: false,
          autoPush: false,
          commitMessageTemplate: 'Update: {{version}}'
        }}
        disabled={loading}
      >
        <Form.Item name="enabled" label="启用 Git 集成" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          name="repositoryUrl"
          label="仓库地址"
          rules={[{ type: 'url', message: '请输入有效的 URL' }]}
        >
          <Input placeholder="https://github.com/user/repo.git" prefix={<LinkOutlined />} />
        </Form.Item>

        <Form.Item name="branch" label="默认分支">
          <Input placeholder="main" />
        </Form.Item>

        <Form.Item name="username" label="用户名">
          <Input placeholder="Git 用户名" />
        </Form.Item>

        <Form.Item name="token" label="访问令牌 / 密码">
          <Input.Password placeholder="个人访问令牌" />
        </Form.Item>

        <Form.Item name="sshKeyPath" label="SSH 密钥路径">
          <Input placeholder="~/.ssh/id_rsa" />
        </Form.Item>

        <Form.Item name="autoCommit" label="版本创建时自动提交" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="autoPush" label="自动推送到远程" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          name="commitMessageTemplate"
          label="提交信息模板"
        >
          <Input placeholder="Update: {{version}}" />
        </Form.Item>
        <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16 }}>
          可用变量: {'{{version}}'}, {'{{projectName}}'}, {'{{timestamp}}'}
        </Text>
      </Form>

      {config && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              当前状态：<strong>{config.enabled ? '已启用' : '已禁用'}</strong>
              {config.repositoryUrl && <span> | 仓库：{config.repositoryUrl}</span>}
            </span>
          }
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button danger icon={<DeleteOutlined />} onClick={handleRemove} disabled={!config}>
          删除配置
        </Button>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            保存配置
          </Button>
        </Space>
      </div>
    </Spin>
    </div>
  )
}