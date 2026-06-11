import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Modal,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Card,
  Statistic,
  Row,
  Col,
  Spin,
  Empty,
  Tooltip,
  message,
  Typography,
  Divider,
  Dropdown,
  Menu
} from 'antd'
import {
  HistoryOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  EyeOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  UndoOutlined,
  ImportOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { historyApi, OperationRecord, OperationStats, HistoryReminder } from '../services/historyApi'
import { useAppStore } from '../stores/appStore'
import { versionApi } from '../services/api'

const { Text } = Typography
const { RangePicker } = DatePicker

const UI_COLORS = {
  GREEN: '#52c41a',
  BLUE: '#1890ff',
  PURPLE: '#722ed1',
  RED: '#cf1322',
  GRAY: '#8c8c8c',
}

interface HistoryModalProps {
  open: boolean
  onCancel: () => void
  projectId: string
  projectName?: string
}

// 操作类型映射
const operationTypeMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: '创建', color: 'success', icon: <PlusOutlined /> },
  UPDATE: { label: '更新', color: 'processing', icon: <EditOutlined /> },
  DELETE: { label: '删除', color: 'error', icon: <DeleteOutlined /> },
  LOGIN: { label: '登录', color: 'gold', icon: <SafetyCertificateOutlined /> },
  LOGOUT: { label: '登出', color: 'warning', icon: <SafetyCertificateOutlined /> },
  SYNC: { label: '同步', color: 'cyan', icon: <SyncOutlined /> }
}

// 目标类型映射
const targetTypeMap: Record<string, { label: string; color: string }> = {
  PROJECT: { label: '项目', color: 'purple' },
  TABLE: { label: '表', color: 'blue' },
  COLUMN: { label: '字段', color: 'cyan' },
  RELATIONSHIP: { label: '关系', color: 'green' },
  INDEX: { label: '索引', color: 'magenta' },
  VERSION: { label: '版本', color: 'orange' },
  USER: { label: '用户', color: 'gold' },
  SYSTEM: { label: '系统', color: 'default' }
}

const REMINDER_STYLE = {
  background: '#fff2f0',
  borderColor: '#ffccc7',
} as const

interface HistoryReminderBannerProps {
  reminder: HistoryReminder
  onExport: () => void
}

const HistoryReminderBanner = React.memo(({ reminder, onExport }: HistoryReminderBannerProps) => (
  <Card
    type="inner"
    style={{
      marginBottom: 16,
      background: REMINDER_STYLE.background,
      borderColor: REMINDER_STYLE.borderColor,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ fontSize: 20 }}>⚠️</div>
      <div>
        <Text strong style={{ color: UI_COLORS.RED }}>
          操作历史已超过半年（{reminder.daysSinceOldest} 天）
        </Text>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary">
            共 {reminder.recordCount} 条操作记录，建议导出备份后清理历史数据以提升性能。
          </Text>
        </div>
        <Space style={{ marginTop: 8 }}>
          <Button
            size="small"
            type="primary"
            danger
            onClick={onExport}
          >
            导出备份
          </Button>
        </Space>
      </div>
    </div>
  </Card>
))

interface HistoryStatsPanelProps {
  stats: OperationStats
}

const HistoryStatsPanel = React.memo(({ stats }: HistoryStatsPanelProps) => (
  <div style={{ marginBottom: 16 }}>
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="总操作数"
            value={stats.totalOperations}
            prefix={<HistoryOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="创建"
            value={stats.createCount}
            valueStyle={{ color: UI_COLORS.GREEN }}
            prefix={<PlusOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="更新"
            value={stats.updateCount}
            valueStyle={{ color: UI_COLORS.BLUE }}
            prefix={<EditOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic
            title="参与人数"
            value={stats.uniqueUsers}
            valueStyle={{ color: UI_COLORS.PURPLE }}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
    </Row>

    {stats.mostActiveUser && (
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">
          最活跃用户：{stats.mostActiveUser.userName}（{stats.mostActiveUser.count} 次操作）
        </Text>
      </div>
    )}
  </div>
))

interface FilterBarProps {
  searchText: string
  onSearchChange: (value: string) => void
  operationTypeFilter: string | undefined
  onOperationTypeChange: (value: string | undefined) => void
  targetTypeFilter: string | undefined
  onTargetTypeChange: (value: string | undefined) => void
  dateRange: [Dayjs, Dayjs] | null
  onDateRangeChange: (dates: [Dayjs, Dayjs] | null) => void
  loading: boolean
  onRefresh: () => void
  exportMenu: React.ReactElement
  onImport: () => void
}

const FilterBar = React.memo(({
  searchText, onSearchChange, operationTypeFilter, onOperationTypeChange,
  targetTypeFilter, onTargetTypeChange, dateRange, onDateRangeChange,
  loading, onRefresh, exportMenu, onImport
}: FilterBarProps) => (
  <div style={{ marginBottom: 16 }}>
    <Space wrap>
      <Input.Search
        placeholder="搜索操作人、目标名称、描述..."
        allowClear
        style={{ width: 280 }}
        value={searchText}
        onChange={e => onSearchChange(e.target.value)}
        prefix={<FilterOutlined />}
      />
      <Select
        placeholder="操作类型"
        allowClear
        style={{ width: 120 }}
        value={operationTypeFilter}
        onChange={onOperationTypeChange}
        options={Object.entries(operationTypeMap).map(([key, value]) => ({
          label: value.label,
          value: key
        }))}
      />
      <Select
        placeholder="目标类型"
        allowClear
        style={{ width: 120 }}
        value={targetTypeFilter}
        onChange={onTargetTypeChange}
        options={Object.entries(targetTypeMap).map(([key, value]) => ({
          label: value.label,
          value: key
        }))}
      />
      <RangePicker
        value={dateRange}
        onChange={(dates) => onDateRangeChange(dates as [Dayjs, Dayjs] | null)}
        placeholder={['开始时间', '结束时间']}
      />
      <Tooltip title="刷新">
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        />
      </Tooltip>
      <Dropdown overlay={exportMenu} placement="bottomRight">
        <Button type="primary" icon={<DownloadOutlined />}>
          导出
        </Button>
      </Dropdown>
      <Button icon={<ImportOutlined />} onClick={onImport}>
        导入
      </Button>
    </Space>
  </div>
))

export const HistoryModal: React.FC<HistoryModalProps> = ({ open, onCancel, projectId, projectName }) => {
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [records, setRecords] = useState<OperationRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<OperationRecord[]>([])
  const [stats, setStats] = useState<OperationStats | null>(null)
  const [reminder, setReminder] = useState<HistoryReminder | null>(null)
  const [searchText, setSearchText] = useState('')
  const [operationTypeFilter, setOperationTypeFilter] = useState<string | undefined>()
  const [targetTypeFilter, setTargetTypeFilter] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)

  const currentUser = useAppStore(state => state.currentUser)

  const loadData = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setStatsLoading(true)

      const [recordsData, statsData, reminderData] = await Promise.all([
        historyApi.getProjectHistory(projectId, 200),
        historyApi.getProjectStats(projectId),
        historyApi.getProjectHistoryReminder(projectId)
      ])

      setRecords(recordsData)
      setFilteredRecords(recordsData)
      setStats(statsData)
      setReminder(reminderData)
    } catch (error) {
      console.error('加载操作历史失败:', error)
      message.error('加载操作历史失败')
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      loadData()
      setSearchText('')
      setOperationTypeFilter(undefined)
      setTargetTypeFilter(undefined)
      setDateRange(null)
    }
  }, [open, projectId, loadData])

  useEffect(() => {
    let result = [...records]

    if (searchText) {
      const lowerSearch = searchText.toLowerCase()
      result = result.filter(
        r =>
          r.userName?.toLowerCase().includes(lowerSearch) ||
          r.targetName?.toLowerCase().includes(lowerSearch) ||
          r.description?.toLowerCase().includes(lowerSearch)
      )
    }

    if (operationTypeFilter) {
      result = result.filter(r => r.operationType === operationTypeFilter)
    }

    if (targetTypeFilter) {
      result = result.filter(r => r.targetType === targetTypeFilter)
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').valueOf()
      const end = dateRange[1].endOf('day').valueOf()
      result = result.filter(r => {
        const timestamp = new Date(r.timestamp).getTime()
        return timestamp >= start && timestamp <= end
      })
    }

    setFilteredRecords(result)
  }, [records, searchText, operationTypeFilter, targetTypeFilter, dateRange])

  const handleExport = useCallback((format: 'json' | 'csv') => {
    try {
      historyApi.exportProjectHistory(projectId, format, 1000)
      message.success(`正在导出为 ${format.toUpperCase()} 格式...`)
    } catch (error) {
      message.error('导出失败')
    }
  }, [projectId])

  const handleExportJson = useCallback(() => handleExport('json'), [handleExport])

  const handleRollback = useCallback(async (snapshotId: string) => {
    if (!projectId) return
    Modal.confirm({
      title: '确认回滚',
      content: '回滚到该历史版本将覆盖当前数据，确定要继续吗？',
      okText: '确认回滚',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await versionApi.update(snapshotId, {})
          if (result) {
            message.success('已回滚到历史版本')
            loadData()
          } else {
            message.error('回滚失败')
          }
        } catch (error) {
          message.error('回滚失败')
        }
      }
    })
  }, [projectId, loadData])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const records = data.records || data
        if (!Array.isArray(records)) {
          message.error('无效的导入数据格式')
          return
        }
        const result = await historyApi.importHistory(projectId, records)
        if (result.success) {
          message.success(`成功导入 ${result.data?.imported || 0} 条记录`)
          loadData()
        } else {
          message.error('导入失败')
        }
      } catch (error) {
        message.error('导入文件解析失败')
      }
    }
    input.click()
  }, [projectId, loadData])

  const columns: ColumnsType<OperationRecord> = useMemo(() => [
    {
      title: '操作类型',
      key: 'operationType',
      width: 100,
      fixed: 'left',
      render: (_, record) => {
        const info = operationTypeMap[record.operationType] || {
          label: record.operationType,
          color: 'default',
          icon: <FileTextOutlined />
        }
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.label}
          </Tag>
        )
      },
      filters: Object.entries(operationTypeMap).map(([key, value]) => ({
        text: value.label,
        value: key
      })),
      onFilter: (value, record) => record.operationType === value
    },
    {
      title: '目标类型',
      key: 'targetType',
      width: 90,
      render: (_, record) => {
        const info = targetTypeMap[record.targetType] || {
          label: record.targetType,
          color: 'default'
        }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '目标名称',
      key: 'targetName',
      width: 150,
      render: (_, record) => (
        <Tooltip title={record.targetName}>
          <Text ellipsis style={{ maxWidth: 140 }}>
            {record.targetName || '-'}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '操作人',
      key: 'userName',
      width: 100,
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <Text
            type={currentUser && record.userId === currentUser.id ? 'success' : undefined}
          >
            {record.userName}
            {currentUser && record.userId === currentUser.id && ' (我)'}
          </Text>
        </Space>
      )
    },
    {
      title: '描述',
      key: 'description',
      width: 250,
      render: (_, record) => (
        <Tooltip title={record.description}>
          <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
            {record.description || '-'}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '时间',
      key: 'timestamp',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Text type="secondary">
          {new Date(record.timestamp).toLocaleString('zh-CN')}
        </Text>
      ),
      sorter: (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend'
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => {
        const snapshotId = (record as any).changes?.snapshotId
        if (!snapshotId) return null
        return (
          <Tooltip title="回滚到此版本">
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              onClick={() => handleRollback(snapshotId)}
            >
              回滚
            </Button>
          </Tooltip>
        )
      }
    }
  ], [currentUser, projectId])

  const exportMenu = useMemo(() => (
    <Menu>
      <Menu.Item
        key="json"
        icon={<FileTextOutlined />}
        onClick={() => handleExport('json')}
      >
        导出为 JSON
      </Menu.Item>
      <Menu.Item
        key="csv"
        icon={<FileTextOutlined />}
        onClick={() => handleExport('csv')}
      >
        导出为 CSV
      </Menu.Item>
    </Menu>
  ), [handleExport])

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>操作历史</span>
          {projectName && (
            <Text type="secondary">- {projectName}</Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
    >
      {reminder?.shouldRemind && (
        <HistoryReminderBanner
          reminder={reminder}
          onExport={handleExportJson}
        />
      )}

      {stats && <HistoryStatsPanel stats={stats} />}

      <Divider style={{ margin: '12px 0' }} />

      <FilterBar
        searchText={searchText}
        onSearchChange={setSearchText}
        operationTypeFilter={operationTypeFilter}
        onOperationTypeChange={setOperationTypeFilter}
        targetTypeFilter={targetTypeFilter}
        onTargetTypeChange={setTargetTypeFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        loading={loading}
        onRefresh={loadData}
        exportMenu={exportMenu}
        onImport={handleImport}
      />

      <Spin spinning={loading}>
        {filteredRecords.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            size="middle"
            scroll={{ x: 980, y: 400 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
          />
        ) : (
          <Empty
            description={records.length === 0 ? '暂无操作记录' : '没有匹配的记录'}
            style={{ padding: '40px 0' }}
          />
        )}
      </Spin>
    </Modal>
  )
}
