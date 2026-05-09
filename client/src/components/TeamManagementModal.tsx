import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, Table, Space, Typography, Tag, message, Card, Popconfirm } from 'antd'
import { TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined, CrownOutlined, SecurityScanOutlined, UserOutlined } from '@ant-design/icons'
import { teamApi, Team, TeamMember, CreateTeamRequest, AddMemberRequest, UpdateMemberRoleRequest } from '../services/api'

const { Title, Text } = Typography

interface TeamManagementModalProps {
  visible: boolean
  onClose: () => void
}

type ViewMode = 'list' | 'detail' | 'create' | 'edit'

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ visible, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)
  const [teamForm] = Form.useForm()
  const [memberForm] = Form.useForm()

  useEffect(() => {
    if (visible) {
      loadTeams()
    } else {
      resetState()
    }
  }, [visible])

  const loadTeams = async () => {
    setLoading(true)
    try {
      const result = await teamApi.getAllTeams()
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
    teamForm.resetFields()
    memberForm.resetFields()
  }

  const handleCreateTeam = async () => {
    try {
      const values = teamForm.getFieldsValue() as Partial<CreateTeamRequest>
      const request: CreateTeamRequest = {
        name: values.name || '',
        description: values.description,
        ownerId: 'current-user',
      }

      const result = await teamApi.createTeam(request)
      if (result.success && result.data) {
        message.success('团队创建成功')
        loadTeams()
        setViewMode('list')
        teamForm.resetFields()
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
        teamForm.resetFields()
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
              teamForm.setFieldsValue({ name: record.name, description: record.description })
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
        </Space>
      ),
    },
  ]

  const memberColumns = [
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

  return (
    <>
      <div style={{ display: 'none' }}>
        <Form form={teamForm} layout="vertical">
          <Form.Item name="name"><Input /></Form.Item>
          <Form.Item name="description"><Input /></Form.Item>
        </Form>
        <Form form={memberForm} layout="vertical">
          <Form.Item name="userId"><Input /></Form.Item>
          <Form.Item name="userName"><Input /></Form.Item>
          <Form.Item name="role"><Input /></Form.Item>
        </Form>
      </div>
      <Modal
        title={<><TeamOutlined style={{ marginRight: 8 }} />团队管理</>}
        open={visible}
        onCancel={() => {
          resetState()
          onClose()
        }}
        width={900}
        footer={null}
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
      <div style={{ padding: '16px' }}>
        {viewMode === 'list' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}>团队列表</Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  teamForm.resetFields()
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
        )}

        {viewMode === 'create' && (
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
        )}

        {viewMode === 'edit' && selectedTeam && (
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
        )}

        {viewMode === 'detail' && selectedTeam && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}>{selectedTeam.name}</Title>
              <Button onClick={() => setViewMode('list')}>
                返回
              </Button>
            </div>

            {selectedTeam.description && (
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
                dataSource={selectedTeam.members}
                rowKey="userId"
                bordered
                pagination={false}
              />
            </div>

            <Card title="添加成员" style={{ marginTop: 16 }}>
              <Form form={memberForm} layout="vertical">
                <Form.Item
                  label="用户ID"
                  name="userId"
                  rules={[{ required: true, message: '请输入用户ID' }]}
                >
                  <Input placeholder="输入用户ID" />
                </Form.Item>

                <Form.Item
                  label="用户名"
                  name="userName"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="输入用户名" />
                </Form.Item>

                <Form.Item
                  label="角色"
                  name="role"
                >
                  <select defaultValue="member" style={{ width: '100%', padding: 8 }}>
                    <option value="member">成员</option>
                    <option value="admin">管理员</option>
                  </select>
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
        )}
      </div>
    </Modal>
    </>
  )
}