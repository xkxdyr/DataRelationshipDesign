import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { List, Button, Card, Empty, Space, Popconfirm, Tag, Modal, Typography, Table, Divider, Statistic, Row, Col, Descriptions, Tooltip, Menu, message, Spin, Skeleton } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOutlined, EditOutlined, HistoryOutlined, ImportOutlined, ExportOutlined, EyeOutlined, TableOutlined, LinkOutlined, AppstoreOutlined, CopyOutlined, RotateLeftOutlined, CloudOutlined, DatabaseOutlined, CloudUploadOutlined, SaveOutlined, LoadingOutlined } from '@ant-design/icons'
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
    relationships,
    fontConfig,
    isLocalMode,
    isOnline,
    uploadProjectToCloud,
    saveProjectToLocal,
    projectListLoading
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

  // 预计算项目统计数据，避免每次渲染都重新计算
  const projectStatsMap = useMemo(() => {
    const stats = new Map<string, { tables: TableType[]; relationships: Relationship[]; totalColumns: number }>()
    projects.forEach(project => {
      const projectTables = tables.filter(t => t.projectId === project.id)
      const projectRelationships = relationships.filter(r => r.projectId === project.id)
      const totalColumns = projectTables.reduce((sum, t) => sum + (t.columns?.length || 0), 0)
      stats.set(project.id, { tables: projectTables, relationships: projectRelationships, totalColumns })
    })
    return stats
  }, [projects, tables, relationships])

  // 预计算可见操作
  const visibleActions = useMemo(() => {
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
  }, [containerWidth])

  // 预计算显示标志
  const shouldShowStats = useMemo(() => containerWidth !== 'extra-narrow', [containerWidth])
  const shouldShowDescription = useMemo(() => containerWidth === 'wide' || containerWidth === 'medium', [containerWidth])

  // 使用 useCallback 优化事件处理函数 - 先定义所有处理函数
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteProject(id)
  }, [deleteProject])

  const handleOpenEditModal = useCallback((project: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProjectId(project.id)
    setEditingProject(project)
    setIsEditModalOpen(true)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false)
    setEditingProjectId(null)
    setEditingProject(null)
  }, [])

  const handleOpenVersionModal = useCallback((projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProjectId(projectId)
    loadVersions(projectId)
    setIsVersionModalOpen(true)
  }, [loadVersions])

  const handleOpenCreateVersionModal = useCallback(() => {
    setIsCreateVersionModalOpen(true)
  }, [])

  const handleVersionCreated = useCallback(() => {
    if (selectedProjectId) {
      loadVersions(selectedProjectId)
    }
  }, [selectedProjectId, loadVersions])

  const handleRestoreVersion = useCallback(async (versionId: string) => {
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
  }, [restoreVersion, selectedProjectId, loadVersions])

  const handleOpenPreview = useCallback((projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewProjectId(projectId)
    setIsPreviewModalOpen(true)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, project: ProjectType) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuProject(project)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenuProject(null)
  }, [])

  // 上传项目到云端
  const handleUploadToCloud = useCallback(async (projectId: string) => {
    try {
      const result = await uploadProjectToCloud(projectId)
      if (result.success) {
        message.success(result.message)
      } else {
        message.error(result.message)
      }
    } catch (error) {
      message.error('上传失败: ' + (error as Error).message)
    }
  }, [uploadProjectToCloud])

  // 保存项目到本地
  const handleSaveToLocal = useCallback(async (projectId: string) => {
    try {
      const result = await saveProjectToLocal(projectId)
      if (result.success) {
        message.success(result.message)
      } else {
        message.error(result.message)
      }
    } catch (error) {
      message.error('保存失败: ' + (error as Error).message)
    }
  }, [saveProjectToLocal])

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

  const getStatusColor = (status: string) => {
    return status === 'PUBLISHED' ? 'success' : 'default'
  }

  const isLocalProject = (project: ProjectType) => {
    return project.id.startsWith('local_') || project.createdBy === 'local'
  }

  const getDatabaseTypeColor = (type: string) => {
    switch(type) {
      case 'MYSQL': return 'blue'
      case 'POSTGRESQL': return 'purple'
      case 'SQLITE': return 'orange'
      default: return 'default'
    }
  }
  
  const getContextMenuItems = useCallback(() => {
    if (!contextMenuProject) return []
    
    const isLocal = isLocalProject(contextMenuProject)
    
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
      // 根据项目类型显示不同的同步选项
      ...(isLocal ? [
        {
          key: 'uploadToCloud',
          label: '上传到云端',
          icon: <CloudUploadOutlined />,
          disabled: !isOnline
        }
      ] : [
        {
          key: 'saveToLocal',
          label: '保存到本地',
          icon: <SaveOutlined />
        }
      ]),
      { type: 'divider' as const },
      {
        key: 'delete',
        label: '删除项目',
        icon: <DeleteOutlined />,
        danger: true
      }
    ]
  }, [contextMenuProject, isOnline])

  const handleContextMenuAction = useCallback((action: string) => {
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
      case 'uploadToCloud':
        handleUploadToCloud(contextMenuProject.id)
        break
      case 'saveToLocal':
        handleSaveToLocal(contextMenuProject.id)
        break
      case 'delete':
        deleteProject(contextMenuProject.id)
        break
    }
    
    closeContextMenu()
  }, [contextMenuProject, selectProject, loadVersions, deleteProject, handleUploadToCloud, handleSaveToLocal, closeContextMenu])

  // 根据宽度决定显示的操作按钮
  const getVisibleActions = useCallback(() => visibleActions, [visibleActions])

  // 根据宽度决定是否显示统计信息
  const showStats = useCallback(() => shouldShowStats, [shouldShowStats])

  // 根据宽度决定是否显示描述
  const showDescription = useCallback(() => shouldShowDescription, [shouldShowDescription])

  // 获取项目预览数据
  const getProjectPreviewData = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return null
    
    const stats = projectStatsMap.get(projectId)
    if (!stats) return null
    
    let totalIndexes = 0
    stats.tables.forEach(table => {
      totalIndexes += (table.indexes?.length || 0)
    })
    
    return {
      project,
      tables: stats.tables,
      relationships: stats.relationships,
      totalColumns: stats.totalColumns,
      totalIndexes
    }
  }, [projects, projectStatsMap])

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card 
        title={
          <span style={{ 
            fontSize: `${fontConfig.subtitle}px`, 
            fontWeight: 600, 
            color: 'var(--theme-text)',
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
          backgroundColor: 'var(--theme-background-secondary)'
        }}
        styles={{ 
          header: { 
            padding: '8px 12px', 
            backgroundColor: 'var(--theme-card)',
            borderBottom: '1px solid var(--theme-border)',
            minHeight: 40
          },
          body: { 
            height: 'calc(100% - 41px)', 
            overflow: 'auto',
            padding: '4px 0',
            backgroundColor: 'var(--theme-background-secondary)'
          } 
        }}
      >
        {projectListLoading ? (
          <div style={{ padding: '16px' }}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
            <Skeleton active avatar paragraph={{ rows: 2 }} style={{ marginTop: '16px' }} />
            <Skeleton active avatar paragraph={{ rows: 2 }} style={{ marginTop: '16px' }} />
          </div>
        ) : projects.length === 0 ? (
          <Empty 
            description="暂无项目，点击上方按钮创建" 
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={projects}
            renderItem={(project) => {
              const isSelected = currentProject?.id === project.id;
              const stats = projectStatsMap.get(project.id);
              const projectTables = stats?.tables || [];
              const projectRelationships = stats?.relationships || [];
              const totalColumns = stats?.totalColumns || 0;
              const isLocal = isLocalProject(project);
              
              return (
            <List.Item
              style={{ 
                backgroundColor: isSelected ? 'rgba(24, 144, 255, 0.15)' : (isLocal ? 'rgba(250, 173, 20, 0.05)' : 'rgba(24, 144, 255, 0.03)'),
                cursor: 'pointer',
                borderRadius: 4,
                marginBottom: 2,
                padding: containerWidth === 'extra-narrow' ? '6px 8px' : '8px 12px',
                border: isSelected ? `2px solid var(--theme-primary)` : `1px solid ${isLocal ? 'rgba(250, 173, 20, 0.2)' : 'rgba(24, 144, 255, 0.1)'}`,
                transition: 'background-color 0.1s ease, border-color 0.1s ease',
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isLocal ? 'rgba(250, 173, 20, 0.1)' : 'rgba(24, 144, 255, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isLocal ? 'rgba(250, 173, 20, 0.05)' : 'rgba(24, 144, 255, 0.03)';
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, project)}
              actions={
                [
                  // 根据项目类型添加同步按钮
                  ...(containerWidth !== 'extra-narrow' ? [
                    isLocal ? (
                      <Tooltip title="上传到云端" key="upload">
                        <Button
                          type="text"
                          size="small"
                          icon={<CloudUploadOutlined />}
                          disabled={!isOnline}
                          style={{ 
                            padding: '4px 8px',
                            color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                            fontSize: 12,
                            borderRadius: 2
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUploadToCloud(project.id);
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="保存到本地" key="save">
                        <Button
                          type="text"
                          size="small"
                          icon={<SaveOutlined />}
                          style={{ 
                            padding: '4px 8px',
                            color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                            fontSize: 12,
                            borderRadius: 2
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToLocal(project.id);
                          }}
                        />
                      </Tooltip>
                    )
                  ] : []),
                  // 现有的操作按钮
                  ...visibleActions.map(action => {
                    if (action === 'preview') {
                      return (
                        <Tooltip title="预览项目" key="preview">
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            style={{ 
                              padding: '4px 8px',
                              color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
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
                              color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
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
                              color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
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
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Tooltip>
                        </Popconfirm>
                      )
                    }
                    return null
                  })
                ].filter(Boolean)
              }
              onClick={() => selectProject(project.id)}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isLocalProject(project) ? (
                      <DatabaseOutlined style={{ 
                        fontSize: 16, 
                        color: isSelected ? 'var(--theme-primary)' : '#faad14',
                        flexShrink: 0
                      }} />
                    ) : (
                      <CloudOutlined style={{ 
                        fontSize: 16, 
                        color: isSelected ? 'var(--theme-primary)' : '#1890ff',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
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
                        color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text)',
                        fontWeight: isSelected ? 600 : 500,
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
                          color: isSelected ? 'var(--theme-text-secondary)' : 'var(--theme-text-secondary)',
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
                  <Space size="small" style={{ marginTop: containerWidth === 'extra-narrow' ? 2 : 4, color: 'var(--theme-text-secondary)', fontSize: 10 }}>
                    <Tag 
                      color={getStatusColor(project.status)} 
                      style={{ 
                        margin: 0,
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 500,
                        border: 'none',
                        height: 'auto',
                        lineHeight: 1.4
                      }}
                    >
                      {project.status}
                    </Tag>
                    <Tag 
                      color={isLocalProject(project) ? 'orange' : 'blue'} 
                      style={{ 
                        margin: 0,
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        border: 'none',
                        height: 'auto',
                        lineHeight: 1.4,
                        boxShadow: isLocalProject(project) ? '0 1px 2px rgba(250, 173, 20, 0.2)' : '0 1px 2px rgba(24, 144, 255, 0.2)'
                      }}
                    >
                      {isLocalProject(project) ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <DatabaseOutlined style={{ fontSize: 10 }} />
                          本地
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CloudOutlined style={{ fontSize: 10 }} />
                          云端
                        </span>
                      )}
                    </Tag>
                    {(containerWidth === 'wide' || containerWidth === 'medium') && (
                      <Tag 
                        color={getDatabaseTypeColor(project.databaseType)} 
                        style={{ 
                          margin: 0,
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 500,
                          border: 'none',
                          height: 'auto',
                          lineHeight: 1.4
                        }}
                      >
                        {project.databaseType}
                      </Tag>
                    )}
                    {shouldShowStats && (
                      <>
                        {(containerWidth === 'wide') && (
                          <>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--theme-text-secondary)' }}>
                              <TableOutlined style={{ fontSize: 9 }} />
                              {projectTables.length}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--theme-text-secondary)' }}>
                              <AppstoreOutlined style={{ fontSize: 9 }} />
                              {totalColumns}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--theme-text-secondary)' }}>
                              <LinkOutlined style={{ fontSize: 9 }} />
                              {projectRelationships.length}
                            </span>
                          </>
                        )}
                        {(containerWidth === 'wide' || containerWidth === 'medium') && (
                          <>
                            <span style={{ fontWeight: 500, color: isSelected ? '#ffffff' : 'var(--theme-text)' }}>v{project.version}</span>
                            <span style={{ color: isSelected ? '#a8c8ed' : 'var(--theme-text-tertiary)' }}>
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
