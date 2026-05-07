import React, { useState, useEffect } from 'react'
import { Modal, Select, Input, Button, Space, Typography, Table, Tag, Divider, message, Card, Row, Col } from 'antd'
import { SwapOutlined, ArrowRightOutlined, DatabaseOutlined, TableOutlined } from '@ant-design/icons'
import { typeConvertApi, TypeMapping } from '../services/api'

const { Title, Text } = Typography
const { TextArea } = Input

interface TypeConvertModalProps {
  visible: boolean
  onClose: () => void
}

const databaseTypes = [
  { value: 'MYSQL', label: 'MySQL' },
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQLITE', label: 'SQLite' },
  { value: 'SQLSERVER', label: 'SQL Server' },
  { value: 'ORACLE', label: 'Oracle' }
]

export const TypeConvertModal: React.FC<TypeConvertModalProps> = ({ visible, onClose }) => {
  const [sourceDb, setSourceDb] = useState<string>('MYSQL')
  const [targetDb, setTargetDb] = useState<string>('POSTGRESQL')
  const [dataType, setDataType] = useState<string>('VARCHAR(255)')
  const [convertedType, setConvertedType] = useState<string>('')
  const [mappings, setMappings] = useState<TypeMapping[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible && sourceDb && targetDb) {
      loadMappings()
    }
  }, [visible, sourceDb, targetDb])

  const loadMappings = async () => {
    try {
      const response = await typeConvertApi.getMappings(sourceDb, targetDb)
      if (response.success && response.data) {
        setMappings(response.data.mappings)
      } else if (response.success && response.result) {
        setMappings(response.result.mappings)
      }
    } catch (error) {
      console.error('加载类型映射失败:', error)
    }
  }

  const handleConvert = async () => {
    if (!dataType.trim()) {
      message.warning('请输入数据类型')
      return
    }

    setLoading(true)
    try {
      const response = await typeConvertApi.convert(dataType, sourceDb, targetDb)
      if (response.success && response.result) {
        setConvertedType(response.result.targetType)
        message.success('转换成功')
      } else {
        message.error(response.error || '转换失败')
      }
    } catch (error) {
      message.error('转换失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSwap = () => {
    const temp = sourceDb
    setSourceDb(targetDb)
    setTargetDb(temp)
  }

  const columns = [
    {
      title: '源类型',
      dataIndex: 'source',
      key: 'source',
      width: '50%'
    },
    {
      title: '目标类型',
      dataIndex: 'target',
      key: 'target',
      width: '50%',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    }
  ]

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>数据库类型转换</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        <Card size="small" title={<><DatabaseOutlined /> 数据库选择</>}>
          <Row gutter={16} align="middle">
            <Col span={10}>
              <Text strong>源数据库</Text>
              <Select
                value={sourceDb}
                onChange={setSourceDb}
                options={databaseTypes}
                style={{ width: '100%', marginTop: 8 }}
              />
            </Col>
            <Col span={4} style={{ textAlign: 'center' }}>
              <Button icon={<ArrowRightOutlined />} type="primary" onClick={handleSwap} />
            </Col>
            <Col span={10}>
              <Text strong>目标数据库</Text>
              <Select
                value={targetDb}
                onChange={setTargetDb}
                options={databaseTypes}
                style={{ width: '100%', marginTop: 8 }}
              />
            </Col>
          </Row>
        </Card>

        <Card size="small" title={<><SwapOutlined /> 类型转换</>}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>输入数据类型</Text>
              <Input
                placeholder="例如: VARCHAR(255), INT, DECIMAL(10,2)"
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                style={{ marginTop: 8 }}
              />
            </div>
            <Button
              type="primary"
              onClick={handleConvert}
              loading={loading}
              icon={<SwapOutlined />}
            >
              转换
            </Button>
            {convertedType && (
              <div style={{ padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
                <Text strong>转换结果: </Text>
                <Tag color="green" style={{ fontSize: 16, padding: '4px 12px' }}>{convertedType}</Tag>
              </div>
            )}
          </Space>
        </Card>

        <Card size="small" title={<><TableOutlined /> 类型映射表</>}>
          <Table
            dataSource={mappings}
            columns={columns}
            pagination={false}
            size="small"
            scroll={{ y: 300 }}
            rowKey={(record) => record.source}
          />
        </Card>
      </Space>
    </Modal>
  )
}
