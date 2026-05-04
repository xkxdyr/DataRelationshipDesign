import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateTableDTO {
  name: string
  comment?: string
  positionX?: number
  positionY?: number
}

export interface UpdateTableDTO {
  name?: string
  comment?: string
  positionX?: number
  positionY?: number
}

export const tableService = {
  async findByProjectId(projectId: string) {
    return await prisma.table.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  },

  async findById(id: string) {
    return await prisma.table.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: 'asc' }
        },
        indexes: true
      }
    })
  },

  async create(projectId: string, data: CreateTableDTO) {
    return await prisma.table.create({
      data: {
        projectId,
        name: data.name,
        comment: data.comment || null,
        positionX: data.positionX || 0,
        positionY: data.positionY || 0
      }
    })
  },

  async update(id: string, data: UpdateTableDTO) {
    return await prisma.table.update({
      where: { id },
      data: {
        name: data.name,
        comment: data.comment,
        positionX: data.positionX,
        positionY: data.positionY
      }
    })
  },

  async delete(id: string) {
    return await prisma.table.delete({
      where: { id }
    })
  },

  async updatePosition(id: string, positionX: number, positionY: number) {
    return await prisma.table.update({
      where: { id },
      data: {
        positionX,
        positionY
      }
    })
  }
}
