import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Form, Input, Select, Button, Upload, message, Alert, Space, Typography, Switch, Card, Tag, Descriptions, Badge, Modal } from 'antd'
import { DownloadOutlined, UploadOutlined, FileTextOutlined, DatabaseOutlined, CheckCircleOutlined, SettingOutlined, PlusOutlined, FileWordOutlined, SafetyCertificateOutlined, InfoCircleOutlined, XOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { exportService } from '../services/exportService'
import { importService, ImportResult } from '../services/importService'
import { projectApi, tableApi, columnApi, relationshipApi, indexApi } from '../services/api'
import { localStorageService } from '../services/localStorageService'
import { Table, Column, Relationship, Index } from '../types'
import type { LocalProject, LocalTable, LocalColumn, LocalRelationship, LocalIndex } from '../services/localStorageService'
import { DDLOptions } from '../ddl/types'

const { Title, Text } = Typography
const { Option } = Select

const databaseTypeOptions = [
  { value: 'MYSQL', label: 'MySQL' },
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQLITE', label: 'SQLite' },
  { value: 'SQLSERVER', label: 'SQL Server' },
  { value: 'ORACLE', label: 'Oracle' }
]

const UI_COLORS = {
  BORDER: '#e8e8e8',
  DIVIDER: '#f0f0f0',
  GREEN: '#52c41a',
  GREEN_DARK: '#389e0d',
  BLUE: '#1890ff',
  BLUE_DARK: '#096dd9',
  PURPLE_END: '#764ba2',
  DASHED_BORDER: '#d9d9d9',
  BG_LIGHT: '#fafafa',
}

interface ImportFileCardProps {
  accept: string
  title: string
  subtitle: string
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
  onImport: (file: File) => Promise<boolean>
  disabled: boolean
}

const ImportFileCard = React.memo(({
  accept, title, subtitle, icon, gradientFrom, gradientTo, onImport, disabled
}: ImportFileCardProps) => (
  <Card
    size="small"
    style={{
      borderRadius: 12,
      border: `2px dashed ${UI_COLORS.DASHED_BORDER}`,
      background: UI_COLORS.BG_LIGHT,
      cursor: 'pointer',
      transition: 'all 0.3s'
    }}
    styles={{ body: { padding: 0 } }}
    hoverable
  >
    <Upload
      accept={accept}
      showUploadList={false}
      beforeUpload={onImport}
      disabled={disabled}
    >
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12, margin: '0 auto 16px',
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>{title}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
      </div>
    </Upload>
  </Card>
))

interface ImportConfirmModalProps {
  open: boolean
  importResult: ImportResult | null
  importing: boolean
  importForm: any
  onCancel: () => void
  onOk: () => void
}

const ImportConfirmModal = React.memo(({
  open, importResult, importing, importForm, onCancel, onOk
}: ImportConfirmModalProps) => (
  <Modal
    title={
      <Space>
        <CheckCircleOutlined style={{ color: UI_COLORS.GREEN }} />
        <span>确认导入</span>
      </Space>
    }
    open={open}
    onCancel={onCancel}
    onOk={onOk}
    confirmLoading={importing}
    width={520}
    okText="确认导入"
    cancelText="取消"
  >
    {importResult && importResult.success ? (
      <div>
        <Alert
          message="导入预览"
          description={
            <Descriptions column={2} size="small" style={{ marginTop: 8 }}>
              <Descriptions.Item label="项目名称">
                <Text strong>{importResult.project?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="数据库类型">
                <Tag color="blue">{importResult.project?.databaseType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="表数量">
                <Badge count={importResult.tables?.length || 0} style={{ backgroundColor: UI_COLORS.BLUE }} />
              </Descriptions.Item>
              <Descriptions.Item label="关系数量">
                <Badge count={importResult.relationships?.length || 0} style={{ backgroundColor: UI_COLORS.GREEN }} />
              </Descriptions.Item>
            </Descriptions>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
        {importResult.warnings && importResult.warnings.length > 0 && (
          <Alert
            message="警告信息"
            description={importResult.warnings.join('；')}
            type="warning"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        <Form form={importForm} layout="vertical">
          <Form.Item
            label="项目名称"
            name="projectName"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" size="large" />
          </Form.Item>
          <Form.Item label="数据库类型" name="databaseType">
            <Select style={{ width: '100%' }} size="large">
              {databaseTypeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </div>
    ) : (
      <div>
        <Alert message="无导入数据" type="warning" showIcon />
      </div>
    )}
  </Modal>
))

interface ExportFormatCardProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
  buttonText: string
  buttonIcon: React.ReactNode
  buttonType?: 'primary' | 'default'
  onExport: () => void
  loading: boolean
  disabled?: boolean
}

const ExportFormatCard = React.memo(({
  title, subtitle, icon, gradientFrom, gradientTo,
  buttonText, buttonIcon, buttonType = 'default',
  onExport, loading, disabled
}: ExportFormatCardProps) => (
  <Card
    size="small"
    style={{ borderRadius: 12, border: `1px solid ${UI_COLORS.BORDER}` }}
    styles={{ body: { padding: 0 } }}
  >
    <div style={{ padding: '20px 20px 16px 20px', borderBottom: `1px solid ${UI_COLORS.DIVIDER}` }}>
      <Space>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div>
          <Text strong style={{ fontSize: 14, display: 'block' }}>{title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
        </div>
      </Space>
    </div>
    <div style={{ padding: '16px 20px' }}>
      <Button
        type={buttonType}
        icon={buttonIcon}
        onClick={onExport}
        loading={loading}
        block
        size="large"
        disabled={disabled}
        style={{ borderRadius: 8, height: 44 }}
      >
        {buttonText}
      </Button>
    </div>
  </Card>
))

interface ImportExportTabProps {
  initialTab?: 'import' | 'export'
  onClose?: () => void
}

export const ImportExportTab: React.FC<ImportExportTabProps> = ({ initialTab = 'export', onClose }) => {
  const { currentProject, tables, relationships, versions, loadProjects, selectProject, tablePrefix, tablePrefixPresets, setTablePrefix, addTablePrefixPreset, removeTablePrefixPreset, isLocalMode, createProject, openTabs, closeTab } = useAppStore()
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab)

  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [form] = Form.useForm()
  const [importForm] = Form.useForm()
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [pendingImportType, setPendingImportType] = useState<'json' | 'sql' | null>(null)
  const [detectedDatabaseType, setDetectedDatabaseType] = useState<string>('MYSQL')
  const [pendingImportValues, setPendingImportValues] = useState<{ projectName: string; databaseType: string } | null>(null)

  useEffect(() => {
    if (currentProject && activeTab === 'export') {
      form.setFieldsValue({
        databaseType: currentProject.databaseType || 'MYSQL',
        includeComments: true,
        includeDropTable: false,
        tablePrefix: tablePrefix,
        schema: 'public'
      })
    }
  }, [currentProject, form, tablePrefix, activeTab])

  useEffect(() => {
    if (showImportConfirm && pendingImportValues) {
      importForm.setFieldsValue(pendingImportValues)
      setPendingImportValues(null)
    }
  }, [showImportConfirm, pendingImportValues])

  const processImportResult = async (result: ImportResult) => {
    if (!result.success || !result.project) {
      return
    }

    let createdProjectId: string;
    
    if (isLocalMode) {
      const localProject: LocalProject = {
        id: `local_${Date.now()}`,
        name: result.project.name || '',
        description: result.project.description || undefined,
        databaseType: result.project.databaseType || 'MYSQL',
        status: 'active',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'local',
        lastModified: Date.now()
      }
      
      await createProject({
        id: localProject.id,
        name: localProject.name,
        description: localProject.description,
        databaseType: localProject.databaseType
      })
      createdProjectId = localProject.id
    } else {
      const newProject = await projectApi.create({
        name: result.project.name,
        description: result.project.description,
        databaseType: result.project.databaseType as any
      })

      if (!newProject.success || !newProject.data) {
        message.error('创建项目失败')
        return
      }
      createdProjectId = newProject.data.id
    }

    const tableIdMap = new Map<string, string>()
    const createdTables: Array<{ oldId: string, newId: string, name: string, columns: any[] }> = []

    for (const tableData of (result.tables || [])) {
      let createdTable: Table | undefined;
      
      if (isLocalMode) {
        const localTable: LocalTable = {
          id: `local_table_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          projectId: createdProjectId,
          name: tableData.name || '',
          comment: tableData.comment || undefined,
          positionX: tableData.positionX || 0,
          positionY: tableData.positionY || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastModified: Date.now()
        }
        await localStorageService.saveTable(localTable)
        createdTable = localTable as Table
      } else {
        const tableResponse = await tableApi.create(createdProjectId, {
          name: tableData.name,
          comment: tableData.comment,
          positionX: tableData.positionX,
          positionY: tableData.positionY
        })
        if (tableResponse.success && tableResponse.data) {
          createdTable = tableResponse.data
        }
      }

      if (createdTable) {
        const tableId = createdTable.id
        if (tableData.id) {
          tableIdMap.set(tableData.id, tableId)
        }
        createdTables.push({
          oldId: tableData.id || '',
          newId: tableId,
          name: tableData.name || '',
          columns: (tableData as any).columns || []
        })
      }
    }

    const columnIdMap = new Map<string, string>()
    const columnNameToIdMap = new Map<string, string>()

    for (const tableInfo of createdTables) {
      const oldColumns = (result as any).columns?.filter((col: any) =>
        col.tableId === tableInfo.oldId || col.tableId === tableInfo.name
      ) || []

      if (oldColumns.length > 0) {
        if (isLocalMode) {
          for (let i = 0; i < oldColumns.length; i++) {
            const oldCol = oldColumns[i]
            const localColumn: LocalColumn = {
              id: `local_col_${Date.now()}_${i}`,
              tableId: tableInfo.newId,
              name: oldCol.name,
              dataType: oldCol.dataType || 'VARCHAR',
              length: oldCol.length,
              precision: oldCol.precision,
              scale: oldCol.scale,
              nullable: oldCol.nullable ?? true,
              primaryKey: oldCol.primaryKey || false,
              unique: oldCol.unique || false,
              autoIncrement: oldCol.autoIncrement || false,
              defaultValue: oldCol.defaultValue,
              comment: oldCol.comment,
              order: oldCol.order ?? i,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastModified: Date.now()
            }
            await localStorageService.saveColumn(localColumn)
            if (oldCol.id) {
              columnIdMap.set(oldCol.id, localColumn.id)
            }
            if (oldCol.name) {
              const key = `${tableInfo.newId}_${oldCol.name}`
              columnNameToIdMap.set(key, localColumn.id)
            }
          }
        } else {
          const columnsToCreate: Partial<Column>[] = []
          for (let i = 0; i < oldColumns.length; i++) {
            const oldCol = oldColumns[i]
            const colData: Partial<Column> = {
              tableId: tableInfo.newId,
              name: oldCol.name,
              dataType: oldCol.dataType || 'VARCHAR',
              length: oldCol.length,
              precision: oldCol.precision,
              scale: oldCol.scale,
              nullable: oldCol.nullable ?? true,
              primaryKey: oldCol.primaryKey || false,
              unique: oldCol.unique || false,
              autoIncrement: oldCol.autoIncrement || false,
              defaultValue: oldCol.defaultValue,
              comment: oldCol.comment,
              order: oldCol.order ?? i
            }
            columnsToCreate.push(colData)
          }
          
          if (columnsToCreate.length > 0) {
            const bulkResponse = await columnApi.bulkCreate(tableInfo.newId, columnsToCreate)
            if (bulkResponse.success && bulkResponse.data) {
              bulkResponse.data.forEach((newCol, idx) => {
                const oldCol = oldColumns[idx]
                if (oldCol?.id) {
                  columnIdMap.set(oldCol.id, newCol.id)
                }
                if (oldCol?.name) {
                  const key = `${tableInfo.newId}_${oldCol.name}`
                  columnNameToIdMap.set(key, newCol.id)
                }
              })
            }
          }
        }
      }
    }

    if ((result as any).indexes) {
      for (const idxData of (result as any).indexes || []) {
        const newTableId = tableIdMap.get(idxData.tableId)
        if (newTableId) {
          let indexColumns = idxData.columns
          if (Array.isArray(indexColumns) && indexColumns.length > 0) {
            const isColumnName = typeof indexColumns[0] === 'string' &&
              !indexColumns[0].startsWith('import_sql_') &&
              !indexColumns[0].startsWith('import_')

            if (isColumnName) {
              indexColumns = indexColumns.map((colName: string) => {
                const key = `${newTableId}_${colName}`
                return columnNameToIdMap.get(key) || colName
              }).filter(Boolean)
            } else {
              indexColumns = indexColumns.map((colId: string) => columnIdMap.get(colId) || colId)
            }
          }

          if (isLocalMode) {
            const localIndex: LocalIndex = {
              id: `local_idx_${Date.now()}`,
              tableId: newTableId,
              name: idxData.name || '',
              columns: indexColumns,
              unique: idxData.unique || false,
              type: idxData.type || 'BTREE',
              lastModified: Date.now()
            }
            await localStorageService.saveIndex(localIndex)
          } else {
            await indexApi.create(newTableId, {
              tableId: newTableId,
              name: idxData.name,
              columns: indexColumns,
              unique: idxData.unique,
              type: idxData.type
            })
          }
        }
      }
    }

    for (const relData of (result.relationships || [])) {
      const newSourceTableId = tableIdMap.get(relData.sourceTableId || '') || ''
      const newTargetTableId = tableIdMap.get(relData.targetTableId || '') || ''
      const newSourceColumnId = columnIdMap.get(relData.sourceColumnId || '') || ''
      const newTargetColumnId = columnIdMap.get(relData.targetColumnId || '') || ''

      if (newSourceTableId && newTargetTableId && newSourceColumnId && newTargetColumnId) {
        if (isLocalMode) {
          const localRel: LocalRelationship = {
            id: `local_rel_${Date.now()}`,
            projectId: createdProjectId,
            sourceTableId: newSourceTableId,
            sourceColumnId: newSourceColumnId,
            targetTableId: newTargetTableId,
            targetColumnId: newTargetColumnId,
            relationshipType: relData.relationshipType || 'ONE_TO_MANY',
            onUpdate: relData.onUpdate || 'CASCADE',
            onDelete: relData.onDelete || 'CASCADE',
            createdAt: new Date().toISOString(),
            lastModified: Date.now()
          }
          await localStorageService.saveRelationship(localRel)
        } else {
          await relationshipApi.create(createdProjectId, {
            sourceTableId: newSourceTableId,
            sourceColumnId: newSourceColumnId,
            targetTableId: newTargetTableId,
            targetColumnId: newTargetColumnId,
            relationshipType: relData.relationshipType,
            onUpdate: relData.onUpdate,
            onDelete: relData.onDelete
          })
        }
      }
    }

    await loadProjects()
    await selectProject(createdProjectId)
    message.success('导入成功')
  }

  const handleExportJSON = useCallback(() => {
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
  }, [currentProject, tables, relationships, versions])

  const handleExportSQL = useCallback(async () => {
    if (!currentProject) {
      message.warning('请先选择一个项目')
      return
    }

    const options: Partial<DDLOptions> = form.getFieldsValue()

    setExporting(true)
    try {
      const sql = exportService.exportToSQL(
        { ...currentProject, databaseType: options.databaseType || currentProject.databaseType },
        tables,
        relationships,
        options
      )

      const selectedDbType = databaseTypeOptions.find(dt => dt.value === (options.databaseType || currentProject.databaseType))
      const dbTypeLabel = selectedDbType?.label || options.databaseType || currentProject.databaseType || 'MYSQL'

      const filename = `${currentProject.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${dbTypeLabel.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.sql`
      exportService.downloadSQL(sql, filename)
      message.success(`${dbTypeLabel} DDL 导出成功`)
    } catch (e) {
      message.error(`导出失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }, [currentProject, tables, relationships, form])

  const handleImportJSON = useCallback(async (file: File) => {
    setPendingImportFile(file)
    setPendingImportType('json')
    setDetectedDatabaseType('MYSQL')

    try {
      const previewResult = await importService.importFromJSON(file, { type: 'create_new' })
      setImportResult(previewResult)

      if (previewResult.success) {
        const fileName = file.name.replace(/\.[^/.]+$/, '')
        setPendingImportValues({
          projectName: previewResult.project?.name || fileName,
          databaseType: 'MYSQL'
        })
        setShowImportConfirm(true)
      } else {
        message.error(previewResult.errors?.join('；') || '导入失败')
      }
    } catch (e) {
      message.error(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    }

    return false
  }, [])

  const handleImportSQL = useCallback(async (file: File) => {
    setPendingImportFile(file)
    setPendingImportType('sql')

    try {
      const previewResult = await importService.importFromSQL(file)
      setImportResult(previewResult)

      if (previewResult.success) {
        const fileName = file.name.replace(/\.[^/.]+$/, '')
        let detectedType = 'MYSQL'
        const sqlContent = await file.text()
        if (sqlContent.toUpperCase().includes('ENGINE=')) detectedType = 'MYSQL'
        else if (sqlContent.toUpperCase().includes('SERIAL')) detectedType = 'POSTGRESQL'
        else if (sqlContent.toUpperCase().includes('IDENTITY(')) detectedType = 'SQLSERVER'
        else if (sqlContent.toUpperCase().includes('VARCHAR2')) detectedType = 'ORACLE'

        setDetectedDatabaseType(detectedType)

        setPendingImportValues({
          projectName: fileName,
          databaseType: detectedType
        })
        setShowImportConfirm(true)
      } else {
        message.error(previewResult.errors?.join('；') || '导入失败')
      }
    } catch (e) {
      message.error(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    }

    return false
  }, [])

  const confirmImport = useCallback(async () => {
    if (!importResult || !importResult.success) {
      return
    }

    setImporting(true)

    try {
      const values = importForm.getFieldsValue()
      const result = { ...importResult }
      if (result.project) {
        result.project.name = values.projectName
        result.project.databaseType = values.databaseType
      }

      await processImportResult(result)
      setShowImportConfirm(false)
      setPendingImportFile(null)
      setPendingImportType(null)
      setImportResult(null)
      handleClose()
    } catch (e) {
      message.error(`导入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setImporting(false)
    }
  }, [importResult, importForm])

  const cancelImport = useCallback(() => {
    setShowImportConfirm(false)
    setPendingImportFile(null)
    setPendingImportType(null)
    setImportResult(null)
  }, [])

  const handleClose = useCallback(() => {
    if (onClose) {
      const importExportTab = openTabs.find(tab => tab.type === 'importExport')
      if (importExportTab) {
        closeTab(importExportTab.id)
      }
      onClose()
    }
  }, [onClose, openTabs, closeTab])

  const renderExport = () => (
    <div style={{ padding: '8px 0 24px 0' }}>
      {!currentProject ? (
        <Alert
          message="提示"
          description="请先在左侧选择一个项目，然后再进行导出操作"
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ borderRadius: 8 }}
        />
      ) : (
        <>
          <Card
            size="small"
            style={{
              marginBottom: 20,
              background: 'linear-gradient(135deg, #667eea 0%, ' + UI_COLORS.PURPLE_END + ' 100%)',
              border: 'none',
              borderRadius: 12
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong style={{ fontSize: 15, color: '#fff', display: 'block', marginBottom: 4 }}>
                  {currentProject.name}
                </Text>
                <Space size="middle">
                  <Tag style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
                    {tables.length} 个表
                  </Tag>
                  <Tag style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
                    {relationships.length} 个关系
                  </Tag>
                </Space>
              </div>
              <DatabaseOutlined style={{ fontSize: 36, color: 'rgba(255,255,255,0.3)' }} />
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ExportFormatCard
              title="JSON 格式"
              subtitle="完整项目备份"
              icon={<FileWordOutlined style={{ fontSize: 20, color: '#fff' }} />}
              gradientFrom={UI_COLORS.GREEN}
              gradientTo={UI_COLORS.GREEN_DARK}
              buttonText="导出 JSON"
              buttonIcon={<DownloadOutlined />}
              buttonType="primary"
              onExport={handleExportJSON}
              loading={exporting}
            />
            <ExportFormatCard
              title="SQL DDL"
              subtitle="数据库脚本"
              icon={<SafetyCertificateOutlined style={{ fontSize: 20, color: '#fff' }} />}
              gradientFrom={UI_COLORS.BLUE}
              gradientTo={UI_COLORS.BLUE_DARK}
              buttonText="导出 SQL"
              buttonIcon={<DownloadOutlined />}
              onExport={handleExportSQL}
              loading={exporting}
              disabled={exporting}
            />
          </div>

          <Card size="small" title={<Space><SettingOutlined /><Text strong>导出选项</Text></Space>} style={{ marginTop: 20, borderRadius: 12 }} styles={{ body: { padding: '0 20px 20px 20px' } }}>
            <Form form={form} initialValues={{ schema: 'public', includeComments: true }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Form.Item label="目标数据库" name="databaseType" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                  <Select style={{ width: '100%' }} disabled={exporting}>
                    {databaseTypeOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="tablePrefix" label="表前缀" style={{ marginBottom: 12 }}>
                  <Input
                    placeholder="例如: my_"
                    value={tablePrefix}
                    onChange={(e) => {
                      setTablePrefix(e.target.value)
                      form.setFieldValue('tablePrefix', e.target.value)
                    }}
                    allowClear
                  />
                </Form.Item>
                <Form.Item name="includeDropTable" valuePropName="checked" style={{ marginBottom: 12 }}>
                  <Space>
                    <Switch size="small" />
                    <Text style={{ fontSize: 13 }}>包含 DROP TABLE</Text>
                  </Space>
                </Form.Item>
                <Form.Item name="includeComments" valuePropName="checked" style={{ marginBottom: 12 }}>
                  <Space>
                    <Switch size="small" />
                    <Text style={{ fontSize: 13 }}>包含注释</Text>
                  </Space>
                </Form.Item>
                {form.getFieldValue('databaseType') === 'POSTGRESQL' && (
                  <Form.Item name="schema" label="Schema 名称" style={{ marginBottom: 0 }}>
                    <Select style={{ width: 200 }} />
                  </Form.Item>
                )}
              </div>
            </Form>
          </Card>

          {tablePrefixPresets.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>常用前缀</Text>
              <Space size={8} wrap>
                {tablePrefixPresets.map((prefix) => (
                  <Tag
                    key={prefix || 'empty'}
                    color={tablePrefix === prefix ? 'blue' : 'default'}
                    closable={prefix !== ''}
                    onClose={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeTablePrefixPreset(prefix)
                    }}
                    style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 6 }}
                    onClick={() => {
                      setTablePrefix(prefix)
                      form.setFieldValue('tablePrefix', prefix)
                    }}
                  >
                    {prefix || '无'}
                  </Tag>
                ))}
                <Tag
                  color="processing"
                  style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 6 }}
                  onClick={() => {
                    const newPrefix = prompt('请输入新的表前缀（例如: my_）', '')
                    if (newPrefix !== null) {
                      addTablePrefixPreset(newPrefix)
                    }
                  }}
                >
                  <PlusOutlined /> 添加
                </Tag>
              </Space>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderImport = () => (
    <div style={{ padding: '8px 0 24px 0' }}>
      {importResult && !importResult.success && importResult.errors && (
        <Alert
          message="导入失败"
          description={importResult.errors.join('；')}
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ImportFileCard
          accept=".json"
          title="JSON 文件"
          subtitle="完整项目备份格式"
          icon={<FileWordOutlined style={{ fontSize: 28, color: '#fff' }} />}
          gradientFrom={UI_COLORS.GREEN}
          gradientTo={UI_COLORS.GREEN_DARK}
          onImport={handleImportJSON}
          disabled={importing}
        />
        <ImportFileCard
          accept=".sql"
          title="SQL DDL 文件"
          subtitle="CREATE TABLE 语句"
          icon={<DatabaseOutlined style={{ fontSize: 28, color: '#fff' }} />}
          gradientFrom={UI_COLORS.BLUE}
          gradientTo={UI_COLORS.BLUE_DARK}
          onImport={handleImportSQL}
          disabled={importing}
        />
      </div>

      <Alert
        message="支持格式说明"
        description={
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 4 }}><Text strong>JSON</Text>：从本工具导出的完整项目备份文件</div>
            <div><Text strong>SQL</Text>：包含 CREATE TABLE 语句的文件（支持 MySQL、PostgreSQL、SQL Server、Oracle）</div>
          </div>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginTop: 20, borderRadius: 8 }}
      />

      <ImportConfirmModal
        open={showImportConfirm}
        importResult={importResult}
        importing={importing}
        importForm={importForm}
        onCancel={cancelImport}
        onOk={confirmImport}
      />
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DownloadOutlined />
          数据导入 / 导出
        </Title>
        {onClose && (
          <Button
            type="text"
            icon={<XOutlined />}
            onClick={handleClose}
          >
            关闭
          </Button>
        )}
      </div>

      <div style={{ padding: '16px 16px 0 16px' }}>
        <Space>
          <Button
            type={activeTab === 'export' ? 'primary' : 'default'}
            onClick={() => setActiveTab('export')}
            icon={<DownloadOutlined />}
          >
            导出
          </Button>
          <Button
            type={activeTab === 'import' ? 'primary' : 'default'}
            onClick={() => setActiveTab('import')}
            icon={<UploadOutlined />}
          >
            导入
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px 16px' }}>
        {activeTab === 'export' ? renderExport() : renderImport()}
      </div>
    </div>
  )
}

export default ImportExportTab
