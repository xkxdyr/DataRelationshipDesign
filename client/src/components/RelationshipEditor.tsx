import React, { useState, useEffect } from 'react';
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
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { Table as TableType, Relationship, Column } from '../types';
import { useAppStore } from '../stores/appStore';

const { Title, Text } = Typography;
const { Option } = Select;

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
      render: (type: string) => {
        const map: Record<string, string> = {
          'one-to-one': '一对一',
          'one-to-many': '一对多',
          'many-to-many': '多对多'
        };
        return <Tag color="green">{map[type] || type}</Tag>;
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
                    {table.name}
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
                      {col.name} ({col.dataType})
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
                    {table.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="目标字段"
              name="targetColumn"
              rules={[{ required: true, message: '请选择目标字段' }]}
            >
              <Select placeholder="请选择目标字段">
                {targetTableId &&
                  getTargetColumns(targetTableId).map((col: Column) => (
                    <Option key={col.id} value={col.id}>
                      {col.name} ({col.dataType})
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

            <Form.Item
              label="更新时规则"
              name="onUpdate"
              initialValue="CASCADE"
            >
              <Select>
                <Option value="CASCADE">CASCADE</Option>
                <Option value="RESTRICT">RESTRICT</Option>
                <Option value="NO ACTION">NO ACTION</Option>
                <Option value="SET NULL">SET NULL</Option>
                <Option value="SET DEFAULT">SET DEFAULT</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="删除时规则"
              name="onDelete"
              initialValue="RESTRICT"
            >
              <Select>
                <Option value="CASCADE">CASCADE</Option>
                <Option value="RESTRICT">RESTRICT</Option>
                <Option value="NO ACTION">NO ACTION</Option>
                <Option value="SET NULL">SET NULL</Option>
                <Option value="SET DEFAULT">SET DEFAULT</Option>
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
