import React, { useState, useMemo, useRef, useEffect } from 'react'
import { List, Button, Card, Empty, Space, Popconfirm, Tag, Modal, Typography, Table, Divider, Statistic, Row, Col, Descriptions, Tooltip, Menu, message } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOutlined, EditOutlined, HistoryOutlined, ImportOutlined, ExportOutlined, EyeOutlined, TableOutlined, LinkOutlined, AppstoreOutlined, CopyOutlined, RotateLeftOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { Version, Project as ProjectType, Table as TableType, Relationship, Column, Index } from '../types'
import { ImportExportModal } from './ImportExportModal'
import { CreateProjectModal } from './CreateProjectModal'
import { EditProjectModal } from './EditProjectModal'
import { CreateVersionModal } from './CreateVersionModal'

const { Text, Paragraph } = Typography

type ContainerWidth = 'extra-narrow' | 'narrow' | 'medium' | 'wide'

const ProjectList: React.FC = () => {
  const { 
    projects, 
    deleteProject, 
    selectProject, 
    currentProject, 
    loadProjects, 
    loadVersions,
    deleteVersion,
    restoreVersion,
    versions,
    tables,
    relationships
  } = useAppStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false)
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [importExportInitialTab, setImportExportInitialTab] = useState<'import' | 'export'>('export')
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectType | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null)
  const [contextMenuProject, setContextMenuProject] = useState<ProjectType | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [containerWidth, setContainerWidth] = useState<ContainerWidth>('medium')
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 监听容器宽度变化
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width
        let newWidth: ContainerWidth
        if (width < 200) {
          newWidth = 'extra-narrow'
        } else if (width < 280) {
          newWidth = 'narrow'
        } else if (width < 380) {
          newWidth = 'medium'
        } else {
          newWidth = 'wide'
        }
        setContainerWidth(newWidth)
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deleteProject(id)
  }

  const handleOpenEditModal = (project: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProjectId(project.id)
    setEditingProject(project)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingProjectId(null)
    setEditingProject(null)
  }

  const handleOpenVersionModal = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProjectId(projectId)
    loadVersions(projectId)
    setIsVersionModalOpen(true)
  }

  const handleOpenCreateVersionModal = () => {
    setIsCreateVersionModalOpen(true)
  }

  const handleVersionCreated = () => {
    if (selectedProjectId) {
      loadVersions(selectedProjectId)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    try {
      await restoreVersion(versionId)
      message.success('版本回滚成功')
      setIsVersionModalOpen(false)
      if (selectedProjectId) {
        loadVersions(selectedProjectId)
      }
    } catch (error) {
      message.error('版本回滚失败: ' + (error as Error).message)
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

  const handleOpenPreview = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewProjectId(projectId)
    setIsPreviewModalOpen(true)
  }

  const getProjectPreviewData = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return null
    
    const projectTables = tables.filter(t => t.projectId === projectId)
    const projectRelationships = relationships.filter(r => r.projectId === projectId)
    
    let totalColumns = 0
    let totalIndexes = 0
    
    projectTables.forEach(table => {
      totalColumns += (table.columns?.length || 0)
      totalIndexes += (table.indexes?.length || 0)
    })
    
    return {
      project,
      tables: projectTables,
      relationships: projectRelationships,
      totalColumns,
      totalIndexes
    }
  }
  
  const handleContextMenu = (e: React.MouseEvent, project: ProjectType) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuProject(project)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }
  
  const closeContextMenu = () => {
    setContextMenuProject(null)
  }
  
  const handleContextMenuAction = (action: string) => {
    if (!contextMenuProject) return
    
    switch (action) {
      case 'open':
        selectProject(contextMenuProject.id)
        break
      case 'preview':
        setPreviewProjectId(contextMenuProject.id)
        setIsPreviewModalOpen(true)
        break
      case 'edit':
        setEditingProjectId(contextMenuProject.id)
        setEditingProject(contextMenuProject)
        setIsEditModalOpen(true)
        break
      case 'version':
        setSelectedProjectId(contextMenuProject.id)
        loadVersions(contextMenuProject.id)
        setIsVersionModalOpen(true)
        break
      case 'export':
        selectProject(contextMenuProject.id)
        setImportExportInitialTab('export')
        setIsImportExportModalOpen(true)
        break
      case 'delete':
        deleteProject(contextMenuProject.id)
        break
    }
    
    closeContextMenu()
  }
  
  const getContextMenuItems = () => {
    if (!contextMenuProject) return []
    
    return [
      {
        key: 'open',
        label: '打开项目',
        icon: <FolderOutlined />
      },
      {
        key: 'preview',
        label: '项目预览',
        icon: <EyeOutlined />
      },
      { type: 'divider' as const },
      {
        key: 'edit',
        label: '编辑项目',
        icon: <EditOutlined />
      },
      {
        key: 'version',
        label: '版本管理',
        icon: <HistoryOutlined />
      },
      {
        key: 'export',
        label: '导出项目',
        icon: <ExportOutlined />
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        label: '删除项目',
        icon: <DeleteOutlined />,
        danger: true
      }
    ]
  }

  // 根据宽度决定显示的操作按钮
  const getVisibleActions = () => {
    switch(containerWidth) {
      case 'extra-narrow':
        return ['delete']
      case 'narrow':
        return ['edit', 'delete']
      case 'medium':
        return ['preview', 'edit', 'delete']
      default:
        return ['preview', 'version', 'edit', 'delete']
    }
  }

  // 根据宽度决定是否显示统计信息
  const showStats = () => {
    return containerWidth !== 'extra-narrow'
  }

  // 根据宽度决定是否显示描述
  const showDescription = () => {
    return containerWidth === 'wide' || containerWidth === 'medium'
  }

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card 
        title={
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: '#3c3f41',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            项目列表
          </span>
        }
        extra={
          <Space size="small">
            {(containerWidth === 'wide' || containerWidth === 'medium') && (
              <>
                <Button 
                  icon={<ImportOutlined />} 
                  onClick={() => {
                    setImportExportInitialTab('import')
                    setIsImportExportModalOpen(true)
                  }}
                  size="small"
                >
                  导入
                </Button>
                <Button 
                  icon={<ExportOutlined />} 
                  onClick={() => {
                    setImportExportInitialTab('export')
                    setIsImportExportModalOpen(true)
                  }}
                  size="small"
                >
                  导出
                </Button>
              </>
            )}
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleOpenModal}
              size="small"
            >
              {(containerWidth === 'wide') ? '新建项目' : ''}
            </Button>
          </Space>
        }
        style={{ 
          height: '100%', 
          border: 'none', 
          borderRadius: 0, 
          margin: 0, 
          padding: 0,
          backgroundColor: '#f5f5f5'
        }}
        styles={{ 
          header: { 
            padding: '8px 12px', 
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e5e5',
            minHeight: 40
          },
          body: { 
            height: 'calc(100% - 41px)', 
            overflow: 'auto',
            padding: '4px 0',
            backgroundColor: '#f5f5f5'
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
            renderItem={(project) => {
              const isSelected = currentProject?.id === project.id;
              const projectTables = tables.filter(t => t.projectId === project.id);
              const projectRelationships = relationships.filter(r => r.projectId === project.id);
              const totalColumns = projectTables.reduce((sum, t) => sum + (t.columns?.length || 0), 0);
              const visibleActions = getVisibleActions();
              
              return (
            <List.Item
              style={{ 
                backgroundColor: isSelected ? '#3879d9' : 'transparent',
                cursor: 'pointer',
                borderRadius: 4,
                marginBottom: 2,
                padding: containerWidth === 'extra-narrow' ? '6px 8px' : '8px 12px',
                border: 'none',
                transition: 'background-color 0.1s ease',
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, project)}
              actions={
                visibleActions.map(action => {
                  if (action === 'preview') {
                    return (
                      <Tooltip title="预览项目" key="preview">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          style={{ 
                            padding: '4px 8px',
                            color: isSelected ? '#ffffff' : '#666666',
                            fontSize: 12,
                            borderRadius: 2
                          }}
                          onClick={(e) => handleOpenPreview(project.id, e)}
                        />
                      </Tooltip>
                    )
                  }
                  if (action === 'version') {
                    return (
                      <Tooltip title="版本管理" key="version">
                        <Button
                          type="text"
                          size="small"
                          icon={<HistoryOutlined />}
                          style={{ 
                            padding: '4px 8px',
                            color: isSelected ? '#ffffff' : '#666666',
                            fontSize: 12,
                            borderRadius: 2
                          }}
                          onClick={(e) => handleOpenVersionModal(project.id, e)}
                        />
                      </Tooltip>
                    )
                  }
                  if (action === 'edit') {
                    return (
                      <Tooltip title="编辑项目" key="edit">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          style={{ 
                            padding: '4px 8px',
                            color: isSelected ? '#ffffff' : '#666666',
                            fontSize: 12,
                            borderRadius: 2
                          }}
                          onClick={(e) => handleOpenEditModal(project, e)}
                        />
                      </Tooltip>
                    )
                  }
                  if (action === 'delete') {
                    return (
                      <Popconfirm
                        key="delete"
                        title="确定删除这个项目吗？"
                        description="删除后不可恢复"
                        onConfirm={() => handleDelete(project.id)}
                        okText="确定"
                        cancelText="取消"
                        okButtonProps={{ danger: true, type: 'primary' }}
                      >
                        <Tooltip title="删除项目">
                          <Button 
                            type="text" 
                            danger 
                            size="small" 
                            icon={<DeleteOutlined />}
                            style={{ 
                              padding: '4px 8px',
                              fontSize: 12,
                              borderRadius: 2
                            }}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )
                  }
                  return null
                }).filter(Boolean)
              }
              onClick={() => selectProject(project.id)}
            >
              <List.Item.Meta
                avatar={
                  <FolderOutlined style={{ 
                    fontSize: containerWidth === 'extra-narrow' ? 16 : 18, 
                    color: isSelected ? '#ffffff' : '#7a7a7a',
                    flexShrink: 0,
                    minWidth: 24,
                    marginRight: 8
                  }} />
                }
                title={
                  <div style={{ 
                    overflow: 'hidden', 
                    whiteSpace: 'nowrap', 
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'nowrap'
                  }}>
                    <Tooltip title={project.name} placement="topLeft">
                      <Text style={{ 
                        fontSize: containerWidth === 'extra-narrow' ? 12 : 13, 
                        color: isSelected ? '#ffffff' : '#333333',
                        fontWeight: 500,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: containerWidth === 'extra-narrow' ? 100 : containerWidth === 'narrow' ? 140 : containerWidth === 'medium' ? 200 : 280,
                        flexShrink: 0,
                        display: 'inline-block'
                      }}>
                        {project.name}
                      </Text>
                    </Tooltip>
                    {showDescription() && project.description && (
                      <Tooltip title={project.description} placement="topLeft">
                        <Text style={{ 
                          fontSize: 11, 
                          color: isSelected ? '#a8c8ed' : '#999999',
                          flexShrink: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: containerWidth === 'extra-narrow' ? 0 : containerWidth === 'narrow' ? 80 : containerWidth === 'medium' ? 120 : 200,
                          display: 'inline-block',
                          marginLeft: 4
                        }}>
                          — {project.description}
                        </Text>
                      </Tooltip>
                    )}
                  </div>
                }
                description={
                  <Space size="small" style={{ marginTop: containerWidth === 'extra-narrow' ? 2 : 4, color: isSelected ? '#a8c8ed' : '#8c8c8c', fontSize: 10 }}>
                    <Tag 
                      color={isSelected ? 'blue' : getStatusColor(project.status)} 
                      style={{ 
                        margin: 0,
                        borderRadius: 2,
                        padding: '0 6px',
                        fontSize: 9,
                        fontWeight: 500,
                        border: 'none',
                        height: 16,
                        lineHeight: '14px',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : undefined,
                        color: isSelected ? '#ffffff' : undefined
                      }}
                    >
                      {project.status}
                    </Tag>
                    {(containerWidth === 'wide' || containerWidth === 'medium') && (
                      <Tag 
                        color={isSelected ? 'blue' : getDatabaseTypeColor(project.databaseType)} 
                        style={{ 
                          margin: 0,
                          borderRadius: 2,
                          padding: '0 6px',
                          fontSize: 9,
                          fontWeight: 500,
                          border: 'none',
                          height: 16,
                          lineHeight: '14px',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : undefined,
                          color: isSelected ? '#ffffff' : undefined
                        }}
                      >
                        {project.databaseType}
                      </Tag>
                    )}
                    {showStats() && (
                      <>
                        {(containerWidth === 'wide') && (
                          <>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <TableOutlined style={{ fontSize: 9 }} />
                              {projectTables.length}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <AppstoreOutlined style={{ fontSize: 9 }} />
                              {totalColumns}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <LinkOutlined style={{ fontSize: 9 }} />
                              {projectRelationships.length}
                            </span>
                          </>
                        )}
                        {(containerWidth === 'wide' || containerWidth === 'medium') && (
                          <>
                            <span style={{ fontWeight: 500 }}>v{project.version}</span>
                            <span style={{ color: isSelected ? '#a8c8ed' : '#aaaaaa' }}>
                              {new Date(project.createdAt).toLocaleDateString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </Space>
                }
              />
            </List.Item>
              );
            }}
        />
      )}
      </Card>

      <CreateProjectModal
        open={isModalOpen}
        onClose={handleCloseModal}
      />

      <EditProjectModal
        open={isEditModalOpen}
        project={editingProject}
        onClose={handleCloseEditModal}
      />

      <Modal
        title="版本管理"
        open={isVersionModalOpen}
        onCancel={() => setIsVersionModalOpen(false)}
        width={700}
        footer={[
          <Button key="create-version" type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateVersionModal}>
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
              width: 200,
              render: (record: Version) => (
                <Space size="small">
                  <Tooltip title="回滚到此版本">
                    <Popconfirm
                      title="确定回滚到此版本吗？"
                      description="回滚后将覆盖当前项目的所有表和关系"
                      onConfirm={() => handleRestoreVersion(record.id)}
                      okText="确定"
                      cancelText="取消"
                      okButtonProps={{ type: 'primary' }}
                    >
                      <Button type="text" size="small" icon={<RotateLeftOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                  <Tooltip title="删除版本">
                    <Popconfirm
                      title="确定删除这个版本吗？"
                      onConfirm={() => deleteVersion(record.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </Space>
              )
            }
          ]}
        />
      </Modal>

      <CreateVersionModal
        open={isCreateVersionModalOpen}
        selectedProjectId={selectedProjectId}
        onClose={() => setIsCreateVersionModalOpen(false)}
        onSuccess={handleVersionCreated}
      />

      <ImportExportModal
        open={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        initialTab={importExportInitialTab}
      />
      
      {/* 右键菜单 */}
      {contextMenuProject && (
        <>
          {/* 点击其他地方关闭右键菜单 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998
            }}
            onClick={closeContextMenu}
          />
          {/* 菜单内容 */}
          <div
            style={{
              position: 'fixed',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Menu
              items={getContextMenuItems()}
              onClick={({ key }) => handleContextMenuAction(key)}
              style={{ minWidth: 160 }}
            />
          </div>
        </>
      )}
      
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>项目预览</span>
          </Space>
        }
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        footer={[
          <Button key="close-preview" onClick={() => setIsPreviewModalOpen(false)}>
            关闭
          </Button>,
          <Button 
            key="open-project" 
            type="primary" 
            onClick={() => {
              if (previewProjectId) {
                selectProject(previewProjectId)
                setIsPreviewModalOpen(false)
              }
            }}
          >
            打开项目
          </Button>
        ]}
        width={800}
      >
        {(() => {
          const previewData = previewProjectId ? getProjectPreviewData(previewProjectId) : null
          
          if (!previewData) {
            return <Empty description="无法获取预览数据" />
          }
          
          return (
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
          )
        })()}
      </Modal>
    </div>
  )
}

export default ProjectList
