import React, { useState, useEffect } from 'react'
import { Modal, message, Select } from 'antd'
import { DatabaseOutlined, PlusOutlined } from '@ant-design/icons'
import { connectionApi, reverseEngineeringApi, TableInfo, ConnectionConfig, Project } from '../services/api'
import { DatabaseImportForm, ConnectionFormData } from './DatabaseImportForm'

interface DatabaseImportModalProps {
  visible: boolean
  onClose: () => void
  onImport: (tables: TableInfo[], targetProjectId?: string) => void
  projects: Project[]
  currentProjectId?: string
}

export const DatabaseImportModal: React.FC<DatabaseImportModalProps> = ({ visible, onClose, onImport, projects, currentProjectId }) => {
  const [connections, setConnections] = useState<ConnectionConfig[]>([])
  const [selectedConnection, setSelectedConnection] = useState<ConnectionConfig | null>(null)
  const [tableList, setTableList] = useState<string[]>([])
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [targetProjectId, setTargetProjectId] = useState<string | undefined>(currentProjectId)

  useEffect(() => {
    if (visible) {
      loadConnections()
    } else {
      resetForm()
    }
  }, [visible])

  const loadConnections = async () => {
    try {
      const result = await connectionApi.getAll()
      if (result.success && result.data) {
        setConnections(result.data)
      }
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const handleConnectionSelect = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    setSelectedConnection(connection || null)
  }

  const handleTestConnection = async (data: ConnectionFormData) => {
    setLoading(true)
    setConnectionTestResult(null)
    try {
      const result = await connectionApi.testConnection(data)
      if (result.success && result.data) {
        setConnectionTestResult({ success: result.data.success, message: result.data.message })
      }
    } catch (error) {
      setConnectionTestResult({ success: false, message: '测试连接失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadTables = async (data: ConnectionFormData) => {
    if (!connectionTestResult?.success) {
      return
    }

    setLoading(true)
    try {
      const result = await reverseEngineeringApi.getTableList(data)
      if (result.success && result.data) {
        setTableList(result.data)
        setSelectedTables(result.data)
      }
    } catch (error) {
      console.error('Failed to load tables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (data: ConnectionFormData) => {
    if (selectedTables.length === 0) {
      return
    }

    if (!targetProjectId) {
      message.warning('请先选择目标项目')
      return
    }

    setImportLoading(true)
    try {
      console.log('Import request data:', { ...data, tables: selectedTables })
      const result = await reverseEngineeringApi.importFromDatabase({
        ...data,
        tables: selectedTables,
      })
      console.log('Import result:', result)
      if (result.success && result.data) {
        console.log('result.data:', result.data)
        const tablesToImport = result.data.tables || []
        console.log('tablesToImport:', tablesToImport)
        if (tablesToImport.length > 0) {
          onImport(tablesToImport, targetProjectId)
          message.success(`成功导入 ${tablesToImport.length} 张表`)
        } else {
          message.error('导入失败：未找到表数据')
        }
        onClose()
      } else {
        console.log('Import failed or no data:', result)
        message.error(result?.message || '导入失败')
      }
    } catch (error) {
      console.error('Failed to import:', error)
      message.error('导入失败')
    } finally {
      setImportLoading(false)
    }
  }

  const handleSelectTable = (table: string) => {
    if (selectedTables.includes(table)) {
      setSelectedTables(selectedTables.filter(t => t !== table))
    } else {
      setSelectedTables([...selectedTables, table])
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedTables(checked ? [...tableList] : [])
  }

  const resetForm = () => {
    setSelectedConnection(null)
    setTableList([])
    setSelectedTables([])
    setConnectionTestResult(null)
  }

  return (
    <Modal
      title={<><DatabaseOutlined style={{ marginRight: 8 }} />从数据库导入</>}
      open={visible}
      onCancel={() => {
        resetForm()
        onClose()
      }}
      width={800}
      footer={null}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      {/* 目标项目选择 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>目标项目</label>
        <Select
          value={targetProjectId}
          onChange={setTargetProjectId}
          placeholder="请选择目标项目"
          style={{ width: '100%' }}
          allowClear
        >
          {projects.map(project => (
            <Select.Option key={project.id} value={project.id}>
              {project.name}
            </Select.Option>
          ))}
        </Select>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#999' }}>
          选择导入到哪个项目，可选择现有项目或创建新项目后再导入
        </p>
      </div>
      
      <DatabaseImportForm
        connections={connections}
        selectedConnection={selectedConnection}
        onConnectionSelect={handleConnectionSelect}
        onTestConnection={handleTestConnection}
        onLoadTables={handleLoadTables}
        onImport={handleImport}
        tableList={tableList}
        selectedTables={selectedTables}
        onSelectTable={handleSelectTable}
        onSelectAll={handleSelectAll}
        loading={loading}
        importLoading={importLoading}
        connectionTestResult={connectionTestResult}
      />
    </Modal>
  )
}