import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Form, Input, Select, Button, message, Space, Typography, Card, Tag, Tooltip, Switch, Divider, Row, Col, Modal } from 'antd'
import { useAppStore } from '../stores/appStore'
import { Project } from '../types'
import { TeamOutlined, EditOutlined, XOutlined, DatabaseOutlined, CloudOutlined, SyncOutlined, ThunderboltOutlined, SwapOutlined } from '@ant-design/icons'

const { Title } = Typography
const { Option } = Select

interface EditProjectTabProps {
  projectId: string
  onClose?: () => void
}

interface TeamOption {
  id: string
  name: string
  role: string
}

const UI_COLORS = {
  GREEN: '#52c41a',
  GRAY: '#999',
  YELLOW: '#faad14',
}

interface CollaborationPanelProps {
  collaborationEnabled: boolean
  collaborationLoading: boolean
  activeCollaborators: number
  isAuthenticated: boolean | null
  onToggleCollaboration: (checked: boolean) => void
}

const CollaborationPanel = React.memo(({
  collaborationEnabled, collaborationLoading, activeCollaborators,
  isAuthenticated, onToggleCollaboration
}: CollaborationPanelProps) => (
  <div style={{ 
    padding: '16px', 
    backgroundColor: 'var(--theme-background-secondary)', 
    borderRadius: 8,
    marginBottom: 16 
  }}>
    <Row justify="space-between" align="middle">
      <Col>
        <Space align="center">
          <ThunderboltOutlined style={{ fontSize: 20, color: collaborationEnabled ? UI_COLORS.GREEN : UI_COLORS.GRAY }} />
          <div>
            <div style={{ fontWeight: 600 }}>实时协作模式</div>
            <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)' }}>
              {collaborationEnabled 
                ? '已开启，其他成员可以实时协作编辑' 
                : '未开启，只有项目所有者可以编辑'}
            </div>
          </div>
        </Space>
      </Col>
      <Col>
        {isAuthenticated === true ? (
          <Switch 
            checked={collaborationEnabled} 
            onChange={onToggleCollaboration}
            loading={collaborationLoading}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        ) : (
          <Tooltip title="请先登录">
            <Switch disabled checkedChildren="开启" unCheckedChildren="关闭" />
          </Tooltip>
        )}
      </Col>
    </Row>
    
    {collaborationEnabled && (
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        backgroundColor: `rgba(82, 196, 26, 0.1)`,
        borderRadius: 8,
        border: `1px solid rgba(82, 196, 26, 0.3)`
      }}>
        <Space size={8}>
          <SyncOutlined spin style={{ color: UI_COLORS.GREEN }} />
          <span style={{ color: UI_COLORS.GREEN, fontSize: 13 }}>
            实时协作已就绪，当前 {activeCollaborators} 人在线协作
          </span>
        </Space>
      </div>
    )}
  </div>
))

interface ConvertToTeamModalProps {
  open: boolean
  teamsLoading: boolean
  convertLoading: boolean
  userTeams: TeamOption[]
  selectedTeam: string
  onSelectTeam: (teamId: string) => void
  onCancel: () => void
  onConfirm: () => void
}

const ConvertToTeamModal = React.memo(({
  open, teamsLoading, convertLoading, userTeams, selectedTeam,
  onSelectTeam, onCancel, onConfirm
}: ConvertToTeamModalProps) => (
  <Modal
    title="转换为团队项目"
    open={open}
    onCancel={onCancel}
    footer={[
      <Button key="cancel" onClick={onCancel}>取消</Button>,
      <Button 
        key="confirm" 
        type="primary" 
        onClick={onConfirm}
        loading={convertLoading}
        disabled={!selectedTeam}
      >确认转换</Button>
    ]}
  >
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8, color: UI_COLORS.YELLOW }}>
        ⚠️ 注意：转换后项目所有权将转移给目标团队，不可撤销
      </div>
      <div style={{ color: 'var(--theme-text-secondary)', fontSize: 13 }}>
        团队项目优势：无协作人数限制、团队成员自动获得访问权限、统一团队管理
      </div>
    </div>
    
    <div style={{ marginBottom: 8 }}>选择目标团队：</div>
    {teamsLoading ? (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--theme-text-secondary)' }}>
        加载中...
      </div>
    ) : userTeams.length === 0 ? (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--theme-text-secondary)' }}>
        您没有可管理的团队，请先创建团队
      </div>
    ) : (
      <Select
        style={{ width: '100%' }}
        placeholder="选择目标团队"
        value={selectedTeam || undefined}
        onChange={onSelectTeam}
      >
        {userTeams.map(team => (
          <Option key={team.id} value={team.id}>
            {team.name}
            <Tag color="purple" style={{ marginLeft: 8 }}>{team.role}</Tag>
          </Option>
        ))}
      </Select>
    )}
  </Modal>
))

export const EditProjectTab: React.FC<EditProjectTabProps> = ({ projectId, onClose }) => {
  const [form] = Form.useForm()
  const { updateProject, projects, isAuthenticated, openMemberTab, closeTab, openTabs, selectProject, currentProject, refreshProjects } = useAppStore() as any
  const [loading, setLoading] = useState(false)
  const [collaborationEnabled, setCollaborationEnabled] = useState(false)
  const [collaborationLoading, setCollaborationLoading] = useState(false)
  const [activeCollaborators, setActiveCollaborators] = useState<number>(0)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [userTeams, setUserTeams] = useState<TeamOption[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [convertLoading, setConvertLoading] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(false)

  const project = currentProject?.id === projectId ? currentProject : (projects.find((p: Project) => p.id === projectId) || currentProject)

  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
        databaseType: project.databaseType
      })
      setCollaborationEnabled(project.collaborationEnabled || false)
    }
  }, [project?.id, project?.name, project?.description, project?.databaseType, project?.collaborationEnabled, form])

  const handleUpdate = useCallback(async (values: any) => {
    if (!project?.id) return
    
    setLoading(true)
    try {
      await updateProject(project.id, {
        name: values.name,
        description: values.description || '',
        databaseType: values.databaseType || 'MYSQL'
      })
      message.success('项目更新成功')
      
      const editTab = openTabs.find((tab: any) => tab.type === 'editProject' && tab.projectId === projectId)
      if (editTab) {
        closeTab(editTab.id)
      }
      
      if (onClose) {
        onClose()
      }
    } catch (error) {
      message.error('项目更新失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [project, updateProject, openTabs, closeTab, projectId, onClose])

  const handleClose = useCallback(() => {
    const editTab = openTabs.find((tab: any) => tab.type === 'editProject' && tab.projectId === projectId)
    if (editTab) {
      closeTab(editTab.id)
    }
    if (onClose) {
      onClose()
    }
  }, [openTabs, closeTab, projectId, onClose])

  const handleOpenMemberTab = useCallback(() => {
    if (project) {
      openMemberTab(project.id, project.name)
      handleClose()
    }
  }, [project, openMemberTab, handleClose])

  const handleToggleCollaboration = useCallback(async (checked: boolean) => {
    if (!project?.id) return
    
    setCollaborationLoading(true)
    try {
      const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`
      const response = await fetch(`${API_BASE}/projects/${project.id}/collaboration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ enabled: checked })
      })
      
      const data = await response.json()
      if (data.success) {
        setCollaborationEnabled(checked)
        
        await updateProject(project.id, { collaborationEnabled: checked })
        
        message.success(data.message)
      } else {
        message.error(data.message || '操作失败')
      }
    } catch (error) {
      message.error('操作失败: ' + (error as Error).message)
    } finally {
      setCollaborationLoading(false)
    }
  }, [project, updateProject])

  const loadUserTeams = async () => {
    setTeamsLoading(true)
    try {
      const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`
      const token = localStorage.getItem('authToken')
      if (!token) return

      const decodedToken = JSON.parse(atob(token.split('.')[1]))
      const userId = decodedToken.userId
      
      const response = await fetch(`${API_BASE}/teams/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success && data.data) {
        const teams = data.data
          .filter((team: any) => {
            const member = team.members?.find((m: any) => m.userId === userId)
            return member && (member.role === 'owner' || member.role === 'admin')
          })
          .map((team: any) => ({
            id: team.id,
            name: team.name,
            role: team.members?.find((m: any) => m.userId === userId)?.role || 'member'
          }))
        setUserTeams(teams)
      }
    } catch (error) {
      console.error('加载团队列表失败:', error)
    } finally {
      setTeamsLoading(false)
    }
  }

  const handleOpenConvertModal = useCallback(async () => {
    setConvertModalVisible(true)
    setSelectedTeam('')
    await loadUserTeams()
  }, [])

  const handleConvertToTeamProject = useCallback(async () => {
    if (!project?.id || !selectedTeam) {
      message.warning('请选择目标团队')
      return
    }

    setConvertLoading(true)
    try {
      const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`
      const response = await fetch(`${API_BASE}/projects/${project.id}/convert-to-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ targetTeamId: selectedTeam })
      })
      
      const data = await response.json()
      if (data.success) {
        message.success('转换成功！协作模式已自动开启，团队成员已自动添加为项目成员')
        setConvertModalVisible(false)
        if (refreshProjects) {
          await refreshProjects()
        }
        handleClose()
      } else {
        message.error(data.message || '转换失败')
      }
    } catch (error) {
      message.error('转换失败: ' + (error as Error).message)
    } finally {
      setConvertLoading(false)
    }
  }, [project, selectedTeam, refreshProjects, handleClose])

  if (!project) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--theme-text-secondary)' }}>项目不存在</span>
      </div>
    )
  }

  const isCloudProject = !project.id.startsWith('local_') && project.createdBy !== 'local'
  const isPersonalCloudProject = isCloudProject && !project.createdBy.startsWith('team_')
  const isTeamProject = isCloudProject && project.createdBy.startsWith('team_')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid var(--theme-border)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'var(--theme-background-secondary)'
      }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditOutlined />
          编辑项目
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

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <Card 
          style={{ maxWidth: 700, margin: '0 auto' }}
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ marginBottom: 24 }}>
            <Space size={8}>
              <Tag color={isCloudProject ? 'blue' : 'orange'}>
                {isCloudProject ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CloudOutlined /> 云端项目
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DatabaseOutlined /> 本地项目
                  </span>
                )}
              </Tag>
              {isPersonalCloudProject && (
                <Tag color="purple">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TeamOutlined /> 个人项目
                  </span>
                </Tag>
              )}
              {isTeamProject && (
                <Tag color="cyan">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TeamOutlined /> 团队项目
                  </span>
                </Tag>
              )}
              <Tag color={collaborationEnabled ? 'green' : 'default'}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ThunderboltOutlined /> 
                  {collaborationEnabled ? '协作模式已开启' : '协作模式已关闭'}
                </span>
              </Tag>
              <Tag>{project.status}</Tag>
            </Space>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdate}
          >
            <Form.Item
              name="name"
              label="项目名称"
              rules={[
                { required: true, message: '请输入项目名称' },
                { pattern: /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_\s-]*$/, message: '项目名只能包含中文、字母、数字、下划线、空格和连字符，必须以中文、字母或下划线开头' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (value && projects.some((p: Project) => p.id !== project?.id && p.name.toLowerCase() === value.toLowerCase())) {
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
              <Input.TextArea placeholder="请输入项目描述" rows={4} />
            </Form.Item>
            
            <Form.Item
              name="databaseType"
              label="数据库类型"
            >
              <Select>
                <Option value="MYSQL">MySQL</Option>
                <Option value="POSTGRESQL">PostgreSQL</Option>
                <Option value="SQLITE">SQLite</Option>
              </Select>
            </Form.Item>

            {isCloudProject && (
              <>
                <Divider />
                <CollaborationPanel
                  collaborationEnabled={collaborationEnabled}
                  collaborationLoading={collaborationLoading}
                  activeCollaborators={activeCollaborators}
                  isAuthenticated={isAuthenticated}
                  onToggleCollaboration={handleToggleCollaboration}
                />
              </>
            )}

            <Form.Item style={{ marginTop: 32 }}>
              <Space>
                <Button onClick={handleClose}>取消</Button>
                {isCloudProject && isAuthenticated === true && (
                  <Button 
                    icon={<TeamOutlined />}
                    onClick={handleOpenMemberTab}
                  >
                    管理成员
                  </Button>
                )}
                {isCloudProject && isAuthenticated !== true && (
                  <Tooltip title="请先登录后再管理项目成员">
                    <Button 
                      icon={<TeamOutlined />}
                      disabled
                    >
                      管理成员
                    </Button>
                  </Tooltip>
                )}
                {!isCloudProject && (
                  <Tooltip title="本地项目不支持多人协作，请上传到云端后再管理成员">
                    <Button 
                      icon={<TeamOutlined />}
                      disabled
                    >
                      管理成员
                    </Button>
                  </Tooltip>
                )}
                {isPersonalCloudProject && isAuthenticated === true && (
                  <Tooltip title="将个人项目转换为团队项目，解除5人协作限制">
                    <Button 
                      icon={<SwapOutlined />}
                      onClick={handleOpenConvertModal}
                    >
                      转换为团队项目
                    </Button>
                  </Tooltip>
                )}
                <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>

      <ConvertToTeamModal
        open={convertModalVisible}
        teamsLoading={teamsLoading}
        convertLoading={convertLoading}
        userTeams={userTeams}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
        onCancel={() => setConvertModalVisible(false)}
        onConfirm={handleConvertToTeamProject}
      />
    </div>
  )
}

export default EditProjectTab
