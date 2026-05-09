import React, { useState, useEffect } from 'react'
import { Modal, Button, Space, Typography, Select, Tabs, message, Alert, Card, Tooltip } from 'antd'
import { CodeOutlined, DownloadOutlined, CopyOutlined, CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { exportService } from '../services/exportService'
import { importService } from '../services/importService'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface SQLEditorProps {
  visible: boolean
  onClose: () => void
}

const databaseTypeOptions = [
  { value: 'MYSQL', label: 'MySQL' },
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQLITE', label: 'SQLite' },
  { value: 'SQLSERVER', label: 'SQL Server' },
  { value: 'ORACLE', label: 'Oracle' }
]

export const SQLEditor: React.FC<SQLEditorProps> = ({ visible, onClose }) => {
  const { currentProject, tables, relationships } = useAppStore()
  const [activeTab, setActiveTab] = useState<'editor' | 'generator'>('generator')
  const [databaseType, setDatabaseType] = useState<string>('MYSQL')
  const [sqlContent, setSqlContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (visible && currentProject) {
      setDatabaseType(currentProject.databaseType || 'MYSQL')
      refreshGeneratedSQL()
    }
  }, [visible, currentProject])

  const refreshGeneratedSQL = () => {
    if (!currentProject) return

    try {
      const sql = exportService.exportToSQL(
        { ...currentProject, databaseType },
        tables,
        relationships,
        {
          databaseType: databaseType as any,
          includeComments: true,
          includeDropTable: true,
          formatSql: true,
          uppercaseKeywords: true
        }
      )
      if (activeTab === 'generator') {
        setSqlContent(sql)
      }
    } catch (e) {
      console.error('生成SQL失败:', e)
    }
  }

  useEffect(() => {
    if (visible) {
      refreshGeneratedSQL()
    }
  }, [databaseType, tables, relationships])

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(sqlContent)
      message.success('SQL已复制到剪贴板')
    } catch (e) {
      message.error('复制失败')
    }
  }

  const handleDownloadSQL = () => {
    if (!sqlContent) return

    const selectedDbType = databaseTypeOptions.find(dt => dt.value === databaseType)
    const dbTypeLabel = selectedDbType?.label || databaseType
    const fileName = `${currentProject?.name?.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') || 'database'}_${dbTypeLabel.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.sql`
    
    exportService.downloadSQL(sqlContent, fileName)
    message.success('SQL下载成功')
  }

  const handleImportSQL = async () => {
    if (!sqlContent.trim()) {
      message.warning('请先输入SQL内容')
      return
    }

    setIsImporting(true)
    try {
      const tempFile = new File([sqlContent], 'temp.sql', { type: 'text/plain' })
      const result = await importService.importFromSQL(tempFile)
      if (result.success) {
        message.success(`成功解析: ${result.tables?.length || 0} 个表`)
        onClose()
      } else {
        const errorMsg = result.errors?.[0] || '导入失败'
        message.error(errorMsg)
      }
    } catch (e) {
      message.error('导入失败: ' + (e as Error).message)
    } finally {
      setIsImporting(false)
    }
  }

  const highlightSQL = (sql: string) => {
    if (!sql) return ''

    let highlighted = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    const keywords = [
      'CREATE', 'TABLE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE',
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
      'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'AUTO_INCREMENT',
      'DEFAULT', 'UNIQUE', 'INDEX', 'CONSTRAINT', 'INT', 'VARCHAR', 'TEXT',
      'DATETIME', 'TIMESTAMP', 'DATE', 'BOOLEAN', 'FLOAT', 'DOUBLE', 'DECIMAL',
      'CHAR', 'BIGINT', 'SMALLINT', 'TINYINT', 'BIT', 'BLOB', 'CLOB',
      'IF', 'EXISTS', 'ENGINE', 'CHARSET', 'COLLATE', 'COMMENT'
    ]

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi')
      highlighted = highlighted.replace(regex, '<span style="color: #0000ff; font-weight: bold;">$1</span>')
    })

    highlighted = highlighted.replace(/(['`])(.*?)\1/g, '<span style="color: #a31515;">$1$2$1</span>')
    highlighted = highlighted.replace(/(--.*$)/gm, '<span style="color: #008000;">$1</span>')

    return highlighted
  }

  return (
    <Modal
      title={<Space><CodeOutlined /><span>SQL编辑器</span></Space>}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button onClick={handleCopySQL} icon={<CopyOutlined />}>复制SQL</Button>
          <Button type="primary" onClick={handleDownloadSQL} icon={<DownloadOutlined />}>下载SQL</Button>
          {activeTab === 'editor' && (
            <Button 
              type="primary" 
              danger 
              onClick={handleImportSQL} 
              loading={isImporting}
              icon={<PlayCircleOutlined />}
            >
              导入到项目
            </Button>
          )}
        </Space>
      }
      styles={{ body: { maxHeight: '70vh', overflow: 'hidden' } }}
    >
      {!currentProject ? (
        <Alert
          message="请先选择一个项目"
          description="在项目列表中选择一个项目后，才能使用SQL编辑器"
          type="warning"
          showIcon
        />
      ) : (
        <div style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={(key) => setActiveTab(key as 'editor' | 'generator')}
            style={{ flex: '0 0 auto', marginBottom: 16 }}
          >
            <TabPane tab="生成DDL" key="generator" />
            <TabPane tab="编辑SQL" key="editor" />
          </Tabs>

          {activeTab === 'generator' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Space style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                <Select
                  value={databaseType}
                  onChange={setDatabaseType}
                  options={databaseTypeOptions}
                  style={{ width: 150 }}
                />
              </Space>

              <Card
                size="small"
                style={{ flex: 1, overflow: 'hidden' }}
                bodyStyle={{ 
                  height: '100%', 
                  overflow: 'auto', 
                  padding: '12px',
                  background: '#1e1e1e',
                  color: '#d4d4d4'
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightSQL(sqlContent) }}
                />
              </Card>

              <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0f5ff', borderRadius: 4 }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      表: {tables.length} 个 | 列: {tables.reduce((sum, t) => sum + (t.columns?.length || 0), 0)} 个 | 
                      关系: {relationships.length} 个 | 索引: {tables.reduce((sum, t) => sum + (t.indexes?.length || 0), 0)} 个
                    </Text>
                  </Space>
                </Space>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Space style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  在此编辑SQL代码，支持直接从SQL导入表结构
                </Text>
              </Space>
              <textarea
                value={sqlContent}
                onChange={(e) => setSqlContent(e.target.value)}
                style={{
                  flex: 1,
                  width: '100%',
                  padding: '12px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  resize: 'none',
                  background: '#1e1e1e',
                  color: '#d4d4d4'
                }}
                placeholder="在此输入SQL语句，例如：&#10;CREATE TABLE users (&#10;  id INT PRIMARY KEY AUTO_INCREMENT,&#10;  name VARCHAR(50) NOT NULL,&#10;  email VARCHAR(100) UNIQUE&#10;);"
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
