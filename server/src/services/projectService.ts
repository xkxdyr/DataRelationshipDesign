import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateProjectDTO {
  name: string
  description?: string
  databaseType?: string
  createdBy?: string
}

export interface UpdateProjectDTO {
  name?: string
  description?: string
  databaseType?: string
  status?: string
}

export const projectService = {
  async findAll() {
    return await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' }
    })
  },

  async findById(id: string) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            columns: true,
            indexes: true
          }
        },
        relationships: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 10
        }
      }
    })
  },

  async create(data: CreateProjectDTO) {
    return await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        databaseType: data.databaseType || 'MYSQL',
        createdBy: data.createdBy || 'system'
      }
    })
  },

  async update(id: string, data: UpdateProjectDTO) {
    return await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        databaseType: data.databaseType,
        status: data.status
      }
    })
  },

  async delete(id: string) {
    return await prisma.project.delete({
      where: { id }
    })
  },

  async duplicate(id: string) {
    const original = await this.findById(id)
    if (!original) {
      throw new Error('Project not found')
    }

    return await prisma.project.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        databaseType: original.databaseType,
        status: 'DRAFT',
        createdBy: 'system'
      }
    })
  }
}
