import { useState, useEffect, useCallback } from 'react'
import { Button, Table, Tag, Space, Input, Popconfirm, message, Tooltip, Modal } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, StarOutlined, StarFilled, BranchesOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { branchApi, BranchInfo } from '../services/api'

interface BranchManagerTabProps {
  projectId: string
  onBranchChange?: (branchId: string) => void
}

export default function BranchManagerTab({ projectId, onBranchChange }: BranchManagerTabProps) {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchDesc, setNewBranchDesc] = useState('')
  const [editingBranch, setEditingBranch] = useState<BranchInfo | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const loadBranches = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await branchApi.getByProject(projectId)
      if (res.success && res.data) {
        setBranches(res.data)
      }
    } catch {
      message.error('加载分支列表失败')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      loadBranches()
    }
  }, [projectId, loadBranches])

  const handleCreate = async () => {
    if (!newBranchName.trim() || !projectId) return
    try {
      const res = await branchApi.create(projectId, {
        name: newBranchName.trim(),
        description: newBranchDesc.trim() || undefined
      })
      if (res.success) {
        message.success('分支创建成功')
        setCreateModalVisible(false)
        setNewBranchName('')
        setNewBranchDesc('')
        loadBranches()
      }
    } catch {
      message.error('创建分支失败')
    }
  }

  const handleUpdate = async () => {
    if (!editingBranch || !editName.trim()) return
    try {
      const res = await branchApi.update(editingBranch.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined
      })
      if (res.success) {
        message.success('分支更新成功')
        setEditModalVisible(false)
        setEditingBranch(null)
        loadBranches()
      }
    } catch {
      message.error('更新分支失败')
    }
  }

  const handleDelete = async (branch: BranchInfo) => {
    try {
      const res = await branchApi.remove(branch.id)
      if (res.success) {
        message.success('分支已删除')
        loadBranches()
      } else {
        message.error(res.message || '删除失败')
      }
    } catch {
      message.error('删除分支失败')
    }
  }

  const handleSetDefault = async (branch: BranchInfo) => {
    try {
      const res = await branchApi.setDefault(branch.id)
      if (res.success) {
        message.success(`已将 "${branch.name}" 设为默认分支`)
        loadBranches()
      }
    } catch {
      message.error('设置默认分支失败')
    }
  }

  const handleSwitch = async (branch: BranchInfo) => {
    if (!projectId) return
    try {
      const res = await branchApi.switchBranch(branch.id, projectId)
      if (res.success) {
        message.success(`已切换到分支 "${branch.name}"`)
        loadBranches()
        onBranchChange?.(branch.id)
      }
    } catch {
      message.error('切换分支失败')
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: BranchInfo) => (
        <Space>
          <BranchesOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.isDefault && (
            <Tag color="gold" style={{ marginLeft: 8 }}>默认</Tag>
          )}
          {record.isActive && (
            <Tag color="blue" style={{ marginLeft: 4 }}>活跃</Tag>
          )}
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => (
        <span style={{ color: desc ? '#333' : '#bbb' }}>
          {desc || '—'}
        </span>
      )
    },
    {
      title: '版本数',
      key: 'versionCount',
      width: 80,
      render: (_: unknown, record: BranchInfo) => record._count?.versions || 0
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: unknown, record: BranchInfo) => (
        <Space size="small">
          {!record.isDefault && (
            <>
              <Tooltip title="设为默认">
                <Button
                  type="text"
                  size="small"
                  icon={<StarOutlined />}
                  onClick={() => handleSetDefault(record)}
                />
              </Tooltip>
              <Popconfirm
                title="确定删除此分支？"
                description="版本将保留但不再关联此分支"
                onConfirm={() => handleDelete(record)}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingBranch(record)
                setEditName(record.name)
                setEditDesc(record.description || '')
                setEditModalVisible(true)
              }}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? '当前活跃分支' : '切换到此分支'}>
            <Button
              size="small"
              type={record.isActive ? 'primary' : 'default'}
              ghost={record.isActive}
              icon={<ArrowRightOutlined />}
              onClick={() => !record.isActive && handleSwitch(record)}
              disabled={record.isActive}
            >
              {record.isActive ? '当前' : '切换'}
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <BranchesOutlined style={{ fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>分支管理</span>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          新建分支
        </Button>
      </div>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        管理当前项目的设计分支。每个分支可独立维护版本历史。
      </p>
      <Table
        dataSource={branches}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无分支，请新建一个' }}
      />

      <Modal
        title="新建分支"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false)
          setNewBranchName('')
          setNewBranchDesc('')
        }}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>分支名称</label>
          <Input
            placeholder="如 feature/user-auth, hotfix/001"
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            onPressEnter={handleCreate}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>描述（可选）</label>
          <Input.TextArea
            rows={2}
            placeholder="简短描述此分支的用途"
            value={newBranchDesc}
            onChange={e => setNewBranchDesc(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="编辑分支"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingBranch(null)
        }}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>分支名称</label>
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onPressEnter={handleUpdate}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>描述</label>
          <Input.TextArea
            rows={2}
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}