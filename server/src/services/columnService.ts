import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateColumnDTO {
  name: string
  dataType: string
  length?: number
  precision?: number
  scale?: number
  nullable?: boolean
  defaultValue?: string
  autoIncrement?: boolean
  primaryKey?: boolean
  unique?: boolean
  comment?: string
  order?: number
}

export interface UpdateColumnDTO {
  name?: string
  dataType?: string
  length?: number
  precision?: number
  scale?: number
  nullable?: boolean
  defaultValue?: string
  autoIncrement?: boolean
  primaryKey?: boolean
  unique?: boolean
  comment?: string
  order?: number
}

export const columnService = {
  async findByTableId(tableId: string) {
    return await prisma.column.findMany({
      where: { tableId },
      orderBy: { order: 'asc' }
    })
  },

  async findById(id: string) {
    return await prisma.column.findUnique({
      where: { id }
    })
  },

  async create(tableId: string, data: CreateColumnDTO) {
    const count = await prisma.column.count({ where: { tableId } })
    return await prisma.column.create({
      data: {
        tableId,
        name: data.name,
        dataType: data.dataType || 'VARCHAR',
        length: data.length,
        precision: data.precision,
        scale: data.scale,
        nullable: data.nullable ?? true,
        defaultValue: data.defaultValue,
        autoIncrement: data.autoIncrement ?? false,
        primaryKey: data.primaryKey ?? false,
        unique: data.unique ?? false,
        comment: data.comment,
        order: data.order ?? count
      }
    })
  },

  async update(id: string, data: UpdateColumnDTO) {
    return await prisma.column.update({
      where: { id },
      data: {
        name: data.name,
        dataType: data.dataType,
        length: data.length,
        precision: data.precision,
        scale: data.scale,
        nullable: data.nullable,
        defaultValue: data.defaultValue,
        autoIncrement: data.autoIncrement,
        primaryKey: data.primaryKey,
        unique: data.unique,
        comment: data.comment,
        order: data.order
      }
    })
  },

  async updateOrder(tableId: string, columnOrders: { id: string; order: number }[]) {
    const updates = columnOrders.map(({ id, order }) =>
      prisma.column.update({
        where: { id },
        data: { order }
      })
    )
    return await prisma.$transaction(updates)
  },

  async delete(id: string) {
    return await prisma.column.delete({
      where: { id }
    })
  },

  async bulkCreate(tableId: string, columns: CreateColumnDTO[]) {
    const created = []
    for (let i = 0; i < columns.length; i++) {
      const col = await prisma.column.create({
        data: {
          ...columns[i],
          tableId,
          order: i
        }
      })
      created.push(col)
    }
    return created
  }
}
