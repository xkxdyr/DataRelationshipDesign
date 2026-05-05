import React from 'react'
import { Modal, Form, Input, Button, message } from 'antd'
import { useAppStore } from '../stores/appStore'

interface CreateVersionModalProps {
  open: boolean
  selectedProjectId: string | null
  onClose: () => void
  onSuccess: () => void
}

export const CreateVersionModal: React.FC<CreateVersionModalProps> = ({ 
  open, 
  selectedProjectId, 
  onClose,
  onSuccess 
}) => {
  const [form] = Form.useForm()
  const { createVersion, currentProject, tables, relationships, loadVersions } = useAppStore()

  const handleCreateVersion = async (values: any) => {
    if (selectedProjectId) {
      try {
        // 获取当前项目的完整数据快照
        const projectTables = tables.filter(t => t.projectId === selectedProjectId)
        const projectRelationships = relationships.filter(r => r.projectId === selectedProjectId)

        const snapshotData = {
          id: selectedProjectId,
          tables: projectTables,
          relationships: projectRelationships,
          project: currentProject
        }

        const snapshot = JSON.stringify(snapshotData)

        await createVersion(selectedProjectId, {
          name: values.name,
          comment: values.comment || '',
          data: snapshot
        })
        
        message.success('版本创建成功')
        form.resetFields()
        onClose()
        onSuccess()
      } catch (error) {
        message.error('版本创建失败: ' + (error as Error).message)
      }
    }
  }

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="新建版本"
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
        onFinish={handleCreateVersion}
      >
        <Form.Item
          name="name"
          label="版本名称"
          rules={[{ required: true, message: "请输入版本名称" }]}
        >
          <Input placeholder="请输入版本名称" />
        </Form.Item>
        
        <Form.Item
          name="comment"
          label="备注说明"
        >
          <Input.TextArea placeholder="请输入备注说明" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateVersionModal