import React, { useEffect, useState, useCallback } from 'react'
import { Button, Input, Space, Typography, Avatar, Tooltip, Popconfirm, Empty, Tag, Divider, message } from 'antd'
import { SendOutlined, CommentOutlined, DeleteOutlined, CheckCircleOutlined, RollbackOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { commentApi } from '../services/api'
import { Comment } from '../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

interface CommentItemProps {
  comment: Comment
  depth: number
  onReply: (parentId: string) => void
  onResolve: (id: string) => void
  onReopen: (id: string) => void
  onDelete: (id: string) => void
  replyingTo: string | null
  replyContent: string
  setReplyContent: (content: string) => void
  onSubmitReply: (parentId: string) => void
  currentUserId: string | undefined
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth,
  onReply,
  onResolve,
  onReopen,
  onDelete,
  replyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  currentUserId
}) => {
  const isResolved = comment.status === 'resolved'
  const isOwn = currentUserId === comment.userId

  return (
    <div style={{ marginBottom: depth === 0 ? 12 : 8 }}>
      <div style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: isResolved ? 'var(--theme-bg-elevated, #f6ffed)' : 'var(--theme-bg-container, #fff)',
        border: isResolved ? '1px solid #b7eb8f' : '1px solid var(--theme-border, #f0f0f0)',
        opacity: isResolved ? 0.75 : 1
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Avatar
            size={depth === 0 ? 32 : 24}
            style={{ backgroundColor: comment.userColor || '#1890ff', flexShrink: 0 }}
          >
            {(comment.userDisplayName || comment.userName).charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text strong style={{ fontSize: 13 }}>
                {comment.userDisplayName || comment.userName}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatTime(comment.createdAt)}
              </Text>
              {isResolved && (
                <Tag color="success" style={{ marginLeft: 'auto', fontSize: 11, lineHeight: '18px' }}>
                  已解决
                </Tag>
              )}
            </div>
            <Paragraph
              style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {comment.content}
            </Paragraph>
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
              {!isResolved && (
                <Button
                  type="link"
                  size="small"
                  icon={<CommentOutlined />}
                  onClick={() => onReply(comment.id)}
                  style={{ padding: 0, height: 22, fontSize: 12 }}
                >
                  回复
                </Button>
              )}
              {isOwn && !isResolved && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => onResolve(comment.id)}
                  style={{ padding: 0, height: 22, fontSize: 12, color: '#52c41a' }}
                >
                  解决
                </Button>
              )}
              {isOwn && isResolved && (
                <Button
                  type="link"
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => onReopen(comment.id)}
                  style={{ padding: 0, height: 22, fontSize: 12 }}
                >
                  重新打开
                </Button>
              )}
              {isOwn && (
                <Popconfirm
                  title="确定删除这条评论？"
                  onConfirm={() => onDelete(comment.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ padding: 0, height: 22, fontSize: 12 }}
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        </div>

        {replyingTo === comment.id && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <TextArea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="输入回复内容..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ flex: 1 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  onSubmitReply(comment.id)
                }
              }}
            />
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              onClick={() => onSubmitReply(comment.id)}
              disabled={!replyContent.trim()}
            >
              回复
            </Button>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--theme-border, #f0f0f0)' }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onResolve={onResolve}
              onReopen={onReopen}
              onDelete={onDelete}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={onSubmitReply}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const CommentTab: React.FC = () => {
  const { currentUser, currentProject, activeTabId, openTabs, tables } = useAppStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activeTab = activeTabId ? openTabs.find(t => t.id === activeTabId) : null
  const tableId = activeTab?.projectId || ''

  const table = tables.find(t => t.id === tableId)

  const loadComments = useCallback(async () => {
    if (!tableId) return
    setLoading(true)
    try {
      const res = await commentApi.getByTableId(tableId)
      if (res.success && res.data) {
        setComments(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [tableId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentProject || !currentUser) return
    setSubmitting(true)
    try {
      const res = await commentApi.create(tableId, {
        projectId: currentProject.id,
        content: newComment.trim()
      })
      if (res.success) {
        setNewComment('')
        await loadComments()
        message.success('评论已添加')
      } else {
        message.error(res.error || '添加失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !currentProject) return
    setSubmitting(true)
    try {
      const res = await commentApi.create(tableId, {
        projectId: currentProject.id,
        content: replyContent.trim(),
        parentId
      })
      if (res.success) {
        setReplyContent('')
        setReplyingTo(null)
        await loadComments()
        message.success('回复已添加')
      } else {
        message.error(res.error || '回复失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async (id: string) => {
    try {
      const res = await commentApi.update(id, { status: 'resolved' })
      if (res.success) {
        await loadComments()
        message.success('评论已解决')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleReopen = async (id: string) => {
    try {
      const res = await commentApi.update(id, { status: 'open' })
      if (res.success) {
        await loadComments()
        message.success('评论已重新打开')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await commentApi.delete(id)
      if (res.success) {
        await loadComments()
        message.success('评论已删除')
      }
    } catch {
      message.error('删除失败')
    }
  }

  const openCount = comments.filter(c => c.status === 'open').length

  if (!tableId || !table) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Empty description="请先选中一个表格节点，然后打开评论面板" />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--theme-border, #f0f0f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <Space>
          <CommentOutlined />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{table.name}</span>
          {openCount > 0 && (
            <Tag color="processing">{openCount} 条待处理</Tag>
          )}
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Text type="secondary">加载中...</Text>
          </div>
        ) : comments.length === 0 ? (
          <Empty
            description="暂无评论，在下方添加第一条评论"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              onReply={(parentId) => {
                setReplyingTo(parentId)
                setReplyContent('')
              }}
              onResolve={handleResolve}
              onReopen={handleReopen}
              onDelete={handleDelete}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={handleReply}
              currentUserId={currentUser?.id}
            />
          ))
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--theme-border, #f0f0f0)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <TextArea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="输入评论内容..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ flex: 1 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                handleAddComment()
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAddComment}
            disabled={!newComment.trim() || submitting}
            loading={submitting}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}