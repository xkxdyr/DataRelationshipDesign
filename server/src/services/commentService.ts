import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateCommentDTO {
  projectId: string
  tableId: string
  userId: string
  userName: string
  userDisplayName?: string
  userColor?: string
  content: string
  parentId?: string
}

export interface UpdateCommentDTO {
  content?: string
  status?: 'open' | 'resolved'
}

export const commentService = {
  async findByTableId(tableId: string) {
    const comments = await prisma.comment.findMany({
      where: { tableId },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return comments.filter(c => !c.parentId)
  },

  async countByTableId(tableId: string) {
    return await prisma.comment.count({
      where: { tableId }
    })
  },

  async findById(id: string) {
    return await prisma.comment.findUnique({
      where: { id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  },

  async create(data: CreateCommentDTO) {
    return await prisma.comment.create({
      data: {
        projectId: data.projectId,
        tableId: data.tableId,
        userId: data.userId,
        userName: data.userName,
        userDisplayName: data.userDisplayName,
        userColor: data.userColor || '#1890ff',
        content: data.content,
        parentId: data.parentId || null,
        status: 'open'
      },
      include: {
        replies: true
      }
    })
  },

  async update(id: string, data: UpdateCommentDTO) {
    return await prisma.comment.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status !== undefined && { status: data.status })
      },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  },

  async delete(id: string) {
    return await prisma.comment.delete({
      where: { id }
    })
  },

  async countByProjectId(projectId: string) {
    return await prisma.comment.count({
      where: { projectId }
    })
  }
}