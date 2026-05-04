import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateIndexDTO {
  name: string
  columns: string
  unique?: boolean
  type?: string
}

export interface UpdateIndexDTO {
  name?: string
  columns?: string
  unique?: boolean
  type?: string
}

export const indexService = {
  async findByTableId(tableId: string) {
    return await prisma.index.findMany({
      where: { tableId }
    })
  },

  async findById(id: string) {
    return await prisma.index.findUnique({
      where: { id }
    })
  },

  async create(tableId: string, data: CreateIndexDTO) {
    return await prisma.index.create({
      data: {
        tableId,
        name: data.name,
        columns: data.columns,
        unique: data.unique || false,
        type: data.type || 'BTREE'
      }
    })
  },

  async update(id: string, data: UpdateIndexDTO) {
    return await prisma.index.update({
      where: { id },
      data: {
        name: data.name,
        columns: data.columns,
        unique: data.unique,
        type: data.type
      }
    })
  },

  async delete(id: string) {
    return await prisma.index.delete({
      where: { id }
    })
  }
}
