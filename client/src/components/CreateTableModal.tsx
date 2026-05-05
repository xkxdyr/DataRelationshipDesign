import React from 'react'
import { Modal, Form, Input } from 'antd'
import { useAppStore } from '../stores/appStore'

interface CreateTableModalProps {
  open: boolean
  onClose: () => void
}

export const CreateTableModal: React.FC<CreateTableModalProps> = ({ open, onClose }) => {
  const { createTable, tables, currentProject } = useAppStore()
  const [form] = Form.useForm()

  const handleCreateTable = async (values: { name: string; comment?: string }) => {
    if (!currentProject) return
    
    await createTable(currentProject.id, {
      name: values.name,
      comment: values.comment,
      positionX: 100,
      positionY: 100
    })
    
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="新建表"
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="创建"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateTable}
      >
        <Form.Item
          name="name"
          label="表名称"
          rules={[
            { required: true, message: '请输入表名称' },
            { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '表名只能包含字母、数字和下划线，必须以字母或下划线开头' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (value && tables.some(t => t.name.toLowerCase() === value.toLowerCase())) {
                  return Promise.reject(new Error('该表名已存在'))
                }
                return Promise.resolve()
              }
            })
          ]}
        >
          <Input placeholder="请输入表名称" />
        </Form.Item>
        
        <Form.Item
          name="comment"
          label="表注释"
        >
          <Input.TextArea placeholder="请输入表注释" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateTableModal