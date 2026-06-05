import React, { useState, useCallback } from 'react'
import { Modal, Button, Space, Input, message } from 'antd'
import { KeyOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'

interface JoinProjectModalProps {
  open: boolean
  onClose: () => void
}

const PROJECT_COLORS = {
  HINT_TEXT: '#8c8c8c',
}

export const JoinProjectModal: React.FC<JoinProjectModalProps> = ({ open, onClose }) => {
  const { isAuthenticated, loadProjects, openProjectTab } = useAppStore()
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [joiningProject, setJoiningProject] = useState(false)

  const handleClose = useCallback(() => {
    setInviteCodeInput('')
    onClose()
  }, [onClose])

  const handleJoin = useCallback(async () => {
    if (!inviteCodeInput.trim()) {
      message.error('请输入邀请码')
      return
    }
    
    if (!isAuthenticated) {
      message.error('请先登录')
      return
    }
    
    setJoiningProject(true)
    try {
      const cleanCode = inviteCodeInput.replace(/-/g, '').toUpperCase().trim()
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3001/api/projects/invites/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ inviteCode: cleanCode })
      })
      const data = await response.json()
      if (data.success) {
        message.success('加入项目成功！')
        handleClose()
        loadProjects()
        if (data.data && data.data.id) {
          openProjectTab(data.data)
        }
      } else {
        message.error(data.message || '加入项目失败')
      }
    } catch (error) {
      message.error('加入项目失败: ' + (error as Error).message)
    } finally {
      setJoiningProject(false)
    }
  }, [inviteCodeInput, isAuthenticated, loadProjects, openProjectTab, handleClose])

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>加入项目</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button 
          key="join" 
          type="primary" 
          onClick={handleJoin}
          loading={joiningProject}
          disabled={!inviteCodeInput.trim()}
        >
          加入
        </Button>
      ]}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: PROJECT_COLORS.HINT_TEXT, marginBottom: 16 }}>请输入邀请码加入项目。邀请码格式：XXXX-XXXX-XXXX-XXXX</p>
        <Input
          placeholder="请输入邀请码（如：8K2F-9Q4X-Z3N5-7A6C）"
          value={inviteCodeInput}
          onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
          prefix={<KeyOutlined />}
          size="large"
          style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '18px', letterSpacing: '2px' }}
          maxLength={23}
        />
      </div>
    </Modal>
  )
}