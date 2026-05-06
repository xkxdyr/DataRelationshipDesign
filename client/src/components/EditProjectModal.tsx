import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, Button, message } from 'antd'
import { useAppStore } from '../stores/appStore'
import { Project } from '../types'

const { Option } = Select

interface EditProjectModalProps {
  open: boolean
  project: Project | null
  onClose: () => void
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ open, project, onClose }) => {
  const [form] = Form.useForm()
  const { updateProject, projects, editingProjectId } = useAppStore() as any

  useEffect(() => {
    if (open && project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
        databaseType: project.databaseType
      })
    }
  }, [open, project, form])

  const handleUpdate = async (values: any) => {
    if (editingProjectId) {
      try {
        await updateProject(editingProjectId, {
          name: values.name,
          description: values.description || '',
          databaseType: values.databaseType || 'MYSQL'
        })
        message.success('项目更新成功')
        onClose()
      } catch (error) {
        message.error('项目更新失败: ' + (error as Error).message)
      }
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
        title="编辑项目"
        open={open}
        onOk={() => form.submit()}
        onCancel={handleClose}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { pattern: /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_\s-]*$/, message: '项目名只能包含中文、字母、数字、下划线、空格和连字符，必须以中文、字母或下划线开头' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value && projects.some((p: any) => p.id !== editingProjectId && p.name.toLowerCase() === value.toLowerCase())) {
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

export default EditProjectModal