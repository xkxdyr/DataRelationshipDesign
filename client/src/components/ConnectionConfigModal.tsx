import React, { useState, useEffect } from 'react'
import { Modal, Button, Card, Space, Typography, Tag, message, Tooltip, Spin } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, CloudServerOutlined, EnvironmentOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { connectionApi, ConnectionConfig } from '../services/api'
import { ConnectionForm } from './ConnectionForm'
import { useTheme } from '../theme/useTheme'

const { Title, Text } = Typography

interface ConnectionConfigModalProps {
  visible: boolean
  onClose: () => void
}

export const ConnectionConfigModal: React.FC<ConnectionConfigModalProps> = ({ visible, onClose }) => {
  const [connections, setConnections] = useState<ConnectionConfig[]>([])
  const [selectedConnection, setSelectedConnection] = useState<ConnectionConfig | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; responseTime?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const { colors } = useTheme()

  useEffect(() => {
    if (visible) {
      loadConnections()
    }
  }, [visible])

  const loadConnections = async () => {
    setLoading(true)
    try {
      const result = await connectionApi.getAll()
      if (result.success && result.data) {
        setConnections(result.data)
      }
    } catch (error) {
      console.error('Failed to load connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (formData?: any) => {
    const connectionData = formData || selectedConnection
    if (!connectionData) return
    
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await connectionApi.testConnection({
        databaseType: connectionData.databaseType,
        host: connectionData.host,
        port: typeof connectionData.port === 'string' ? parseInt(connectionData.port) : connectionData.port,
        databaseName: connectionData.databaseName,
        username: connectionData.username,
        password: connectionData.password || '',
        sslEnabled: connectionData.sslEnabled || false,
      })
      if (result.success && result.data) {
        setTestResult({ 
          success: result.data.success, 
          message: result.data.message,
          responseTime: result.data.responseTime 
        })
      }
    } catch (error) {
      setTestResult({ success: false, message: '测试连接失败' })
    } finally {
      setTestLoading(false)
    }
  }

  const handleCreate = async (data: any) => {
    try {
      const result = await connectionApi.create({
        name: data.name,
        databaseType: data.databaseType,
        host: data.host,
        port: parseInt(data.port),
        databaseName: data.databaseName,
        username: data.username,
        password: data.password,
        sslEnabled: data.sslEnabled,
        description: data.description,
      })
      if (result.success) {
        message.success('连接创建成功')
        loadConnections()
        resetForm()
      }
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handleUpdate = async (data: any) => {
    if (!selectedConnection) return
    try {
      const result = await connectionApi.update(selectedConnection.id, {
        name: data.name,
        databaseType: data.databaseType,
        host: data.host,
        port: parseInt(data.port),
        databaseName: data.databaseName,
        username: data.username,
        password: data.password,
        sslEnabled: data.sslEnabled,
        description: data.description,
      })
      if (result.success) {
        message.success('连接更新成功')
        loadConnections()
        resetForm()
      }
    } catch (error) {
      message.error('更新失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await connectionApi.delete(id)
      if (result.success) {
        message.success('连接删除成功')
        loadConnections()
        if (selectedConnection?.id === id) {
          resetForm()
        }
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const resetForm = () => {
    setSelectedConnection(null)
    setIsEditing(false)
    setTestResult(null)
  }

  const handleEdit = (record: ConnectionConfig) => {
    setSelectedConnection(record)
    setIsEditing(true)
    setTestResult(null)
  }

  const handleSubmit = (data: any) => {
    if (isEditing) {
      handleUpdate(data)
    } else {
      handleCreate(data)
    }
  }

  const getDatabaseTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      'MYSQL': 'blue',
      'POSTGRESQL': 'purple',
      'SQLITE': 'cyan',
      'SQLSERVER': 'orange',
      'ORACLE': 'red'
    }
    return typeColors[type] || 'default'
  }

  return (
    <Modal
      title={<><DatabaseOutlined style={{ marginRight: 8 }} />数据库连接管理</>}
      open={visible}
      onCancel={() => {
        resetForm()
        onClose()
      }}
      width={1000}
      footer={null}
      styles={{ body: { maxHeight: '75vh', overflow: 'hidden' } }}
    >
      <div style={{ display: 'flex', height: 'calc(75vh - 80px)', gap: 20 }}>
        {/* 左侧 - 连接列表 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>连接列表</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={resetForm}
            >
              新建连接
            </Button>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            paddingRight: 8
          }}>
            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: 200 
              }}>
                <Spin size="large" />
              </div>
            ) : connections.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '48px 24px',
                color: colors.textSecondary 
              }}>
                <DatabaseOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                <div>暂无数据库连接</div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={resetForm}
                  style={{ marginTop: 16 }}
                >
                  创建第一个连接
                </Button>
              </div>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {connections.map((connection) => (
                  <Card
                    key={connection.id}
                    size="small"
                    hoverable
                    style={{
                      border: selectedConnection?.id === connection.id 
                        ? `2px solid ${colors.primary}` 
                        : `1px solid ${colors.border}`,
                      borderRadius: 8,
                      boxShadow: selectedConnection?.id === connection.id 
                        ? '0 4px 12px rgba(0,0,0,0.1)' 
                        : 'none'
                    }}
                    onClick={() => {
                      setSelectedConnection(connection)
                      setIsEditing(false)
                      setTestResult(null)
                    }}
                    actions={[
                      <Tooltip title="编辑">
                        <EditOutlined 
                          key="edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(connection)
                          }}
                        />
                      </Tooltip>,
                      <Tooltip title="删除">
                        <DeleteOutlined 
                          key="delete"
                          style={{ color: colors.error }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(connection.id)
                          }}
                        />
                      </Tooltip>
                    ]}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${colors.primary}40 0%, ${colors.primary}10 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CloudServerOutlined style={{ fontSize: 24, color: colors.primary }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 16 }}>{connection.name}</Text>
                          <Tag color={getDatabaseTypeColor(connection.databaseType)}>
                            {connection.databaseType}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.textSecondary, fontSize: 12, marginBottom: 2 }}>
                          <EnvironmentOutlined style={{ fontSize: 12 }} />
                          <span>{connection.host}:{connection.port}</span>
                        </div>
                        <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {connection.databaseName}
                        </div>
                        {connection.description && (
                          <div style={{ 
                            color: colors.textSecondary, 
                            fontSize: 12, 
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: `1px dashed ${colors.border}`
                          }}>
                            {connection.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </div>
        </div>

        {/* 右侧 - 连接表单 */}
        <ConnectionForm
          isEditing={isEditing}
          initialData={selectedConnection}
          onSubmit={handleSubmit}
          onTestConnection={handleTestConnection}
          onCancel={resetForm}
          testLoading={testLoading}
          testResult={testResult}
        />
      </div>
    </Modal>
  )
}