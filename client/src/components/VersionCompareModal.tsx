import React, { useState, useEffect } from 'react'
import { Modal, Select, Card, Row, Col, Tag, Typography, Space, Button, Divider, Collapse, Empty, Statistic, message } from 'antd'
import { DiffOutlined, PlusOutlined, MinusOutlined, EditOutlined, ArrowRightOutlined, HistoryOutlined } from '@ant-design/icons'
import { versionDiffService, VersionDiff, DiffItem } from '../services/versionDiffService'
import { Version } from '../types'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { Panel } = Collapse

interface VersionCompareModalProps {
  visible: boolean
  onClose: () => void
  versions: Version[]
  projectId: string
}

export const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  visible,
  onClose,
  versions,
  projectId
}) => {
  const [version1, setVersion1] = useState<string | null>(null)
  const [version2, setVersion2] = useState<string | null>(null)
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [activeKey, setActiveKey] = useState<string[]>(['added', 'removed', 'modified'])

  useEffect(() => {
    if (visible && versions.length >= 2) {
      const sortedVersions = [...versions].sort((a, b) => b.version - a.version)
      setVersion1(sortedVersions[1]?.id || null)
      setVersion2(sortedVersions[0]?.id || null)
    }
  }, [visible, versions])

  useEffect(() => {
    if (version1 && version2 && version1 !== version2) {
      const v1 = versions.find(v => v.id === version1)
      const v2 = versions.find(v => v.id === version2)
      if (v1 && v2) {
        const diffResult = versionDiffService.compareVersions(v1, v2)
        setDiff(diffResult)
      }
    } else {
      setDiff(null)
    }
  }, [version1, version2, versions])

  const handleExportDiff = () => {
    if (!diff) return
    const summary = versionDiffService.formatDiffSummary(diff)
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `version-diff-v${diff.version1.version}-v${diff.version2.version}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('版本对比报告已导出')
  }

  const getDiffColor = (action: DiffItem['action']) => {
    switch (action) {
      case 'added': return 'green'
      case 'removed': return 'red'
      case 'modified': return 'orange'
      default: return 'default'
    }
  }

  const getDiffIcon = (action: DiffItem['action']) => {
    switch (action) {
      case 'added': return <PlusOutlined />
      case 'removed': return <MinusOutlined />
      case 'modified': return <EditOutlined />
      default: return null
    }
  }

  const renderDiffItem = (item: DiffItem, index: number) => {
    return (
      <Card key={`${item.type}-${item.name}-${index}`} size="small" style={{ marginBottom: 8 }}>
        <Row gutter={12} align="middle">
          <Col flex="none">
            <Tag color={getDiffColor(item.action)} icon={getDiffIcon(item.action)}>
              {item.action === 'added' ? '新增' : item.action === 'removed' ? '删除' : '修改'}
            </Tag>
          </Col>
          <Col flex="auto">
            <Text strong>{item.name}</Text>
            {item.tableName && <Text type="secondary"> ({item.tableName})</Text>}
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              类型: {item.type === 'table' ? '表' : item.type === 'column' ? '字段' : item.type === 'relationship' ? '关系' : '索引'}
            </Text>
          </Col>
          <Col flex="none">
            {item.details && Object.keys(item.details).length > 0 && (
              <div>
                {Object.entries(item.details).map(([key, value]) => {
                  if (value.old !== undefined && value.new !== undefined) {
                    return (
                      <div key={key}>
                        <Text type="secondary" delete style={{ fontSize: 12 }}>{String(value.old)}</Text>
                        <ArrowRightOutlined style={{ margin: '0 4px', fontSize: 10 }} />
                        <Text style={{ fontSize: 12 }}>{String(value.new)}</Text>
                      </div>
                    )
                  }
                  if (value.new !== undefined) {
                    return (
                      <div key={key}>
                        <Text style={{ fontSize: 12, color: '#52c41a' }}>{key}: {String(value.new)}</Text>
                      </div>
                    )
                  }
                  if (value.old !== undefined) {
                    return (
                      <div key={key}>
                        <Text delete style={{ fontSize: 12, color: '#ff4d4f' }}>{key}: {String(value.old)}</Text>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )}
          </Col>
        </Row>
      </Card>
    )
  }

  const stats = diff ? versionDiffService.getDiffStats(diff) : null

  return (
    <Modal
      title={<><HistoryOutlined style={{ marginRight: 8 }} />版本对比</>}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="export" onClick={handleExportDiff} disabled={!diff}>
          导出对比报告
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">选择版本 1（旧版本）</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={version1}
              onChange={setVersion1}
              placeholder="选择版本"
            >
              {versions.map(v => (
                <Option key={v.id} value={v.id}>
                  v{v.version} - {v.comment || v.name || v.createdAt}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <Text type="secondary">选择版本 2（新版本）</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={version2}
              onChange={setVersion2}
              placeholder="选择版本"
            >
              {versions.map(v => (
                <Option key={v.id} value={v.id}>
                  v{v.version} - {v.comment || v.name || v.createdAt}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      {stats && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="总变更"
                value={stats.total}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="新增"
                value={stats.added}
                valueStyle={{ color: '#52c41a' }}
                prefix={<PlusOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="删除"
                value={stats.removed}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<MinusOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="修改"
                value={stats.modified}
                valueStyle={{ color: '#faad14' }}
                prefix={<EditOutlined />}
              />
            </Col>
          </Row>

          <Divider />

          {diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0) ? (
            <Collapse activeKey={activeKey} onChange={(keys) => setActiveKey(keys as string[])}>
              {diff.added.length > 0 && (
                <Panel header={<><PlusOutlined style={{ color: '#52c41a', marginRight: 8 }} />新增 ({diff.added.length})</>} key="added">
                  {diff.added.map((item, index) => renderDiffItem(item, index))}
                </Panel>
              )}
              {diff.removed.length > 0 && (
                <Panel header={<><MinusOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />删除 ({diff.removed.length})</>} key="removed">
                  {diff.removed.map((item, index) => renderDiffItem(item, index))}
                </Panel>
              )}
              {diff.modified.length > 0 && (
                <Panel header={<><EditOutlined style={{ color: '#faad14', marginRight: 8 }} />修改 ({diff.modified.length})</>} key="modified">
                  {diff.modified.map((item, index) => renderDiffItem(item, index))}
                </Panel>
              )}
            </Collapse>
          ) : (
            <Empty description="两个版本没有差异" />
          )}
        </>
      )}

      {!stats && versions.length < 2 && (
        <Empty description="至少需要2个版本才能进行对比" />
      )}
    </Modal>
  )
}
