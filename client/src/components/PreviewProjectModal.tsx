import React, { useMemo } from 'react'
import { Modal, Button, Space, Descriptions, Tag, Divider, Row, Col, Card, Statistic, Table, Empty, Typography } from 'antd'
import { EyeOutlined, AppstoreOutlined, TableOutlined, LinkOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { Table as TableType } from '../types'

const { Text } = Typography

function getStatusColor(status: string) {
  return status === 'PUBLISHED' ? 'success' : 'default'
}

function getDatabaseTypeColor(type: string) {
  switch(type) {
    case 'MYSQL': return 'blue'
    case 'POSTGRESQL': return 'purple'
    case 'SQLITE': return 'orange'
    default: return 'default'
  }
}

interface PreviewProjectModalProps {
  open: boolean
  projectId: string | null
  onClose: () => void
}

export const PreviewProjectModal: React.FC<PreviewProjectModalProps> = ({ open, projectId, onClose }) => {
  const { projects, tables, relationships, openProjectTab } = useAppStore()

  const previewData = useMemo(() => {
    if (!projectId) return null
    const project = projects.find(p => p.id === projectId)
    if (!project) return null
    
    const projectTables = tables.filter(t => t.projectId === projectId)
    const projectRelationships = relationships.filter(r => r.projectId === projectId)
    const totalColumns = projectTables.reduce((sum, t) => sum + (t.columns?.length || 0), 0)
    let totalIndexes = 0
    projectTables.forEach(table => {
      totalIndexes += (table.indexes?.length || 0)
    })
    
    return {
      project,
      tables: projectTables,
      relationships: projectRelationships,
      totalColumns,
      totalIndexes
    }
  }, [projectId, projects, tables, relationships])

  const handleOpenProject = () => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        openProjectTab(project)
        onClose()
      }
    }
  }

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>项目预览</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close-preview" onClick={onClose}>
          关闭
        </Button>,
        <Button 
          key="open-project" 
          type="primary" 
          onClick={handleOpenProject}
        >
          打开项目
        </Button>
      ]}
      width={800}
    >
      {!previewData ? (
        <Empty description="无法获取预览数据" />
      ) : (
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <Descriptions title="项目信息" bordered column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label="项目名称">{previewData.project.name}</Descriptions.Item>
            <Descriptions.Item label="数据库类型">
              <Tag color={getDatabaseTypeColor(previewData.project.databaseType)}>
                {previewData.project.databaseType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              <Tag color={getStatusColor(previewData.project.status)}>
                {previewData.project.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {new Date(previewData.project.createdAt).toLocaleString()}
            </Descriptions.Item>
            {previewData.project.description && (
              <Descriptions.Item label="描述" span={2}>
                {previewData.project.description}
              </Descriptions.Item>
            )}
          </Descriptions>
          
          <Divider orientation="left">
            <Space>
              <AppstoreOutlined />
              <span>统计信息</span>
            </Space>
          </Divider>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="表数量"
                  value={previewData.tables.length}
                  prefix={<TableOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="列总数"
                  value={previewData.totalColumns}
                  prefix={<LinkOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="关系数量"
                  value={previewData.relationships.length}
                  prefix={<LinkOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="索引总数"
                  value={previewData.totalIndexes}
                  prefix={<TableOutlined />}
                />
              </Card>
            </Col>
          </Row>
          
          {previewData.tables.length > 0 && (
            <>
              <Divider orientation="left">
                <Space>
                  <TableOutlined />
                  <span>表列表</span>
                </Space>
              </Divider>
              <Table
                dataSource={previewData.tables}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
                columns={[
                  {
                    title: '表名',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text: string) => <Text strong>{text}</Text>
                  },
                  {
                    title: '列数',
                    key: 'columnCount',
                    render: (_: any, record: TableType) => record.columns?.length || 0,
                    width: 80
                  },
                  {
                    title: '索引数',
                    key: 'indexCount',
                    render: (_: any, record: TableType) => record.indexes?.length || 0,
                    width: 80
                  },
                  {
                    title: '注释',
                    dataIndex: 'comment',
                    key: 'comment',
                    ellipsis: true
                  }
                ]}
              />
            </>
          )}
        </div>
      )}
    </Modal>
  )
}