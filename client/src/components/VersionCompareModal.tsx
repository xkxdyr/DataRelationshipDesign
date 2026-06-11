import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Modal, Table, Tag, Space, Typography, Spin, Empty, Collapse, Button, Select, message } from 'antd'
import { PlusCircleOutlined, MinusCircleOutlined, EditOutlined, SwapOutlined, CodeOutlined, CopyOutlined } from '@ant-design/icons'
import { incrementalDdlApi, IncrementalDDLResult } from '../services/api'

const { Title, Text } = Typography
const { Panel } = Collapse

const UI_COLORS = {
  GREEN: '#52c41a',
  RED: '#ff4d4f',
  YELLOW: '#faad14',
  BLUE: '#1890ff',
  PURPLE: '#722ed1',
  BG_LIGHT: '#fafafa',
  CODE_BG: '#1e1e1e',
  CODE_FG: '#d4d4d4',
}

interface ColumnDiff {
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
}

interface TableDiff {
  id: string
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
  columns: ColumnDiff[]
  columnSummary: { added: number; removed: number; modified: number; unchanged: number }
}

interface RelationshipDiff {
  id: string
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
}

interface CompareResult {
  versionId1: string
  versionName1: string
  versionId2: string
  versionName2: string
  tables: TableDiff[]
  relationships: RelationshipDiff[]
  summary: {
    tablesAdded: number
    tablesRemoved: number
    tablesModified: number
    tablesUnchanged: number
    columnsAdded: number
    columnsRemoved: number
    columnsModified: number
    relationshipsAdded: number
    relationshipsRemoved: number
    relationshipsModified: number
  }
}

interface VersionCompareModalProps {
  open: boolean
  versionId1: string
  versionName1: string
  versionId2: string
  versionName2: string
  onClose: () => void
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  added: { color: 'success', icon: <PlusCircleOutlined />, label: '新增' },
  removed: { color: 'error', icon: <MinusCircleOutlined />, label: '删除' },
  modified: { color: 'warning', icon: <EditOutlined />, label: '修改' },
  unchanged: { color: 'default', icon: null, label: '未变更' }
}

const fieldLabelMap: Record<string, string> = {
  name: '名称',
  comment: '注释',
  dataType: '数据类型',
  length: '长度',
  primaryKey: '主键',
  unique: '唯一',
  nullable: '可空',
  autoIncrement: '自增',
  defaultValue: '默认值',
  sourceTableId: '源表',
  targetTableId: '目标表',
  sourceColumnId: '源字段',
  targetColumnId: '目标字段',
  relationType: '关系类型',
  deleteRule: '删除规则',
  updateRule: '更新规则'
}

function renderValue(v: any): string {
  if (v === null || v === undefined) return '空'
  if (typeof v === 'boolean') return v ? '是' : '否'
  return String(v)
}

interface CompareSummaryProps {
  summary: CompareResult['summary']
}

const CompareSummary = React.memo(({ summary }: CompareSummaryProps) => (
  <div style={{ marginBottom: 16, padding: 12, background: UI_COLORS.BG_LIGHT, borderRadius: 8 }}>
    <Text strong style={{ marginBottom: 8, display: 'block' }}>变更摘要</Text>
    <Space wrap size="middle">
      <Tag icon={<PlusCircleOutlined />} color="success">新增表 {summary.tablesAdded}</Tag>
      <Tag icon={<MinusCircleOutlined />} color="error">删除表 {summary.tablesRemoved}</Tag>
      <Tag icon={<EditOutlined />} color="warning">修改表 {summary.tablesModified}</Tag>
      <Tag color="default">未变更表 {summary.tablesUnchanged}</Tag>
      <Tag icon={<PlusCircleOutlined />} color="success">新增列 {summary.columnsAdded}</Tag>
      <Tag icon={<MinusCircleOutlined />} color="error">删除列 {summary.columnsRemoved}</Tag>
      <Tag icon={<EditOutlined />} color="warning">修改列 {summary.columnsModified}</Tag>
      <Tag icon={<PlusCircleOutlined />} color="success">新增关系 {summary.relationshipsAdded}</Tag>
      <Tag icon={<MinusCircleOutlined />} color="error">删除关系 {summary.relationshipsRemoved}</Tag>
      <Tag icon={<EditOutlined />} color="warning">修改关系 {summary.relationshipsModified}</Tag>
    </Space>
  </div>
))

interface DDLModalProps {
  open: boolean
  ddlDbType: string
  ddlResult: IncrementalDDLResult | null
  onClose: () => void
  onCopy: () => void
}

const DDLModal = React.memo(({
  open, ddlDbType, ddlResult, onClose, onCopy
}: DDLModalProps) => (
  <Modal
    title={
      <Space>
        <CodeOutlined />
        <span>增量DDL ({ddlDbType})</span>
        <Tag color="blue">{ddlResult?.totalChanges || 0} 项变更</Tag>
      </Space>
    }
    open={open}
    onCancel={onClose}
    footer={
      <Space>
        <Button icon={<CopyOutlined />} onClick={onCopy}>复制DDL</Button>
        <Button onClick={onClose}>关闭</Button>
      </Space>
    }
    width={800}
    destroyOnHidden
  >
    {ddlResult ? (
      <div>
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            {ddlResult.results.map((r) => (
              <Tag key={r.tableName} color={r.statements.length > 0 ? 'processing' : 'default'}>
                {r.tableName}: {r.summary}
              </Tag>
            ))}
          </Space>
        </div>
        <pre style={{
          background: UI_COLORS.CODE_BG,
          color: UI_COLORS.CODE_FG,
          padding: 16,
          borderRadius: 8,
          maxHeight: 500,
          overflow: 'auto',
          fontSize: 13,
          fontFamily: 'Consolas, Monaco, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {ddlResult.ddl || '-- 无变更'}
        </pre>
      </div>
    ) : (
      <Empty description="无增量DDL数据" />
    )}
  </Modal>
))

function renderColumnChanges(col: ColumnDiff) {
  if (!col.changes || col.changes.length === 0) return null
  return (
    <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: `2px solid ${UI_COLORS.YELLOW}` }}>
      {col.changes.map((ch, idx) => (
        <div key={idx} style={{ fontSize: 12, marginBottom: 2 }}>
          <Text type="secondary">{fieldLabelMap[ch.field] || ch.field}:</Text>
          <Text delete style={{ color: UI_COLORS.RED, marginLeft: 4 }}>{renderValue(ch.oldValue)}</Text>
          <SwapOutlined style={{ margin: '0 4px', fontSize: 10 }} />
          <Text style={{ color: UI_COLORS.GREEN }}>{renderValue(ch.newValue)}</Text>
        </div>
      ))}
    </div>
  )
}

export const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  open, versionId1, versionName1, versionId2, versionName2, onClose
}) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [ddlLoading, setDdlLoading] = useState(false)
  const [ddlResult, setDdlResult] = useState<IncrementalDDLResult | null>(null)
  const [ddlDbType, setDdlDbType] = useState('MYSQL')
  const [showDdlModal, setShowDdlModal] = useState(false)

  useEffect(() => {
    if (open && versionId1 && versionId2) {
      setLoading(true)
      fetch(`/api/versions/compare/${versionId1}/${versionId2}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) setResult(res.data)
        })
        .finally(() => setLoading(false))
    }
  }, [open, versionId1, versionId2])

  const handleGenerateIncrementalDDL = useCallback(async () => {
    setDdlLoading(true)
    try {
      const res = await incrementalDdlApi.generateFromVersions(versionId1, versionId2, ddlDbType)
      if (res.success && res.data) {
        setDdlResult(res.data)
        setShowDdlModal(true)
      } else {
        message.error(res.message || '生成增量DDL失败')
      }
    } catch {
      message.error('生成增量DDL失败')
    } finally {
      setDdlLoading(false)
    }
  }, [versionId1, versionId2, ddlDbType])

  const handleCopyDdl = useCallback(() => {
    if (ddlResult?.ddl) {
      navigator.clipboard.writeText(ddlResult.ddl)
      message.success('已复制到剪贴板')
    }
  }, [ddlResult])

  const handleCloseDdlModal = useCallback(() => setShowDdlModal(false), [])

  const tableColumns = useMemo(() => [
    {
      title: '表名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TableDiff) => (
        <Space>
          <Text strong={record.status !== 'unchanged'} style={{ 
            textDecoration: record.status === 'removed' ? 'line-through' : 'none'
          }}>{name}</Text>
          <Tag color={statusConfig[record.status].color}>
            {statusConfig[record.status].icon} {statusConfig[record.status].label}
          </Tag>
        </Space>
      )
    },
    {
      title: '表级变更',
      key: 'tableChanges',
      width: 300,
      render: (_: any, record: TableDiff) => {
        if (!record.changes || record.changes.length === 0) return <Text type="secondary">-</Text>
        return (
          <div>
            {record.changes.map((ch, idx) => (
              <div key={idx} style={{ fontSize: 12, marginBottom: 2 }}>
                <Text type="secondary">{fieldLabelMap[ch.field] || ch.field}:</Text>
                <Text delete style={{ color: UI_COLORS.RED, marginLeft: 4 }}>{renderValue(ch.oldValue)}</Text>
                <SwapOutlined style={{ margin: '0 4px', fontSize: 10 }} />
                <Text style={{ color: UI_COLORS.GREEN }}>{renderValue(ch.newValue)}</Text>
              </div>
            ))}
          </div>
        )
      }
    },
    {
      title: '字段变更',
      key: 'columnSummary',
      width: 200,
      render: (_: any, record: TableDiff) => {
        const s = record.columnSummary
        return (
          <Space size="small">
            {s.added > 0 && <Tag color="success" icon={<PlusCircleOutlined />}>{s.added}</Tag>}
            {s.removed > 0 && <Tag color="error" icon={<MinusCircleOutlined />}>{s.removed}</Tag>}
            {s.modified > 0 && <Tag color="warning" icon={<EditOutlined />}>{s.modified}</Tag>}
            {s.added === 0 && s.removed === 0 && s.modified === 0 && <Text type="secondary">无变更</Text>}
          </Space>
        )
      }
    }
  ], [])

  const renderExpandedRow = useCallback((record: TableDiff) => {
    const changedColumns = record.columns.filter(c => c.status !== 'unchanged')
    if (changedColumns.length === 0) return <Text type="secondary">所有字段无变更</Text>
    return (
      <div>
        {changedColumns.map(col => (
          <div key={col.name} style={{ marginBottom: 4 }}>
            <Tag color={statusConfig[col.status].color}>
              {statusConfig[col.status].icon} {col.name}
            </Tag>
            {renderColumnChanges(col)}
          </div>
        ))}
      </div>
    )
  }, [])

  const relColumns = useMemo(() => [
    {
      title: '关系',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: RelationshipDiff) => (
        <Space>
          <Text style={{ textDecoration: record.status === 'removed' ? 'line-through' : 'none' }}>{name}</Text>
          <Tag color={statusConfig[record.status].color}>
            {statusConfig[record.status].icon} {statusConfig[record.status].label}
          </Tag>
        </Space>
      )
    },
    {
      title: '变更详情',
      key: 'changes',
      render: (_: any, record: RelationshipDiff) => {
        if (!record.changes || record.changes.length === 0) return <Text type="secondary">-</Text>
        return (
          <div>
            {record.changes.map((ch, idx) => (
              <div key={idx} style={{ fontSize: 12, marginBottom: 2 }}>
                <Text type="secondary">{fieldLabelMap[ch.field] || ch.field}:</Text>
                <Text delete style={{ color: UI_COLORS.RED, marginLeft: 4 }}>{renderValue(ch.oldValue)}</Text>
                <SwapOutlined style={{ margin: '0 4px', fontSize: 10 }} />
                <Text style={{ color: UI_COLORS.GREEN }}>{renderValue(ch.newValue)}</Text>
              </div>
            ))}
          </div>
        )
      }
    }
  ], [])

  const changedTables = useMemo(() => result?.tables.filter(t => t.status !== 'unchanged') || [], [result])
  const unchangedTables = useMemo(() => result?.tables.filter(t => t.status === 'unchanged') || [], [result])
  const changedRels = useMemo(() => result?.relationships.filter(r => r.status !== 'unchanged') || [], [result])

  const DDL_DB_TYPE_OPTIONS = useMemo(() => [
    { value: 'MYSQL', label: 'MySQL' },
    { value: 'POSTGRESQL', label: 'PostgreSQL' },
    { value: 'SQLITE', label: 'SQLite' },
    { value: 'SQLSERVER', label: 'SQL Server' },
    { value: 'ORACLE', label: 'Oracle' }
  ], [])

  return (
    <>
      <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>版本对比</span>
          <Tag>{versionName1}</Tag>
          <SwapOutlined />
          <Tag>{versionName2}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Select
            value={ddlDbType}
            onChange={setDdlDbType}
            size="small"
            style={{ width: 120 }}
            options={DDL_DB_TYPE_OPTIONS}
          />
          <Button
            type="primary"
            icon={<CodeOutlined />}
            onClick={handleGenerateIncrementalDDL}
            loading={ddlLoading}
          >
            生成增量DDL
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
      width={950}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" tip="正在对比版本差异..." />
        </div>
      ) : !result ? (
        <Empty description="无法加载对比数据" />
      ) : (
        <div>
          <CompareSummary summary={result.summary} />

          <Collapse defaultActiveKey={['tables']} style={{ marginBottom: 16 }}>
            <Panel header={
              <Space>
                <Text strong>表结构变更</Text>
                <Tag>{changedTables.length} 项变更</Tag>
              </Space>
            } key="tables">
              <Table
                dataSource={changedTables}
                rowKey="id"
                columns={tableColumns}
                size="small"
                expandable={{
                  expandedRowRender: renderExpandedRow,
                  rowExpandable: (r: TableDiff) => r.columns.some(c => c.status !== 'unchanged')
                }}
                pagination={{ pageSize: 10, showSizeChanger: false, size: 'small' }}
                locale={{ emptyText: <Empty description="表结构无变更" /> }}
              />
            </Panel>

            {unchangedTables.length > 0 && (
              <Panel header={
                <Space>
                  <Text type="secondary">未变更表</Text>
                  <Tag color="default">{unchangedTables.length} 个</Tag>
                </Space>
              } key="unchanged">
                <Space wrap>
                  {unchangedTables.map(t => (
                    <Tag key={t.id} color="default">{t.name}</Tag>
                  ))}
                </Space>
              </Panel>
            )}
          </Collapse>

          <Collapse>
            <Panel header={
              <Space>
                <Text strong>关系变更</Text>
                <Tag>{changedRels.length} 项变更</Tag>
              </Space>
            } key="rels">
              <Table
                dataSource={changedRels}
                rowKey="id"
                columns={relColumns}
                size="small"
                pagination={{ pageSize: 10, showSizeChanger: false, size: 'small' }}
                locale={{ emptyText: <Empty description="关系无变更" /> }}
              />
            </Panel>
          </Collapse>
        </div>
      )}
    </Modal>
    <DDLModal
      open={showDdlModal}
      ddlDbType={ddlDbType}
      ddlResult={ddlResult}
      onClose={handleCloseDdlModal}
      onCopy={handleCopyDdl}
    />
    </>
  )
}

export default VersionCompareModal