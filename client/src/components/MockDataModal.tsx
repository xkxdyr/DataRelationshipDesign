import React, { useState, useEffect } from 'react'
import { Modal, Form, InputNumber, Select, Button, Table, Space, Typography, Card, Row, Col, message, Tabs, Input } from 'antd'
import { DatabaseOutlined, DownloadOutlined, ReloadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons'
import { mockDataService, MockDataRule, MockDataOptions } from '../services/mockDataService'
import { Table as TableType } from '../types'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface MockDataModalProps {
  visible: boolean
  onClose: () => void
  table: TableType | null
}

const ruleOptions = [
  { value: 'random', label: '随机值' },
  { value: 'sequence', label: '序列号' },
  { value: 'fixed', label: '固定值' },
  { value: 'name', label: '姓名' },
  { value: 'email', label: '邮箱' },
  { value: 'phone', label: '手机号' },
  { value: 'address', label: '地址' },
  { value: 'date', label: '日期' },
  { value: 'uuid', label: 'UUID' },
]

export const MockDataModal: React.FC<MockDataModalProps> = ({ visible, onClose, table }) => {
  const [form] = Form.useForm()
  const [rules, setRules] = useState<MockDataRule[]>([])
  const [count, setCount] = useState<number>(10)
  const [generatedData, setGeneratedData] = useState<Record<string, any>[]>([])
  const [activeTab, setActiveTab] = useState<string>('config')
  const [exportContent, setExportContent] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<'sql' | 'json' | 'csv'>('sql')

  useEffect(() => {
    if (visible && table) {
      const autoRules = mockDataService.generateRulesFromTable(table)
      setRules(autoRules)
      form.setFieldsValue({ count: 10 })
      setCount(10)
      setGeneratedData([])
      setActiveTab('config')
      setExportContent('')
    }
  }, [visible, table, form])

  const handleGenerate = () => {
    if (!table) return

    const options: MockDataOptions = {
      tableId: table.id,
      tableName: table.name,
      count,
      rules
    }

    const result = mockDataService.generateMockData(options)
    if (result.success) {
      setGeneratedData(result.data)
      setActiveTab('preview')
      message.success(`成功生成 ${result.data.length} 条模拟数据`)
    } else {
      message.error(result.message || '生成失败')
    }
  }

  const handleRuleChange = (index: number, field: keyof MockDataRule, value: any) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [field]: value }
    setRules(newRules)
  }

  const handleExport = (format: 'sql' | 'json' | 'csv') => {
    if (!table || generatedData.length === 0) return

    let content = ''
    switch (format) {
      case 'sql':
        content = mockDataService.exportToSQL(table.name, generatedData, table.columns)
        break
      case 'json':
        content = mockDataService.exportToJSON(generatedData)
        break
      case 'csv':
        content = mockDataService.exportToCSV(generatedData, table.columns)
        break
    }

    setExportContent(content)
    setExportFormat(format)
    setActiveTab('export')

    // 自动下载
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const extension = format === 'sql' ? 'sql' : format === 'json' ? 'json' : 'csv'
    link.download = `${table.name}_mock_data.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success(`已导出为 ${format.toUpperCase()} 格式`)
  }

  const columns = table?.columns.map(col => ({
    title: col.name,
    dataIndex: col.name,
    key: col.name,
    width: 120,
    ellipsis: true
  })) || []

  return (
    <Modal
      title={<><DatabaseOutlined style={{ marginRight: 8 }} />数据模拟生成</>}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="count"><InputNumber /></Form.Item>
        </Form>
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="配置规则" key="config">
          <Form form={form} layout="vertical">
            <Form.Item label="生成数量" name="count">
              <InputNumber
                min={1}
                max={1000}
                value={count}
                onChange={(val) => setCount(val || 10)}
                style={{ width: 200 }}
              />
            </Form.Item>
          </Form>

          <Title level={5}>字段规则配置</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            系统已根据字段名自动推断规则，您可以根据需要调整
          </Text>

          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {rules.map((rule, index) => (
              <Card key={rule.columnName} size="small" style={{ marginBottom: 8 }}>
                <Row gutter={16} align="middle">
                  <Col span={6}>
                    <Text strong>{rule.columnName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{rule.dataType}</Text>
                  </Col>
                  <Col span={8}>
                    <Select
                      style={{ width: '100%' }}
                      value={rule.rule}
                      onChange={(val) => handleRuleChange(index, 'rule', val)}
                    >
                      {ruleOptions.map(opt => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={10}>
                    {rule.rule === 'fixed' && (
                      <Input
                        placeholder="固定值"
                        value={rule.fixedValue}
                        onChange={(e) => handleRuleChange(index, 'fixedValue', e.target.value)}
                      />
                    )}
                    {rule.rule === 'random' && rule.dataType.toUpperCase().includes('INT') && (
                      <Space>
                        <InputNumber
                          placeholder="最小值"
                          value={rule.min}
                          onChange={(val) => handleRuleChange(index, 'min', val)}
                        />
                        <InputNumber
                          placeholder="最大值"
                          value={rule.max}
                          onChange={(val) => handleRuleChange(index, 'max', val)}
                        />
                      </Space>
                    )}
                    {rule.rule === 'sequence' && (
                      <InputNumber
                        placeholder="起始值"
                        value={rule.min}
                        onChange={(val) => handleRuleChange(index, 'min', val)}
                      />
                    )}
                  </Col>
                </Row>
              </Card>
            ))}
          </div>

          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleGenerate}
            >
              生成模拟数据
            </Button>
          </Space>
        </Tabs.TabPane>

        <Tabs.TabPane tab="数据预览" key="preview" disabled={generatedData.length === 0}>
          <div style={{ marginBottom: 16 }}>
            <Text>共生成 {generatedData.length} 条数据</Text>
            <Space style={{ marginLeft: 16 }}>
              <Button
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleExport('sql')}
              >
                导出 SQL
              </Button>
              <Button
                size="small"
                icon={<FileExcelOutlined />}
                onClick={() => handleExport('csv')}
              >
                导出 CSV
              </Button>
              <Button
                size="small"
                onClick={() => handleExport('json')}
              >
                导出 JSON
              </Button>
            </Space>
          </div>
          <Table
            dataSource={generatedData}
            columns={columns}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Tabs.TabPane>

        <Tabs.TabPane tab="导出内容" key="export" disabled={!exportContent}>
          <Card>
            <pre style={{ maxHeight: 400, overflow: 'auto', backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {exportContent}
            </pre>
          </Card>
          <Space style={{ marginTop: 16 }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                if (!table) return
                const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                const extension = exportFormat === 'sql' ? 'sql' : exportFormat === 'json' ? 'json' : 'csv'
                link.download = `${table.name}_mock_data.${extension}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
              }}
            >
              下载文件
            </Button>
          </Space>
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  )
}
