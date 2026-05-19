import React, { useEffect } from 'react'
import { Form, Input, Select, Button, message, Radio, Space, Typography } from 'antd'
import { PlusOutlined, XOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { teamApi, Team } from '../services/api'

const { Title } = Typography
const { Option } = Select

interface CreateProjectTabProps {
  onClose?: () => void
}

export const CreateProjectTab: React.FC<CreateProjectTabProps> = ({ onClose }) => {
  const [form] = Form.useForm()
  const { createProject, projects, isAuthenticated, closeTab, openTabs } = useAppStore()
  const [teams, setTeams] = React.useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = React.useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      loadTeams()
    }
  }, [isAuthenticated])

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const response = await teamApi.getAllTeams()
      if (response.success && response.data) {
        setTeams(response.data)
      }
    } catch (error) {
      console.error('加载团队列表失败:', error)
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleCreate = async (values: any) => {
    try {
      const projectData: any = {
        name: values.name,
        description: values.description || '',
        databaseType: values.databaseType || 'MYSQL',
        storageLocation: values.storageLocation || 'cloud',
        isTeamProject: values.isTeamProject,
        teamId: values.teamId
      }

      if (values.storageLocation === 'local') {
        projectData.id = `local_${Date.now()}`
        projectData.createdBy = 'local'
      }

      await createProject(projectData)
      
      message.success('项目创建成功')
      
      // 关闭创建项目标签页
      const createTab = openTabs.find(tab => tab.type === 'createProject')
      if (createTab && onClose) {
        closeTab(createTab.id)
      }
    } catch (error) {
      message.error('项目创建失败: ' + (error as Error).message)
    }
  }

  const handleClose = () => {
    if (onClose) {
      const createTab = openTabs.find(tab => tab.type === 'createProject')
      if (createTab) {
        closeTab(createTab.id)
      }
      onClose()
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusOutlined />
          创建新项目
        </Title>
        {onClose && (
          <Button
            type="text"
            icon={<XOutlined />}
            onClick={handleClose}
          >
            关闭
          </Button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          style={{ maxWidth: 500, margin: '0 auto' }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { pattern: /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_\s-]*$/, message: '项目名只能包含中文、字母、数字、下划线、空格和连字符，必须以中文、字母或下划线开头' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && projects.some(p => p.name.toLowerCase() === value.toLowerCase())) {
                    return Promise.reject(new Error('该项目名已存在'))
                  }
                  return Promise.resolve()
                }
              })
            ]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="项目描述"
          >
            <Input.TextArea placeholder="请输入项目描述" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="databaseType"
            label="数据库类型"
            initialValue="MYSQL"
          >
            <Select>
              <Option value="MYSQL">MySQL</Option>
              <Option value="POSTGRESQL">PostgreSQL</Option>
              <Option value="SQLITE">SQLite</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="storageLocation"
            label="项目位置"
            initialValue={isAuthenticated ? 'cloud' : 'local'}
            rules={[{ required: true, message: '请选择项目位置' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="cloud" disabled={!isAuthenticated}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>☁️ 云端项目</span>
                    {!isAuthenticated && <span style={{ color: '#999', fontSize: 12 }}>（需要登录）</span>}
                  </span>
                </Radio>
                <Radio value="local">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📁 本地项目</span>
                    <span style={{ color: '#999', fontSize: 12 }}>（仅存储在当前浏览器）</span>
                  </span>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="isTeamProject"
            label="项目类型"
            initialValue={false}
            dependencies={['storageLocation']}
          >
            <Radio.Group
              disabled={form.getFieldValue('storageLocation') === 'local'}
              onChange={() => {
                if (!form.getFieldValue('isTeamProject')) {
                  form.setFieldValue('teamId', undefined)
                }
              }}
            >
              <Space direction="vertical">
                <Radio value={false}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>👤 个人项目</span>
                    {form.getFieldValue('storageLocation') === 'cloud' && (
                      <span style={{ color: '#999', fontSize: 12 }}>（仅您可管理）</span>
                    )}
                    {form.getFieldValue('storageLocation') === 'local' && (
                      <span style={{ color: '#999', fontSize: 12 }}>（仅存储在当前浏览器）</span>
                    )}
                  </span>
                </Radio>
                <Radio value={true} disabled={!isAuthenticated || form.getFieldValue('storageLocation') === 'local'}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>👥 团队项目</span>
                    {form.getFieldValue('storageLocation') === 'cloud' && (
                      <span style={{ color: '#999', fontSize: 12 }}>（团队成员均可访问）</span>
                    )}
                    {form.getFieldValue('storageLocation') === 'local' && (
                      <span style={{ color: '#999', fontSize: 12 }}>（本地项目不支持）</span>
                    )}
                    {!isAuthenticated && (
                      <span style={{ color: '#999', fontSize: 12 }}>（需要登录）</span>
                    )}
                  </span>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="teamId"
            label="选择团队"
            dependencies={['isTeamProject', 'storageLocation']}
            rules={[{
              validator(_, value) {
                const isTeamProject = form.getFieldValue('isTeamProject')
                const storageLocation = form.getFieldValue('storageLocation')
                if (isTeamProject && storageLocation === 'cloud' && !value) {
                  return Promise.reject(new Error('请选择团队'))
                }
                return Promise.resolve()
              }
            }]}
          >
            <Select 
              placeholder="请选择团队"
              disabled={!form.getFieldValue('isTeamProject') || form.getFieldValue('storageLocation') !== 'cloud'}
              loading={loadingTeams}
            >
              {teams.map(team => (
                <Option key={team.id} value={team.id}>
                  {team.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button onClick={handleClose}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default CreateProjectTab
