import React, { useState } from 'react'
import { Form, Input, Button, Typography, message, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

const { Title, Text, Link } = Typography

interface LoginFormValues {
  username: string
  password: string
}

interface RegisterFormValues {
  username: string
  email: string
  password: string
  displayName?: string
}

const LoginPage: React.FC = () => {
  const { login, register, authLoading } = useAppStore()
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login')

  const onLoginFinish = async (values: LoginFormValues) => {
    try {
      const result = await login(values)
      if (result.success) {
        message.success('登录成功！')
      } else {
        message.error(result.message || '登录失败')
      }
    } catch (error) {
      message.error('登录发生错误')
    }
  }

  const onRegisterFinish = async (values: RegisterFormValues) => {
    try {
      const result = await register(values)
      if (result.success) {
        message.success('注册成功！')
        // 注册成功后会自动设置 currentUser，不需要再切换到登录视图
      } else {
        message.error(result.message || '注册失败')
      }
    } catch (error) {
      message.error('注册发生错误')
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'stretch',
      overflow: 'hidden',
      backgroundColor: '#f6f8fa'
    }}>
      {/* 左侧品牌区域 */}
      <div style={{ 
        flex: 1,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        color: 'white'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <img 
            src="/数据库可视化设计工具图标生成.png"
            alt="Logo"
            style={{ 
              width: '120px', 
              height: '120px',
              borderRadius: '24px',
              objectFit: 'contain',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          />
        </div>
        <Title level={2} style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>
          数据库可视化设计工具
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', textAlign: 'center', maxWidth: '400px' }}>
          专业的数据库设计与团队协作平台
        </Text>
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            已服务超过1000+团队和开发者
          </Text>
        </div>
      </div>

      {/* 右侧登录注册区域 - 更紧凑 */}
      <div style={{ 
        width: '380px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto'
      }}>
        {/* 视图切换 */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <Space size="middle">
            <span 
              style={{ 
                fontSize: '18px', 
                fontWeight: viewMode === 'login' ? 600 : 400,
                color: viewMode === 'login' ? '#1f2328' : '#8d949e',
                cursor: 'pointer',
                paddingBottom: '4px',
                borderBottom: viewMode === 'login' ? '2px solid #667eea' : '2px solid transparent'
              }}
              onClick={() => setViewMode('login')}
            >
              登录
            </span>
            <span 
              style={{ 
                fontSize: '18px', 
                fontWeight: viewMode === 'register' ? 600 : 400,
                color: viewMode === 'register' ? '#1f2328' : '#8d949e',
                cursor: 'pointer',
                paddingBottom: '4px',
                borderBottom: viewMode === 'register' ? '2px solid #667eea' : '2px solid transparent'
              }}
              onClick={() => setViewMode('register')}
            >
              注册
            </span>
          </Space>
        </div>

        {viewMode === 'login' ? (
          /* 登录表单 */
          <div>
            <Form
              name="login"
              onFinish={onLoginFinish}
              autoComplete="off"
              layout="vertical"
              size="middle"
            >
              <Form.Item
                name="username"
                label="用户名或邮箱"
                rules={[{ required: true, message: '请输入用户名或邮箱！' }]}
                style={{ marginBottom: '12px' }}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#8d949e' }} />} 
                  placeholder="请输入用户名或邮箱"
                  style={{ 
                    borderRadius: '6px',
                    padding: '7px 11px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码！' }]}
                extra={<Link style={{ fontSize: '11px' }}>忘记密码？</Link>}
                style={{ marginBottom: '12px' }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#8d949e' }} />}
                  placeholder="请输入密码"
                  style={{ 
                    borderRadius: '6px',
                    padding: '7px 11px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '16px', marginBottom: '12px' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block
                  loading={authLoading}
                  size="middle"
                  style={{ 
                    height: '36px',
                    borderRadius: '6px',
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: '#6b7280', fontSize: '13px' }}>
                还没有账号？ 
                <Link 
                  style={{ fontWeight: 500, color: '#667eea', fontSize: '13px' }}
                  onClick={() => setViewMode('register')}
                >
                  立即注册
                </Link>
              </Text>
            </div>
          </div>
        ) : (
          /* 注册表单 - 更紧凑 */
          <div>
            <Form
              name="register"
              onFinish={onRegisterFinish}
              autoComplete="off"
              layout="vertical"
              size="middle"
            >
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名！' },
                  { min: 3, message: '用户名至少需要3个字符！' }
                ]}
                style={{ marginBottom: '12px' }}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#8d949e' }} />} 
                  placeholder="请输入用户名"
                  style={{ 
                    borderRadius: '6px',
                    padding: '7px 11px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱！' },
                  { type: 'email', message: '请输入有效的邮箱地址！' }
                ]}
                style={{ marginBottom: '12px' }}
              >
                <Input 
                  prefix={<MailOutlined style={{ color: '#8d949e' }} />} 
                  placeholder="请输入邮箱地址"
                  style={{ 
                    borderRadius: '6px',
                    padding: '7px 11px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码！' },
                  { min: 6, message: '密码至少需要6个字符！' }
                ]}
                style={{ marginBottom: '12px' }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#8d949e' }} />}
                  placeholder="请输入密码（至少6位）"
                  style={{ 
                    borderRadius: '6px',
                    padding: '7px 11px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码！' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致！'))
                    },
                  }),
                ]}
                style={{ marginBottom: '12px' }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#8d949e' }} />}
                  placeholder="请再次输入密码"
                  style={{ 
                    borderRadius: '6px',
                    padding: '7px 11px',
                    border: '1px solid #d1d5db'
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '16px', marginBottom: '12px' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block
                  loading={authLoading}
                  size="middle"
                  style={{ 
                    height: '36px',
                    borderRadius: '6px',
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  创建账号
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: '#6b7280', fontSize: '13px' }}>
                已有账号？ 
                <Link 
                  style={{ fontWeight: 500, color: '#667eea', fontSize: '13px' }}
                  onClick={() => setViewMode('login')}
                >
                  立即登录
                </Link>
              </Text>
            </div>
          </div>
        )}

        {/* 底部链接 - 更紧凑 */}
        <div style={{ 
          marginTop: '16px', 
          paddingTop: '12px', 
          borderTop: '1px solid #e5e7eb'
        }}>
          <Space size="small" style={{ width: '100%', justifyContent: 'center' }}>
            <Link style={{ color: '#9ca3af', fontSize: '11px' }}>使用条款</Link>
            <Link style={{ color: '#9ca3af', fontSize: '11px' }}>隐私政策</Link>
            <Link style={{ color: '#9ca3af', fontSize: '11px' }}>帮助文档</Link>
          </Space>
          <div style={{ 
            marginTop: '8px', 
            textAlign: 'center', 
            color: '#9ca3af', 
            fontSize: '10px'
          }}>
            © 2026 DataRelationshipDesign. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
