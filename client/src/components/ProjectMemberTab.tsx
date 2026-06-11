import React, { useState, useEffect, useCallback } from 'react'
import { Form, Input, Select, Button, message, Table, Space, Popconfirm, Spin, Typography, Tabs, Card } from 'antd'
import { CopyOutlined, ReloadOutlined, LinkOutlined, MailOutlined, TeamOutlined, UserOutlined, XOutlined, KeyOutlined } from '@ant-design/icons'
import { userApi, teamApi } from '../services/api'
import { User, Team } from '../types'

const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`

const { Title } = Typography
const { Option } = Select

const UI_COLORS = {
  GRAY: '#8c8c8c',
  BORDER: '#e8e8e8',
  BG_LIGHT: '#f5f5f5',
  TEXT_SECONDARY: '#999',
}

interface ProjectMemberTabProps {
  projectId: string
  projectName: string
  onClose?: () => void
}

type ProjectRole = 'owner' | 'editor' | 'viewer'
type InviteTab = 'link' | 'email' | 'team'

interface ProjectMember {
  id: string
  userId: string
  userName: string
  role: ProjectRole
  joinedAt: string
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner': return '所有者'
    case 'editor': return '编辑者'
    case 'viewer': return '查看者'
    default: return role
  }
}

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: 'viewer', label: '查看者' },
  { value: 'editor', label: '编辑者' },
  { value: 'owner', label: '所有者' },
]

interface InviteCodePanelProps {
  inviteCode: string
  linkRole: ProjectRole
  onRoleChange: (role: ProjectRole) => void
  onCopy: () => void
  onReset: () => void
}

const InviteCodePanel = React.memo(({
  inviteCode, linkRole, onRoleChange, onCopy, onReset
}: InviteCodePanelProps) => (
  <div style={{ marginTop: 16 }}>
    <p style={{ color: UI_COLORS.GRAY, marginBottom: 16 }}>邀请成员加入您的项目。邀请码将在 7 天后过期。</p>
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyOutlined style={{ fontSize: 18, color: UI_COLORS.GRAY }} />
          <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', padding: '8px 16px', backgroundColor: UI_COLORS.BG_LIGHT, borderRadius: '4px' }}>
            {inviteCode.match(/.{4}/g)?.join('-')}
          </span>
        </div>
        <Button type="primary" icon={<CopyOutlined />} onClick={onCopy}>
          复制邀请码
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span>权限：</span>
        <Select value={linkRole} onChange={onRoleChange} style={{ width: 120 }}>
          {ROLE_OPTIONS.map(opt => (
            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
          ))}
        </Select>
      </div>
      <div style={{ marginTop: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={onReset} style={{ color: UI_COLORS.GRAY }} type="text">
          重置邀请码
        </Button>
      </div>
    </Card>
  </div>
))

interface EmailInvitePanelProps {
  emailInput: string
  emailRole: ProjectRole
  onEmailChange: (value: string) => void
  onRoleChange: (role: ProjectRole) => void
  onSend: () => void
}

const EmailInvitePanel = React.memo(({
  emailInput, emailRole, onEmailChange, onRoleChange, onSend
}: EmailInvitePanelProps) => (
  <div style={{ marginTop: 16 }}>
    <p style={{ color: UI_COLORS.GRAY, marginBottom: 16 }}>通过邮箱直接邀请用户加入项目。</p>
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="请输入邮箱"
          value={emailInput}
          onChange={(e) => onEmailChange(e.target.value)}
          prefix={<MailOutlined />}
          style={{ marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <span>权限：</span>
          <Select value={emailRole} onChange={onRoleChange} style={{ width: 120 }}>
            {ROLE_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </div>
        <Button type="primary" onClick={onSend}>
          发送邀请
        </Button>
      </div>
    </Card>
  </div>
))

interface TeamInvitePanelProps {
  teams: Team[]
  selectedTeam: string | null
  onTeamChange: (teamId: string) => void
  selectedTeamMember: string | null
  onTeamMemberChange: (userId: string) => void
  teamMembers: User[]
  teamMemberRole: ProjectRole
  onRoleChange: (role: ProjectRole) => void
  onAdd: () => void
}

const TeamInvitePanel = React.memo(({
  teams, selectedTeam, onTeamChange, selectedTeamMember, onTeamMemberChange,
  teamMembers, teamMemberRole, onRoleChange, onAdd
}: TeamInvitePanelProps) => (
  <div style={{ marginTop: 16 }}>
    <p style={{ color: UI_COLORS.GRAY, marginBottom: 16 }}>从您的团队中选择成员加入项目。</p>
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Select
          value={selectedTeam}
          onChange={onTeamChange}
          placeholder="选择团队"
          style={{ width: 300, marginBottom: 16 }}
          showSearch
          filterOption={(input, option) =>
            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {teams.map(team => (
            <Option key={team.id} value={team.id}>
              {team.name}
            </Option>
          ))}
        </Select>
        {selectedTeam && (
          <>
            <Select
              value={selectedTeamMember}
              onChange={onTeamMemberChange}
              placeholder="选择团队成员"
              style={{ width: 300, marginBottom: 16 }}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {teamMembers.map(user => (
                <Option key={user.id} value={user.id}>
                  <Space>
                    <UserOutlined />
                    <span>{user.username}</span>
                    {user.displayName && <span style={{ color: UI_COLORS.TEXT_SECONDARY }}>- {user.displayName}</span>}
                  </Space>
                </Option>
              ))}
            </Select>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              <span>权限：</span>
              <Select value={teamMemberRole} onChange={onRoleChange} style={{ width: 120 }}>
                {ROLE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </div>
            <Button 
              type="primary" 
              onClick={onAdd} 
              disabled={!selectedTeamMember}
            >
              添加
            </Button>
          </>
        )}
      </div>
    </Card>
  </div>
))

interface MemberTableProps {
  members: ProjectMember[]
  loading: boolean
  onUpdateRole: (memberId: string, userId: string, newRole: ProjectRole) => void
  onRemoveMember: (memberId: string, userId: string) => void
}

const MemberTable = React.memo(({
  members, loading, onUpdateRole, onRemoveMember
}: MemberTableProps) => (
  <div style={{ marginTop: 32 }}>
    <Title level={5} style={{ marginBottom: 16 }}>当前项目成员</Title>
    <Spin spinning={loading}>
      <Table
        dataSource={members}
        rowKey="id"
        pagination={false}
        size="small"
        columns={[
          {
            title: '用户',
            dataIndex: 'userName',
            key: 'userName',
            render: (name: string) => (
              <Space>
                <UserOutlined />
                <span>{name}</span>
              </Space>
            )
          },
          {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            width: 120,
            render: (role: string, record: ProjectMember) => (
              <Select
                value={role}
                onChange={(newRole) => onUpdateRole(record.id, record.userId, newRole as ProjectRole)}
                style={{ width: 100 }}
                disabled={role === 'owner'}
              >
                {ROLE_OPTIONS.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            )
          },
          {
            title: '加入时间',
            dataIndex: 'joinedAt',
            key: 'joinedAt',
            width: 150,
            render: (date: string) => new Date(date).toLocaleString()
          },
          {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_, record: ProjectMember) => (
              <Popconfirm
                title="确定移除该成员吗？"
                onConfirm={() => onRemoveMember(record.id, record.userId)}
                okText="确定"
                cancelText="取消"
                disabled={record.role === 'owner'}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  disabled={record.role === 'owner'}
                >
                  移除
                </Button>
              </Popconfirm>
            )
          }
        ]}
      />
    </Spin>
  </div>
))

export const ProjectMemberTab: React.FC<ProjectMemberTabProps> = ({ projectId, projectName, onClose }) => {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<InviteTab>('link')
  const [inviteCode, setInviteCode] = useState('')
  const [linkRole, setLinkRole] = useState<ProjectRole>('editor')
  const [emailInput, setEmailInput] = useState('')
  const [emailRole, setEmailRole] = useState<ProjectRole>('editor')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedTeamMember, setSelectedTeamMember] = useState<string | null>(null)
  const [teamMemberRole, setTeamMemberRole] = useState<ProjectRole>('editor')
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      const data = await response.json()
      if (data.success && data.data) {
        setMembers(data.data)
      }
    } catch (error) {
      console.error('加载项目成员失败:', error)
      message.error('加载项目成员失败')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const loadTeams = useCallback(async () => {
    try {
      const response = await teamApi.getAllTeams()
      if (response.success && response.data) {
        setTeams(response.data)
      }
    } catch (error) {
      console.error('加载团队失败:', error)
    }
  }, [])

  const generateInviteCode = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ role: linkRole })
      })
      const data = await response.json()
      if (data.success && data.data) {
        setInviteCode(data.data.inviteCode)
      } else {
        message.error(data.message || '生成邀请码失败')
      }
    } catch (error) {
      console.error('生成邀请码失败:', error)
      message.error('生成邀请码失败')
    }
  }, [projectId, linkRole])

  useEffect(() => {
    if (projectId) {
      loadMembers()
      loadTeams()
      generateInviteCode()
    }
  }, [projectId, loadMembers, loadTeams, generateInviteCode])

  const copyInviteCode = useCallback(() => {
    const formattedCode = inviteCode.match(/.{4}/g)?.join('-') || inviteCode
    navigator.clipboard.writeText(formattedCode)
    message.success('邀请码已复制')
  }, [inviteCode])

  const resetInviteCode = useCallback(async () => {
    await generateInviteCode()
    message.success('邀请码已重置')
  }, [generateInviteCode])

  const handleAddByEmail = useCallback(async () => {
    if (!emailInput) {
      message.error('请输入邮箱')
      return
    }
    message.info('邮箱邀请功能开发中')
  }, [emailInput])

  const handleAddFromTeam = useCallback(async () => {
    if (!selectedTeamMember) {
      message.error('请选择团队成员')
      return
    }
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId: selectedTeamMember, role: teamMemberRole })
      })
      const data = await response.json()
      if (data.success) {
        message.success('添加成员成功')
        loadMembers()
        setSelectedTeamMember(null)
      } else {
        message.error(data.message || '添加成员失败')
      }
    } catch (error) {
      message.error('添加成员失败: ' + (error as Error).message)
    }
  }, [projectId, selectedTeamMember, teamMemberRole, loadMembers])

  const handleRemoveMember = useCallback(async (memberId: string, userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        message.success('移除成员成功')
        loadMembers()
      } else {
        message.error(data.message || '移除成员失败')
      }
    } catch (error) {
      message.error('移除成员失败: ' + (error as Error).message)
    }
  }, [projectId, loadMembers])

  const handleUpdateRole = useCallback(async (memberId: string, userId: string, newRole: ProjectRole) => {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ role: newRole })
      })
      const data = await response.json()
      if (data.success) {
        message.success('更新角色成功')
        loadMembers()
      } else {
        message.error(data.message || '更新角色失败')
      }
    } catch (error) {
      message.error('更新角色失败: ' + (error as Error).message)
    }
  }, [projectId, loadMembers])

  const handleTeamChange = useCallback(async (teamId: string) => {
    setSelectedTeam(teamId)
    try {
      const response = await teamApi.getTeamById(teamId)
      if (response.success && response.data && response.data.members) {
        const memberUsers = response.data.members.map((m: any) => ({
          id: m.userId,
          username: m.userName,
          displayName: m.userName
        } as User))
        setTeamMembers(memberUsers)
      }
    } catch (error) {
      console.error('加载团队成员失败:', error)
    }
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: `1px solid ${UI_COLORS.BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>邀请加入项目：{projectName}</Title>
        {onClose && (
          <Button
            type="text"
            icon={<XOutlined />}
            onClick={onClose}
          >
            关闭
          </Button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as InviteTab)}
          items={[
            {
              key: 'link',
              label: <span><KeyOutlined />邀请码</span>,
              children: (
                <InviteCodePanel
                  inviteCode={inviteCode}
                  linkRole={linkRole}
                  onRoleChange={setLinkRole}
                  onCopy={copyInviteCode}
                  onReset={resetInviteCode}
                />
              )
            },
            {
              key: 'email',
              label: <span><MailOutlined />邮箱邀请</span>,
              children: (
                <EmailInvitePanel
                  emailInput={emailInput}
                  emailRole={emailRole}
                  onEmailChange={setEmailInput}
                  onRoleChange={setEmailRole}
                  onSend={handleAddByEmail}
                />
              )
            },
            {
              key: 'team',
              label: <span><TeamOutlined />从团队中选择</span>,
              children: (
                <TeamInvitePanel
                  teams={teams}
                  selectedTeam={selectedTeam}
                  onTeamChange={handleTeamChange}
                  selectedTeamMember={selectedTeamMember}
                  onTeamMemberChange={setSelectedTeamMember}
                  teamMembers={teamMembers}
                  teamMemberRole={teamMemberRole}
                  onRoleChange={setTeamMemberRole}
                  onAdd={handleAddFromTeam}
                />
              )
            }
          ]}
        />

        <MemberTable
          members={members}
          loading={loading}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
        />
      </div>
    </div>
  )
}

export default ProjectMemberTab
