import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  Input,
  Typography,
  Tooltip,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Table as TableType, Relationship, Column } from '../types';
import { useAppStore } from '../stores/appStore';

const { Title, Text } = Typography;
const { Option } = Select;

const getColumnConstraints = (col: Column) => {
  const constraints = [];
  if (col.primaryKey) {
    constraints.push(<Tag key="pk" color="blue" style={{ fontSize: 10, marginRight: 4 }} title="主键">PK</Tag>);
  }
  if (col.unique) {
    constraints.push(<Tag key="unique" color="green" style={{ fontSize: 10, marginRight: 4 }} title="唯一约束">UQ</Tag>);
  }
  if (col.autoIncrement) {
    constraints.push(<Tag key="ai" color="orange" style={{ fontSize: 10, marginRight: 4 }} title="自增">AI</Tag>);
  }
  if (!col.nullable) {
    constraints.push(<Tag key="notnull" color="red" style={{ fontSize: 10, marginRight: 4 }} title="非空">NN</Tag>);
  }
  return constraints;
};

const cascadeRules = {
  CASCADE: '当父表中的记录被更新/删除时，子表中对应的记录也会被更新/删除',
  RESTRICT: '如果子表中存在关联记录，阻止父表中的记录被更新/删除',
  'NO ACTION': '与 RESTRICT 类似，检查关联记录，但在约束检查时间点执行',
  'SET NULL': '当父表中的记录被更新/删除时，子表中对应的外键字段被设置为 NULL（需要字段允许为 NULL）',
  'SET DEFAULT': '当父表中的记录被更新/删除时，子表中对应的外键字段被设置为默认值（需要字段有默认值）'
};

interface RelationshipEditorProps {
  visible: boolean;
  onClose: () => void;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  visible,
  onClose
}) => {
  const {
    tables,
    relationships,
    currentProject,
    createRelationship,
    deleteRelationship,
    loadRelationships
  } = useAppStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [sourceTableId, setSourceTableId] = useState<string | undefined>(undefined);
  const [targetTableId, setTargetTableId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (visible && currentProject) {
      loadRelationships(currentProject.id);
    }
  }, [visible, currentProject]);

  const willCauseCycle = useMemo(() => {
    if (!sourceTableId || !targetTableId || sourceTableId === targetTableId) {
      return null;
    }
    const tempRelationships = [
      ...relationships,
      {
        id: 'temp',
        sourceTableId,
        targetTableId
      } as Relationship
    ];
    const adjacency = new Map<string, string[]>();
    for (const rel of relationships) {
      if (!adjacency.has(rel.sourceTableId)) {
        adjacency.set(rel.sourceTableId, []);
      }
      adjacency.get(rel.sourceTableId)!.push(rel.targetTableId);
    }
    if (!adjacency.has(sourceTableId)) {
      adjacency.set(sourceTableId, []);
    }
    adjacency.get(sourceTableId)!.push(targetTableId);
    const visited = new Set<string>();
    const path: string[] = [];
    function dfs(tableId: string): string[] | null {
      if (tableId === sourceTableId) {
        return [...path, sourceTableId];
      }
      if (visited.has(tableId)) {
        return null;
      }
      visited.add(tableId);
      path.push(tableId);
      const neighbors = adjacency.get(tableId) || [];
      for (const neighbor of neighbors) {
        const result = dfs(neighbor);
        if (result) {
          return result;
        }
      }
      path.pop();
      return null;
    }
    return dfs(targetTableId);
  }, [sourceTableId, targetTableId, relationships]);

  const getTableName = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.name || 'Unknown';
  };

  const getColumnName = (tableId: string, columnId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table?.columns.find(c => c.id === columnId)?.name || 'Unknown';
  };

  const getSourceColumns = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table?.columns || [];
  };

  const getTargetColumns = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table?.columns || [];
  };

  const handleCreate = async (values: any) => {
    if (currentProject) {
      await createRelationship(currentProject.id, {
        sourceTableId: values.sourceTable,
        sourceColumnId: values.sourceColumn,
        targetTableId: values.targetTable,
        targetColumnId: values.targetColumn,
        relationshipType: values.relationshipType || 'one-to-many',
        sourceCardinality: values.sourceCardinality || '1',
        targetCardinality: values.targetCardinality || 'N',
        onUpdate: values.onUpdate || 'CASCADE',
        onDelete: values.onDelete || 'RESTRICT'
      });
      setIsCreateModalOpen(false);
      form.resetFields();
    }
  };

  const columns = [
    {
      title: '关系名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => name || '未命名',
    },
    {
      title: '源表',
      key: 'source',
      render: (_: any, record: Relationship) => (
        <Tag color="blue">
          {getTableName(record.sourceTableId)}.{getColumnName(record.sourceTableId, record.sourceColumnId)}
        </Tag>
      ),
    },
    {
      title: '关系',
      dataIndex: 'relationshipType',
      key: 'relationshipType',
      render: (type: string, record: Relationship) => {
        const map: Record<string, string> = {
          'one-to-one': '一对一',
          'one-to-many': '一对多',
          'many-to-many': '多对多'
        };
        const sourceCard = record.sourceCardinality || '1';
        const targetCard = record.targetCardinality || 'N';
        return (
          <Space>
            <Tag color="purple">{map[type] || type}</Tag>
            <Text type="secondary">({sourceCard}→{targetCard})</Text>
          </Space>
        );
      },
    },
    {
      title: '目标表',
      key: 'target',
      render: (_: any, record: Relationship) => (
        <Tag color="orange">
          {getTableName(record.targetTableId)}.{getColumnName(record.targetTableId, record.targetColumnId)}
        </Tag>
      ),
    },
    {
      title: '级联规则',
      key: 'cascade',
      render: (_: any, record: Relationship) => (
        <Space size="small">
          <Text type="secondary">更新:</Text>
          <Tag>{record.onUpdate}</Tag>
          <Text type="secondary">删除:</Text>
          <Tag>{record.onDelete}</Tag>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Relationship) => (
        <Space size="small">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    await deleteRelationship(id);
  };

  return (
    <Modal
      title={<Space><LinkOutlined /><Title level={4} style={{ margin: 0 }}>关系管理</Title></Space>}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>
      ]}
      width={900}
    >
      <div style={{ display: 'none' }}>
        <Form form={form} layout="vertical">
          <Form.Item name="sourceTable"><Input /></Form.Item>
          <Form.Item name="sourceColumn"><Input /></Form.Item>
          <Form.Item name="targetTable"><Input /></Form.Item>
          <Form.Item name="targetColumn"><Input /></Form.Item>
          <Form.Item name="relationshipType"><Input /></Form.Item>
          <Form.Item name="sourceCardinality"><Input /></Form.Item>
          <Form.Item name="targetCardinality"><Input /></Form.Item>
          <Form.Item name="onUpdate"><Input /></Form.Item>
          <Form.Item name="onDelete"><Input /></Form.Item>
        </Form>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          创建关系
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={relationships}
        rowKey="id"
        size="small"
        pagination={false}
      />

      <Modal
        title="创建新关系"
        open={isCreateModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setSourceTableId(undefined);
          setTargetTableId(undefined);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        {isCreateModalOpen ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
          >
            <Form.Item
              label="源表"
              name="sourceTable"
              rules={[{ required: true, message: '请选择源表' }]}
            >
              <Select 
                placeholder="请选择源表"
                onChange={(value) => setSourceTableId(value)}
              >
                {tables.map(table => (
                  <Option key={table.id} value={table.id}>
                    <Space>
                      <span>{table.name}</span>
                      {table.comment && (
                        <Tag color="blue" style={{ fontSize: 11 }}>{table.comment}</Tag>
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="源字段"
              name="sourceColumn"
              rules={[{ required: true, message: '请选择源字段' }]}
            >
              <Select placeholder="请选择源字段">
                {sourceTableId &&
                  getSourceColumns(sourceTableId).map((col: Column) => (
                    <Option key={col.id} value={col.id}>
                      <Space>
                        {getColumnConstraints(col)}
                        <span>{col.name}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>({col.dataType})</span>
                        {col.comment && (
                          <Tag color="green" style={{ fontSize: 11 }}>{col.comment}</Tag>
                        )}
                      </Space>
                    </Option>
                  ))
                }
              </Select>
            </Form.Item>

            <Form.Item
              label="目标表"
              name="targetTable"
              rules={[{ required: true, message: '请选择目标表' }]}
            >
              <Select 
                placeholder="请选择目标表"
                onChange={(value) => setTargetTableId(value)}
              >
                {tables.map(table => (
                  <Option key={table.id} value={table.id}>
                    <Space>
                      <span>{table.name}</span>
                      {table.comment && (
                        <Tag color="blue" style={{ fontSize: 11 }}>{table.comment}</Tag>
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {willCauseCycle && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="循环依赖警告"
                description={
                  <div>
                    <p style={{ margin: 0 }}>
                      此关系会导致循环依赖：
                      <br />
                      {willCauseCycle.map((id, index) => (
                        <span key={id}>
                          {getTableName(id)}
                          {index < willCauseCycle.length - 1 && ' → '}
                        </span>
                      ))}
                      <br />
                      <span style={{ fontSize: 12, color: '#999' }}>
                        创建此关系可能会导致数据库操作问题。
                      </span>
                    </p>
                  </div>
                }
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              label="目标字段"
              name="targetColumn"
              rules={[{ required: true, message: '请选择目标字段' }]}
            >
              <Select placeholder="请选择目标字段">
                {targetTableId &&
                  getTargetColumns(targetTableId).map((col: Column) => (
                    <Option key={col.id} value={col.id}>
                      <Space>
                        {getColumnConstraints(col)}
                        <span>{col.name}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>({col.dataType})</span>
                        {col.comment && (
                          <Tag color="green" style={{ fontSize: 11 }}>{col.comment}</Tag>
                        )}
                      </Space>
                    </Option>
                  ))
                }
              </Select>
            </Form.Item>

            <Form.Item
              label="关系类型"
              name="relationshipType"
              initialValue="one-to-many"
            >
              <Select>
                <Option value="one-to-one">一对一</Option>
                <Option value="one-to-many">一对多</Option>
                <Option value="many-to-many">多对多</Option>
              </Select>
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                label={
                  <Tooltip title="源表基数：源表中每个记录对应目标表记录的数量">
                    <Space>
                      源表基数
                      <InfoCircleOutlined style={{ fontSize: 12, color: '#1890ff' }} />
                    </Space>
                  </Tooltip>
                }
                name="sourceCardinality"
                initialValue="1"
              >
                <Select>
                  <Option value="1">1 (唯一)</Option>
                  <Option value="N">N (多个)</Option>
                  <Option value="*">* (任意)</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={
                  <Tooltip title="目标表基数：目标表中每个记录对应源表记录的数量">
                    <Space>
                      目标表基数
                      <InfoCircleOutlined style={{ fontSize: 12, color: '#1890ff' }} />
                    </Space>
                  </Tooltip>
                }
                name="targetCardinality"
                initialValue="N"
              >
                <Select>
                  <Option value="1">1 (唯一)</Option>
                  <Option value="N">N (多个)</Option>
                  <Option value="*">* (任意)</Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              label={
                <Tooltip title="选择当父表记录被更新时，子表记录的处理方式">
                  <Space>
                    更新时规则
                    <InfoCircleOutlined style={{ fontSize: 14, color: '#1890ff' }} />
                  </Space>
                </Tooltip>
              }
              name="onUpdate"
              initialValue="CASCADE"
            >
              <Select>
                <Option value="CASCADE">
                  <Tooltip title={cascadeRules['CASCADE']}>CASCADE</Tooltip>
                </Option>
                <Option value="RESTRICT">
                  <Tooltip title={cascadeRules['RESTRICT']}>RESTRICT</Tooltip>
                </Option>
                <Option value="NO ACTION">
                  <Tooltip title={cascadeRules['NO ACTION']}>NO ACTION</Tooltip>
                </Option>
                <Option value="SET NULL">
                  <Tooltip title={cascadeRules['SET NULL']}>SET NULL</Tooltip>
                </Option>
                <Option value="SET DEFAULT">
                  <Tooltip title={cascadeRules['SET DEFAULT']}>SET DEFAULT</Tooltip>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={
                <Tooltip title="选择当父表记录被删除时，子表记录的处理方式">
                  <Space>
                    删除时规则
                    <InfoCircleOutlined style={{ fontSize: 14, color: '#1890ff' }} />
                  </Space>
                </Tooltip>
              }
              name="onDelete"
              initialValue="RESTRICT"
            >
              <Select>
                <Option value="CASCADE">
                  <Tooltip title={cascadeRules['CASCADE']}>CASCADE</Tooltip>
                </Option>
                <Option value="RESTRICT">
                  <Tooltip title={cascadeRules['RESTRICT']}>RESTRICT</Tooltip>
                </Option>
                <Option value="NO ACTION">
                  <Tooltip title={cascadeRules['NO ACTION']}>NO ACTION</Tooltip>
                </Option>
                <Option value="SET NULL">
                  <Tooltip title={cascadeRules['SET NULL']}>SET NULL</Tooltip>
                </Option>
                <Option value="SET DEFAULT">
                  <Tooltip title={cascadeRules['SET DEFAULT']}>SET DEFAULT</Tooltip>
                </Option>
              </Select>
            </Form.Item>
          </Form>
        ) : (
          <Form form={form} layout="vertical" style={{ display: 'none' }}>
            <Form.Item name="sourceTable"><Input /></Form.Item>
            <Form.Item name="sourceColumn"><Input /></Form.Item>
            <Form.Item name="targetTable"><Input /></Form.Item>
            <Form.Item name="targetColumn"><Input /></Form.Item>
            <Form.Item name="relationshipType"><Input /></Form.Item>
            <Form.Item name="onUpdate"><Input /></Form.Item>
            <Form.Item name="onDelete"><Input /></Form.Item>
          </Form>
        )}
      </Modal>
    </Modal>
  );
};

export default RelationshipEditor;
