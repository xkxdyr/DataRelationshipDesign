import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Table, Space, Typography, Tag, message, Card, Popconfirm, Select, AutoComplete } from 'antd'
import { TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined, CrownOutlined, SecurityScanOutlined, UserOutlined, ProjectOutlined, XOutlined } from '@ant-design/icons'
import { teamApi, Team, TeamMember, CreateTeamRequest, AddMemberRequest, UpdateMemberRoleRequest, projectApi, userApi } from '../services/api'
import { Project, User } from '../types'
import { useAppStore } from '../stores/appStore'

const { Title, Text } = Typography
const { Option } = Select

interface TeamManagementTabProps {
  onClose?: () => void
}

type ViewMode = 'list' | 'detail' | 'create' | 'edit' | 'projects' | 'addMember'

export const TeamManagementTab: React.FC<TeamManagementTabProps> = ({ onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)
  const [teamForm] = Form.useForm()
  const [memberForm] = Form.useForm()
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [teamProjects, setTeamProjects] = useState<Project[]>([])
  const [projectLoading, setProjectLoading] = useState(false)
  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTimeoutRef, setSearchTimeoutRef] = useState<ReturnType<typeof setTimeout> | null>(null)

  const { currentUser, openTabs, closeTab } = useAppStore()

  useEffect(() => {
    loadTeams()
    loadAllProjects()
  }, [])

  useEffect(() => {
    if (viewMode === 'create') {
      teamForm.resetFields()
    } else if (viewMode === 'edit' && selectedTeam) {
      teamForm.setFieldsValue({ name: selectedTeam.name, description: selectedTeam.description })
    } else if (viewMode === 'addMember') {
      memberForm.resetFields()
    }
  }, [viewMode, selectedTeam])

  const loadAllProjects = async () => {
    try {
      const result = await projectApi.getAll()
      if (result.success && result.data) {
        setAllProjects(result.data)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchUsers([])
      return
    }

    if (searchTimeoutRef) {
      clearTimeout(searchTimeoutRef)
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const result = await userApi.searchUsers(query)
        if (result.success && result.data) {
          const filtered = result.data.filter(user => 
            !selectedTeam?.members.some(member => member.userId === user.id)
          )
          setSearchUsers(filtered)
        }
      } catch (error) {
        console.error('Failed to search users:', error)
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    setSearchTimeoutRef(timeout)
  }

  const loadTeamProjects = async (teamId: string) => {
    setProjectLoading(true)
    try {
      const result = await teamApi.getTeamProjects(teamId)
      if (result.success && result.data) {
        setTeamProjects(result.data)
      }
    } catch (error) {
      console.error('Failed to load team projects:', error)
    } finally {
      setProjectLoading(false)
    }
  }

  const loadTeams = async () => {
    setLoading(true)
    try {
      let result
      if (currentUser) {
        result = await teamApi.getTeamsByUserId(currentUser.id)
      } else {
        result = await teamApi.getAllTeams()
      }
      if (result.success && result.data) {
        setTeams(result.data)
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setViewMode('list')
    setSelectedTeam(null)
    setTeamProjects([])
  }

  const handleCreateTeam = async () => {
    if (!currentUser) {
      message.error('请先登录')
      return
    }

    try {
      const values = teamForm.getFieldsValue() as Partial<CreateTeamRequest>
      const request: CreateTeamRequest = {
        name: values.name || '',
        description: values.description,
        ownerId: currentUser.id,
      }

      const result = await teamApi.createTeam(request)
      if (result.success && result.data) {
        message.success('团队创建成功')
        loadTeams()
        setViewMode('list')
      } else {
        message.error('创建失败')
      }
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handleUpdateTeam = async () => {
    if (!selectedTeam) return

    try {
      const values = teamForm.getFieldsValue() as Partial<CreateTeamRequest>
      const request = {
        name: values.name,
        description: values.description,
      }

      const result = await teamApi.updateTeam(selectedTeam.id, request)
      if (result.success && result.data) {
        message.success('团队更新成功')
        loadTeams()
        setViewMode('list')
      } else {
        message.error('更新失败')
      }
    } catch (error) {
      message.error('更新失败')
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const result = await teamApi.deleteTeam(teamId)
      if (result.success) {
        message.success('团队删除成功')
        loadTeams()
      } else {
        message.error('删除失败')
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeam) return

    const values = memberForm.getFieldsValue() as Partial<AddMemberRequest>
    if (!values.userId || !values.userName) {
      message.warning('请填写用户ID和用户名')
      return
    }

    try {
      const request: AddMemberRequest = {
        userId: values.userId,
        userName: values.userName,
        role: values.role as 'admin' | 'member' || 'member',
      }

      const result = await teamApi.addMember(selectedTeam.id, request)
      if (result.success && result.data) {
        message.success('成员添加成功')
        setSelectedTeam(result.data)
        memberForm.resetFields()
      } else {
        message.error('添加失败')
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return

    try {
      const result = await teamApi.removeMember(selectedTeam.id, userId)
      if (result.success && result.data) {
        message.success('成员移除成功')
        setSelectedTeam(result.data)
      } else {
        message.error('移除失败')
      }
    } catch (error) {
      message.error('移除失败')
    }
  }

  const handleUpdateRole = async (userId: string, role: 'admin' | 'member') => {
    if (!selectedTeam) return

    try {
      const request: UpdateMemberRoleRequest = { role }
      const result = await teamApi.updateMemberRole(selectedTeam.id, userId, request)
      if (result.success && result.data) {
        message.success('角色更新成功')
        setSelectedTeam(result.data)
      } else {
        message.error('更新失败')
      }
    } catch (error) {
      message.error('更新失败')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <CrownOutlined style={{ color: '#d4a574' }} />
      case 'admin':
        return <SecurityScanOutlined style={{ color: '#1890ff' }} />
      default:
        return <UserOutlined style={{ color: '#52c41a' }} />
    }
  }

  const getRoleTag = (role: string) => {
    switch (role) {
      case 'owner':
        return <Tag color="gold">所有者</Tag>
      case 'admin':
        return <Tag color="blue">管理员</Tag>
      default:
        return <Tag color="green">成员</Tag>
    }
  }

  const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#FF8C42'
  ]

  const getUserColor = (userId: string): string => {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
  }

  const handleAddProjectToTeam = async (projectId: string) => {
    if (!selectedTeam) return

    try {
      const result = await teamApi.addProjectToTeam(selectedTeam.id, projectId)
      if (result.success) {
        message.success('项目添加成功')
        loadTeamProjects(selectedTeam.id)
      } else {
        message.error('添加失败')
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const handleRemoveProjectFromTeam = async (projectId: string) => {
    if (!selectedTeam) return

    try {
      const result = await teamApi.removeProjectFromTeam(selectedTeam.id, projectId)
      if (result.success) {
        message.success('项目移除成功')
        loadTeamProjects(selectedTeam.id)
      } else {
        message.error('移除失败')
      }
    } catch (error) {
      message.error('移除失败')
    }
  }

  const handleClose = () => {
    resetState()
    if (onClose) {
      const teamTab = openTabs.find(tab => tab.type === 'teamManagement')
      if (teamTab) {
        closeTab(teamTab.id)
      }
      onClose()
    }
  }

  const teamColumns = [
    {
      title: '团队名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: '成员数',
      dataIndex: 'members',
      key: 'members',
      render: (members: TeamMember[]) => members?.length || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Team) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedTeam(record)
              setViewMode('edit')
            }}
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTeam(record.id)}
          >
            删除
          </Button>
          <Button
            type="text"
            onClick={() => {
              setSelectedTeam(record)
              setViewMode('detail')
            }}
          >
            查看详情
          </Button>
          <Button
            type="text"
            icon={<ProjectOutlined />}
            onClick={() => {
              setSelectedTeam(record)
              loadTeamProjects(record.id)
              setViewMode('projects')
            }}
          >
            项目管理
          </Button>
        </Space>
      ),
    },
  ]

  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: '数据库类型',
      dataIndex: 'databaseType',
      key: 'databaseType',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Project) => (
        <Popconfirm
          title="确定要从团队中移除该项目吗？"
          onConfirm={() => handleRemoveProjectFromTeam(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger>
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  const memberColumns = [
    {
      title: '颜色',
      dataIndex: 'userId',
      key: 'color',
      render: (userId: string) => (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: getUserColor(userId),
            border: '2px solid #fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        />
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
    },
    {
      title: '用户名',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Space>
          {getRoleIcon(role)}
          {getRoleTag(role)}
        </Space>
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TeamMember) => {
        if (record.role === 'owner') return null
        return (
          <Space>
            <Button
              type="text"
              onClick={() => handleUpdateRole(record.userId, record.role === 'admin' ? 'member' : 'admin')}
            >
              {record.role === 'admin' ? '降为成员' : '设为管理员'}
            </Button>
            <Popconfirm
              title="确定要移除该成员吗？"
              onConfirm={() => handleRemoveMember(record.userId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger>
                移除
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  const renderList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>团队列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setViewMode('create')
          }}
        >
          创建团队
        </Button>
      </div>

      <Table
        columns={teamColumns}
        dataSource={teams}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
      />
    </div>
  )

  const renderCreate = () => (
    <div>
      <Title level={4}>创建团队</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>填写团队基本信息</Text>

      <Form form={teamForm} layout="vertical">
        <Form.Item
          label="团队名称"
          name="name"
          rules={[{ required: true, message: '请输入团队名称' }]}
        >
          <Input placeholder="输入团队名称" />
        </Form.Item>

        <Form.Item
          label="团队描述"
          name="description"
        >
          <Input.TextArea placeholder="输入团队描述（可选）" rows={3} />
        </Form.Item>

        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => setViewMode('list')}>
            返回
          </Button>
          <Button
            type="primary"
            onClick={handleCreateTeam}
          >
            创建团队
          </Button>
        </Space>
      </Form>
    </div>
  )

  const renderEdit = () => (
    <div>
      <Title level={4}>编辑团队</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>修改团队信息</Text>

      <Form form={teamForm} layout="vertical">
        <Form.Item
          label="团队名称"
          name="name"
          rules={[{ required: true, message: '请输入团队名称' }]}
        >
          <Input placeholder="输入团队名称" />
        </Form.Item>

        <Form.Item
          label="团队描述"
          name="description"
        >
          <Input.TextArea placeholder="输入团队描述（可选）" rows={3} />
        </Form.Item>

        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => setViewMode('list')}>
            返回
          </Button>
          <Button
            type="primary"
            onClick={handleUpdateTeam}
          >
            保存修改
          </Button>
        </Space>
      </Form>
    </div>
  )

  const renderDetail = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>{selectedTeam?.name}</Title>
        <Button onClick={() => setViewMode('list')}>
          返回
        </Button>
      </div>

      {selectedTeam?.description && (
        <Card style={{ marginBottom: 16 }}>
          <Text type="secondary">{selectedTeam.description}</Text>
        </Card>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Title level={4}>团队成员</Title>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              memberForm.resetFields()
            }}
          >
            添加成员
          </Button>
        </div>

        <Table
          columns={memberColumns}
          dataSource={selectedTeam?.members}
          rowKey="userId"
          bordered
          pagination={false}
        />
      </div>

      <Card title="添加成员" style={{ marginTop: 16 }}>
        <Form form={memberForm} layout="vertical">
          <Form.Item
            label="搜索用户"
            name="userId"
            rules={[{ required: true, message: '请搜索并选择用户' }]}
          >
            <AutoComplete
              placeholder="搜索用户名或邮箱..."
              allowClear
              notFoundContent={searchLoading ? '搜索中...' : '未找到用户'}
              onSearch={handleSearchUsers}
              onChange={(value) => {
                if (value) {
                  const user = searchUsers.find(u => u.id === value)
                  if (user) {
                    memberForm.setFieldsValue({ userName: user.username })
                  }
                }
              }}
            >
              {searchUsers.map(user => (
                <AutoComplete.Option key={user.id} value={user.id}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: user.color || '#1890ff',
                        marginRight: 8
                      }}
                    />
                    <span>{user.username}</span>
                    <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>{user.email}</span>
                  </div>
                </AutoComplete.Option>
              ))}
            </AutoComplete>
          </Form.Item>

          <Form.Item
            label="用户名"
            name="userName"
          >
            <Input placeholder="用户名将自动填充" disabled />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            initialValue="member"
          >
            <Select>
              <Option value="member">成员</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>

          <Button
            type="primary"
            onClick={handleAddMember}
          >
            添加成员
          </Button>
        </Form>
      </Card>
    </div>
  )

  const renderProjects = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>{selectedTeam?.name} - 项目管理</Title>
        <Button onClick={() => setViewMode('list')}>
          返回
        </Button>
      </div>

      <Card title="团队项目" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text type="secondary">管理团队可以访问的项目</Text>
          <Space>
            <Select
              placeholder="选择项目添加"
              style={{ width: 200 }}
              onChange={handleAddProjectToTeam}
            >
              {allProjects
                .filter(project => !teamProjects.some(tp => tp.id === project.id))
                .map(project => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
            </Select>
          </Space>
        </div>

        <Table
          columns={projectColumns}
          dataSource={teamProjects}
          rowKey="id"
          loading={projectLoading}
          bordered
          pagination={false}
        />
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return renderList()
      case 'create':
        return renderCreate()
      case 'edit':
        return renderEdit()
      case 'detail':
        return renderDetail()
      case 'projects':
        return renderProjects()
      default:
        return renderList()
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamOutlined />
          团队管理
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
        {renderContent()}
      </div>
    </div>
  )
}

export default TeamManagementTab
