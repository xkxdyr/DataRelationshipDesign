import React, { useState } from 'react'
import { List, Button, Card, Empty, Space, Popconfirm, Tag, Modal, Form, Input, Select, Typography, Table } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOutlined, EditOutlined, HistoryOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { projectApi } from '../services/api'
import { Version } from '../types'
import { ImportExportModal } from './ImportExportModal'

const { Option } = Select
const { Text, Paragraph } = Typography

const ProjectList: React.FC = () => {
  const { 
    projects, 
    createProject, 
    deleteProject, 
    selectProject, 
    currentProject, 
    loadProjects, 
    updateProject,
    loadVersions,
    createVersion,
    updateVersion,
    deleteVersion,
    versions 
  } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false)
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [versionForm] = Form.useForm()

  const handleOpenModal = () => {
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleCreate = async (values: any) => {
    await createProject({ 
      name: values.name,
      description: values.description || '',
      databaseType: values.databaseType || 'MYSQL'
    })
    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deleteProject(id)
  }

  const handleOpenEditModal = (project: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProjectId(project.id)
    editForm.setFieldsValue({
      name: project.name,
      description: project.description || '',
      databaseType: project.databaseType
    })
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingProjectId(null)
  }

  const handleUpdate = async (values: any) => {
    if (editingProjectId) {
      await updateProject(editingProjectId, {
        name: values.name,
        description: values.description || '',
        databaseType: values.databaseType || 'MYSQL'
      })
      setIsEditModalOpen(false)
    }
  }

  const handleOpenVersionModal = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProjectId(projectId)
    loadVersions(projectId)
    setIsVersionModalOpen(true)
  }

  const handleOpenCreateVersionModal = () => {
    versionForm.resetFields()
    setIsCreateVersionModalOpen(true)
  }

  const handleCreateVersion = async (values: any) => {
    if (selectedProjectId) {
      const snapshot = JSON.stringify({
        project: currentProject
      })
      await createVersion(selectedProjectId, {
        name: values.name,
        comment: values.comment || '',
        data: snapshot
      })
      setIsCreateVersionModalOpen(false)
      loadVersions(selectedProjectId)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'PUBLISHED' ? 'success' : 'default'
  }

  const getDatabaseTypeColor = (type: string) => {
    switch(type) {
      case 'MYSQL': return 'blue'
      case 'POSTGRESQL': return 'purple'
      case 'SQLITE': return 'orange'
      default: return 'default'
    }
  }

  return (
    <>
      <Card 
        title="项目列表"
        extra={
          <Space>
            <Button icon={<ImportOutlined />} onClick={() => setIsImportExportModalOpen(true)}>
              导入
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => setIsImportExportModalOpen(true)}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
              新建项目
            </Button>
          </Space>
        }
        style={{ height: '100%', border: 'none', borderRadius: 0, margin: 0, padding: 0 }}
        styles={{ 
          header: { padding: '12px 16px' },
          body: { 
            height: 'calc(100% - 57px)', 
            overflow: 'auto',
            padding: '8px 12px'
          } 
        }}
      >
        {projects.length === 0 ? (
          <Empty 
            description="暂无项目，点击上方按钮创建" 
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={projects}
            renderItem={(project) => (
            <List.Item
              style={{ 
                backgroundColor: currentProject?.id === project.id ? '#e6f7ff' : '#fff',
                cursor: 'pointer',
                borderRadius: 8,
                marginBottom: 8,
                padding: '12px 16px',
                border: currentProject?.id === project.id ? '1px solid #91d5ff' : '1px solid transparent',
                transition: 'all 0.2s ease',
                boxShadow: currentProject?.id === project.id ? '0 2px 8px rgba(24,144,255,0.15)' : 'none'
              }}
              actions={[
                <Button
                  type="text"
                  size="small"
                  icon={<HistoryOutlined />}
                  style={{ padding: '4px 8px' }}
                  onClick={(e) => handleOpenVersionModal(project.id, e)}
                >
                  版本
                </Button>,
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  style={{ padding: '4px 8px' }}
                  onClick={(e) => handleOpenEditModal(project, e)}
                >
                  编辑
                </Button>,
                <Popconfirm
                  title="确定删除这个项目吗？"
                  description="删除后不可恢复"
                  onConfirm={() => handleDelete(project.id)}
                  okText="确定"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    type="text" 
                    danger 
                    size="small" 
                    icon={<DeleteOutlined />}
                    style={{ padding: '4px 8px' }}
                  >
                    删除
                  </Button>
                </Popconfirm>
              ]}
              onClick={() => selectProject(project.id)}
            >
              <List.Item.Meta
                avatar={<FolderOutlined style={{ 
                  fontSize: 24, 
                  color: currentProject?.id === project.id ? '#1890ff' : '#d9d9d9' 
                }} />}
                title={
                  <Space wrap style={{ marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 15 }}>{project.name}</Text>
                    <Tag color={getStatusColor(project.status)} style={{ margin: 0 }}>
                      {project.status}
                    </Tag>
                    <Tag color={getDatabaseTypeColor(project.databaseType)} style={{ margin: 0 }}>
                      {project.databaseType}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    {project.description && (
                      <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ 
                          color: '#666', 
                          fontSize: '12px', 
                          marginBottom: 4 
                        }}
                      >
                        {project.description}
                      </Paragraph>
                    )}
                    <Space size="middle" style={{ color: '#999', fontSize: '11px' }}>
                      <span>v{project.version}</span>
                      <span>创建于 {new Date(project.createdAt).toLocaleDateString()}</span>
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      </Card>

      <Modal
        title="新建项目"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        okText="创建"
        cancelText="取消"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
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
        </Form>
      </Modal>

      <Modal
        title="编辑项目"
        open={isEditModalOpen}
        onOk={() => editForm.submit()}
        onCancel={handleCloseEditModal}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
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
          >
            <Select>
              <Option value="MYSQL">MySQL</Option>
              <Option value="POSTGRESQL">PostgreSQL</Option>
              <Option value="SQLITE">SQLite</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="版本管理"
        open={isVersionModalOpen}
        onCancel={() => setIsVersionModalOpen(false)}
        okText="关闭"
        cancelText="取消"
        width={700}
        footer={[
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateVersionModal}>
            新建版本
          </Button>
        ]}
      >
        <Table
          dataSource={versions}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: "版本号",
              dataIndex: "version",
              key: "version",
              width: 100
            },
            {
              title: "版本名称",
              dataIndex: "name",
              key: "name"
            },
            {
              title: "备注",
              dataIndex: "comment",
              key: "comment"
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              key: "createdAt",
              render: (date: string) => new Date(date).toLocaleString()
            },
            {
              title: "操作",
              key: "action",
              width: 150,
              render: (record: Version) => (
                <Space size="small">
                  <Popconfirm
                    title="确定删除这个版本吗？"
                    onConfirm={() => deleteVersion(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Modal>

      <Modal
        title="新建版本"
        open={isCreateVersionModalOpen}
        onOk={() => versionForm.submit()}
        onCancel={() => setIsCreateVersionModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={500}
      >
        <Form
          form={versionForm}
          layout="vertical"
          onFinish={handleCreateVersion}
        >
          <Form.Item
            name="name"
            label="版本名称"
            rules={[{ required: true, message: "请输入版本名称" }]}
          >
            <Input placeholder="请输入版本名称" />
          </Form.Item>
          
          <Form.Item
            name="comment"
            label="备注说明"
          >
            <Input.TextArea placeholder="请输入备注说明" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <ImportExportModal
        open={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
      />
    </>
  )
}

export default ProjectList
