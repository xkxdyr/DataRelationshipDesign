import React, { useState } from 'react'
import { Modal, Form, Input, Button, Tabs, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

const { Title, Text } = Typography

interface AuthModalProps {
  visible: boolean
  onClose: () => void
}

type AuthMode = 'login' | 'register'

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login')
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const { login, register, authLoading } = useAppStore()

  const handleLogin = async (values: any) => {
    const result = await login({
      username: values.username,
      password: values.password,
    })
    if (result.success) {
      message.success('登录成功')
      onClose()
    } else {
      message.error(result.message || '登录失败')
    }
  }

  const handleRegister = async (values: any) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    const result = await register({
      username: values.username,
      email: values.email,
      password: values.password,
      displayName: values.displayName,
    })
    if (result.success) {
      message.success('注册成功')
      onClose()
    } else {
      message.error(result.message || '注册失败')
    }
  }

  const resetState = () => {
    setMode('login')
  }

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <div style={{ padding: '16px 0' }}>
          <Form
            form={loginForm}
            layout="vertical"
            onFinish={handleLogin}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={authLoading}
                icon={<LoginOutlined />}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <div style={{ padding: '16px 0' }}>
          <Form
            form={registerForm}
            layout="vertical"
            onFinish={handleRegister}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="昵称（可选）"
              name="displayName"
            >
              <Input
                placeholder="请输入昵称"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="确认密码"
              name="confirmPassword"
              rules={[{ required: true, message: '请确认密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={authLoading}
                icon={<UserAddOutlined />}
              >
                注册
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
  ]

  return (
    <Modal
      title={mode === 'login' ? (
        <><LoginOutlined style={{ marginRight: 8 }} />用户登录</>
      ) : (
        <><UserAddOutlined style={{ marginRight: 8 }} />用户注册</>
      )}
      open={visible}
      onCancel={() => {
        resetState()
        onClose()
      }}
      footer={null}
      width={480}
    >
      <div style={{ padding: '16px 0' }}>
        <Tabs
          activeKey={mode}
          onChange={(key) => setMode(key as AuthMode)}
          centered
          items={tabItems}
        />
      </div>
    </Modal>
  )
}
