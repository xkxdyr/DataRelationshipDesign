import React, { useEffect, useState } from 'react'
import { Table, Button, Space, Typography, Card, Tag, Popconfirm, message, Empty, Modal, Form, Input, Select, Row, Col } from 'antd'
import { useAppStore } from '../stores/appStore'
import { Version } from '../types'
import { HistoryOutlined, PlusOutlined, DeleteOutlined, RotateLeftOutlined, XOutlined, SwapOutlined, DiffOutlined } from '@ant-design/icons'
import VersionCompareModal from './VersionCompareModal'

const { Title } = Typography

interface VersionManagementTabProps {
  projectId: string
  projectName: string
  onClose?: () => void
}

export const VersionManagementTab: React.FC<VersionManagementTabProps> = ({ projectId, projectName, onClose }) => {
  const { versions, loadVersions, createVersion, deleteVersion, restoreVersion, currentProject, tables, relationships, closeTab, openTabs } = useAppStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{ id1: string; name1: string; id2: string; name2: string } | null>(null)
  const [freeCompareOpen, setFreeCompareOpen] = useState(false)
  const [freeCompareLeft, setFreeCompareLeft] = useState<string>('')
  const [freeCompareRight, setFreeCompareRight] = useState<string>('')

  useEffect(() => {
    if (projectId) {
      loadVersions(projectId)
    }
  }, [projectId, loadVersions])

  const handleCreateVersion = async (values: any) => {
    try {
      const projectTables = tables.filter(t => t.projectId === projectId)
      const projectRelationships = relationships.filter(r => r.projectId === projectId)

      const snapshotData = {
        id: projectId,
        tables: projectTables,
        relationships: projectRelationships,
        project: currentProject
      }

      const snapshot = JSON.stringify(snapshotData)

      await createVersion(projectId, {
        name: values.name,
        comment: values.comment || '',
        data: snapshot
      })
      
      message.success('版本创建成功')
      setIsCreateModalOpen(false)
      createForm.resetFields()
      loadVersions(projectId)
    } catch (error) {
      message.error('版本创建失败: ' + (error as Error).message)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    try {
      await restoreVersion(versionId)
      message.success('版本回滚成功')
      loadVersions(projectId)
    } catch (error) {
      message.error('版本回滚失败: ' + (error as Error).message)
    }
  }

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion(versionId)
      message.success('版本删除成功')
      loadVersions(projectId)
    } catch (error) {
      message.error('版本删除失败: ' + (error as Error).message)
    }
  }

  const handleClose = () => {
    const versionTab = openTabs.find(tab => tab.type === 'versionManagement' && tab.projectId === projectId)
    if (versionTab) {
      closeTab(versionTab.id)
    }
    if (onClose) {
      onClose()
    }
  }

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      width: 100
    },
    {
      title: '版本名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '备注',
      dataIndex: 'comment',
      key: 'comment'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (record: Version, _: any, index: number) => (
        <Space size="small">
          {index < versions.length - 1 && (
            <Button 
              type="text" 
              size="small" 
              icon={<SwapOutlined />} 
              title="与上一版本对比"
              onClick={() => {
                const prevVersion = versions[index + 1]
                setCompareVersions({
                  id1: prevVersion.id,
                  name1: prevVersion.name,
                  id2: record.id,
                  name2: record.name
                })
                setCompareModalOpen(true)
              }}
            >
              对比
            </Button>
          )}
          <Popconfirm
            title="确定回滚到此版本吗？"
            description="回滚后将覆盖当前项目的所有表和关系"
            onConfirm={() => handleRestoreVersion(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ type: 'primary' }}
          >
            <Button type="text" size="small" icon={<RotateLeftOutlined />} title="回滚到此版本">
              回滚
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定删除这个版本吗？"
            onConfirm={() => handleDeleteVersion(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} title="删除版本">
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

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
          <HistoryOutlined />
          版本管理 - {projectName}
        </Title>
        <Space>
          <Button
            icon={<DiffOutlined />}
            onClick={() => setFreeCompareOpen(true)}
          >
            版本对比
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            新建版本
          </Button>
          {onClose && (
            <Button
              type="text"
              icon={<XOutlined />}
              onClick={handleClose}
            >
              关闭
            </Button>
          )}
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={versions}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
            columns={columns}
            locale={{ emptyText: <Empty description="暂无版本记录" /> }}
          />
        </Card>
      </div>

      <Modal
        title="新建版本"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false)
          createForm.resetFields()
        }}
        onOk={() => createForm.submit()}
        okText="创建"
        cancelText="取消"
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateVersion}
        >
          <Form.Item
            name="name"
            label="版本名称"
            rules={[{ required: true, message: '请输入版本名称' }]}
          >
            <Input placeholder="请输入版本名称，如：v1.0.0" />
          </Form.Item>
          
          <Form.Item
            name="comment"
            label="备注说明"
          >
            <Input.TextArea placeholder="请输入备注说明" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {compareVersions && (
        <VersionCompareModal
          open={compareModalOpen}
          versionId1={compareVersions.id1}
          versionName1={compareVersions.name1}
          versionId2={compareVersions.id2}
          versionName2={compareVersions.name2}
          onClose={() => setCompareModalOpen(false)}
        />
      )}

      <Modal
        title={<Space><DiffOutlined /> 版本对比</Space>}
        open={freeCompareOpen}
        onCancel={() => { setFreeCompareOpen(false); setFreeCompareLeft(''); setFreeCompareRight('') }}
        onOk={() => {
          const left = versions.find(v => v.id === freeCompareLeft)
          const right = versions.find(v => v.id === freeCompareRight)
          if (!left || !right) { message.warning('请选择两个版本'); return }
          if (left.id === right.id) { message.warning('请选择不同的版本'); return }
          setCompareVersions({
            id1: left.id,
            name1: left.name || `v${left.version}`,
            id2: right.id,
            name2: right.name || `v${right.version}`
          })
          setCompareModalOpen(true)
          setFreeCompareOpen(false)
          setFreeCompareLeft('')
          setFreeCompareRight('')
        }}
        okText="开始对比"
        cancelText="取消"
        okButtonProps={{ disabled: !freeCompareLeft || !freeCompareRight || freeCompareLeft === freeCompareRight }}
        width={600}
      >
        <Row gutter={16} align="middle">
          <Col span={10}>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#999' }}>旧版本</div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择旧版本"
              value={freeCompareLeft || undefined}
              onChange={setFreeCompareLeft}
              options={versions.map(v => ({ value: v.id, label: v.name || `v${v.version}` }))}
            />
          </Col>
          <Col span={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 16 }}>
            <SwapOutlined style={{ fontSize: 20, color: '#999' }} />
          </Col>
          <Col span={10}>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#999' }}>新版本</div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择新版本"
              value={freeCompareRight || undefined}
              onChange={setFreeCompareRight}
              options={versions.map(v => ({ value: v.id, label: v.name || `v${v.version}` }))}
            />
          </Col>
        </Row>
      </Modal>
    </div>
  )
}

export default VersionManagementTab
