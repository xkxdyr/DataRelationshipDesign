import React, { useState, useRef } from 'react'
import { Modal, Tabs, Button, Upload, message, Alert, Space, Typography } from 'antd'
import { DownloadOutlined, UploadOutlined, FileTextOutlined, DatabaseOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { exportService } from '../services/exportService'
import { importService, ImportResult } from '../services/importService'
import { projectApi, tableApi, columnApi, relationshipApi } from '../services/api'
import { Project, Table, Column, Relationship } from '../types'

const { Title, Text } = Typography

interface ImportExportModalProps {
  open: boolean
  onClose: () => void
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ open, onClose }) => {
  const { currentProject, tables, relationships, versions, loadProjects, selectProject } = useAppStore()
  const [activeTab, setActiveTab] = useState('export')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportJSON = () => {
    if (!currentProject) {
      message.warning('请先选择一个项目')
      return
    }

    setExporting(true)
    try {
      const data = exportService.exportToJSON(currentProject, tables, relationships, versions)
      const filename = `${currentProject.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
      exportService.downloadJSON(data, filename)
      message.success('JSON 导出成功')
    } catch (e) {
      message.error(`导出失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportSQL = () => {
    if (!currentProject) {
      message.warning('请先选择一个项目')
      return
    }

    setExporting(true)
    try {
      const sql = exportService.exportToSQL(currentProject, tables, relationships)
      const filename = `${currentProject.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${new Date().toISOString().slice(0, 10)}.sql`
      exportService.downloadSQL(sql, filename)
      message.success('SQL DDL 导出成功')
    } catch (e) {
      message.error(`导出失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }

  const processImportResult = async (result: ImportResult) => {
    if (!result.success || !result.project) {
      return
    }

    const newProject = await projectApi.create({
      name: result.project.name,
      description: result.project.description,
      databaseType: result.project.databaseType as 'MySQL' | 'PostgreSQL' | 'SQLite'
    })

    if (!newProject.success || !newProject.data) {
      message.error('创建项目失败')
      return
    }

    const createdProject = newProject.data

    for (const tableData of (result.tables || [])) {
      const tableResponse = await tableApi.create(createdProject.id, {
        name: tableData.name,
        comment: tableData.comment,
        positionX: tableData.positionX,
        positionY: tableData.positionY
      })

      if (tableResponse.success && tableResponse.data) {
        const tableId = tableResponse.data.id
        const tableColumns = (result.tables || []).find(t => t.name === tableData.name)

        if (tableColumns) {
          const columnsToCreate: Partial<Column>[] = []
          for (const col of tableColumns.columns || []) {
            if (Array.isArray(col)) {
              columnsToCreate.push({
                tableId,
                name: col[0]?.name || col.name,
                dataType: col[0]?.dataType || col.dataType || 'VARCHAR',
                length: col[0]?.length || col.length,
                nullable: col[0]?.nullable ?? true,
                primaryKey: col[0]?.primaryKey || false,
                unique: col[0]?.unique || false,
                autoIncrement: col[0]?.autoIncrement || false,
                order: 0
              })
            } else {
              columnsToCreate.push({
                tableId,
                name: (col as Column).name,
                dataType: (col as Column).dataType || 'VARCHAR',
                length: (col as Column).length,
                nullable: (col as Column).nullable ?? true,
                primaryKey: (col as Column).primaryKey || false,
                unique: (col as Column).unique || false,
                autoIncrement: (col as Column).autoIncrement || false,
                order: 0
              })
            }
          }

          for (const col of columnsToCreate) {
            await columnApi.create(tableId, col)
          }
        }
      }
    }

    for (const relData of (result.relationships || [])) {
      await relationshipApi.create(createdProject.id, {
        sourceTableId: relData.sourceTableId,
        sourceColumnId: relData.sourceColumnId,
        targetTableId: relData.targetTableId,
        targetColumnId: relData.targetColumnId,
        relationshipType: relData.relationshipType,
        onUpdate: relData.onUpdate,
        onDelete: relData.onDelete
      })
    }

    await loadProjects()
    await selectProject(createdProject.id)
    message.success('导入成功')
  }

  const handleImportJSON = async (file: File) => {
    setImporting(true)
    setImportResult(null)

    try {
      const result = await importService.importFromJSON(file, { type: 'create_new' })
      setImportResult(result)

      if (result.success) {
        await processImportResult(result)
        onClose()
      }
    } catch (e) {
      message.error(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setImporting(false)
    }

    return false
  }

  const handleImportSQL = async (file: File) => {
    setImporting(true)
    setImportResult(null)

    try {
      const result = await importService.importFromSQL(file)
      setImportResult(result)

      if (result.success) {
        await processImportResult(result)
        onClose()
      }
    } catch (e) {
      message.error(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setImporting(false)
    }

    return false
  }

  const renderExport = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={5}>导出项目</Title>
      {!currentProject ? (
        <Alert message="请先在左侧选择一个项目再进行导出" type="warning" showIcon />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text strong>当前项目：</Text> {currentProject.name}
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              包含 {tables.length} 个表，{relationships.length} 个关系
            </Text>
          </div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportJSON}
              loading={exporting}
              block
            >
              导出为 JSON
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportSQL}
              loading={exporting}
              block
            >
              导出为 SQL DDL
            </Button>
          </Space>
        </>
      )}
    </div>
  )

  const renderImport = () => (
    <div style={{ padding: '20px 0' }}>
      <Title level={5}>导入项目</Title>

      {importResult && !importResult.success && importResult.errors && (
        <Alert
          message="导入失败"
          description={importResult.errors.join('；')}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {importResult && importResult.success && (
        <Alert
          message="导入预览"
          description={
            <div>
              <div>项目: {importResult.project?.name}</div>
              <div>表: {importResult.tables?.length || 0}</div>
              <div>关系: {importResult.relationships?.length || 0}</div>
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="warning">警告: {importResult.warnings.join('；')}</Text>
                </div>
              )}
            </div>
          }
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab as (key: string) => void}
        items={[
          {
            key: 'json',
            label: (
              <span>
                <FileTextOutlined />
                JSON 文件
              </span>
            ),
            children: (
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImportJSON}
                disabled={importing}
              >
                <Button icon={<UploadOutlined />} loading={importing} block>
                  选择 JSON 文件导入
                </Button>
              </Upload>
            )
          },
          {
            key: 'sql',
            label: (
              <span>
                <DatabaseOutlined />
                SQL DDL 文件
              </span>
            ),
            children: (
              <Upload
                accept=".sql"
                showUploadList={false}
                beforeUpload={handleImportSQL}
                disabled={importing}
              >
                <Button icon={<UploadOutlined />} loading={importing} block>
                  选择 SQL DDL 文件导入
                </Button>
              </Upload>
            )
          }
        ]}
      />

      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          支持的格式：JSON（完整项目备份）、SQL（CREATE TABLE 语句）
        </Text>
      </div>
    </div>
  )

  return (
    <Modal
      title="导入/导出"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab as (key: string) => void}
        items={[
          { key: 'export', label: '导出', children: renderExport() },
          { key: 'import', label: '导入', children: renderImport() }
        ]}
      />
    </Modal>
  )
}

export default ImportExportModal