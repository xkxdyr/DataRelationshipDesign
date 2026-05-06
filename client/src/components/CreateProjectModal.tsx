import React from 'react'
import { Modal, Form, Input, Select, Button, message } from 'antd'
import { useAppStore } from '../stores/appStore'

const { Option } = Select

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm()
  const { createProject, projects } = useAppStore()

  const handleCreate = async (values: any) => {
    try {
      await createProject({ 
        name: values.name,
        description: values.description || '',
        databaseType: values.databaseType || 'MYSQL'
      })
      message.success('项目创建成功')
      onClose()
    } catch (error) {
      message.error('项目创建失败: ' + (error as Error).message)
    }
  }

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <>
      {/* 始终渲染隐藏的 Form，确保 useForm 不会报警告 */}
      <Form form={form} layout="vertical" style={{ display: 'none' }}>
        <Form.Item name="name"><Input /></Form.Item>
        <Form.Item name="description"><Input /></Form.Item>
        <Form.Item name="databaseType"><Input /></Form.Item>
      </Form>
      
      <Modal
        title="新建项目"
        open={open}
        onOk={() => form.submit()}
        onCancel={handleClose}
        okText="创建"
        cancelText="取消"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { pattern: /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_\s-]*$/, message: '项目名只能包含中文、字母、数字、下划线、空格和连字符，必须以中文、字母或下划线开头' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && projects.some(p => p.name.toLowerCase() === value.toLowerCase())) {
                    return Promise.reject(new Error('该项目名已存在'))
                  }
                  return Promise.resolve()
                }
              })
            ]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="项目描述"
          >
            <Input.TextArea placeholder="请输入项目描述" rows={3} />
          </Form.Item>
          
          <Form.Item
            name="databaseType"
            label="数据库类型"
            initialValue="MYSQL"
          >
            <Select>
              <Option value="MYSQL">MySQL</Option>
              <Option value="POSTGRESQL">PostgreSQL</Option>
              <Option value="SQLITE">SQLite</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default CreateProjectModal