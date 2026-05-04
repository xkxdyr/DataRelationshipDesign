import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateVersionDTO {
  name: string
  comment?: string
  data?: string
}

export interface UpdateVersionDTO {
  name?: string
  comment?: string
  data?: string
}

export const versionService = {
  async findByProjectId(projectId: string) {
    return await prisma.version.findMany({
      where: { projectId },
      orderBy: { version: 'desc' }
    })
  },

  async findById(id: string) {
    return await prisma.version.findUnique({
      where: { id }
    })
  },

  async create(projectId: string, data: CreateVersionDTO) {
    // 获取当前所有版本并排序找到最大版本号
    const versions = await prisma.version.findMany({
      where: { projectId },
      select: { version: true },
      orderBy: { version: 'desc' },
      take: 1
    })
    
    const newVersion = versions.length > 0 ? versions[0].version + 1 : 1
    
    return await prisma.version.create({
      data: {
        projectId,
        version: newVersion,
        name: data.name,
        comment: data.comment || null,
        data: data.data || '{}'
      }
    })
  },

  async update(id: string, data: UpdateVersionDTO) {
    return await prisma.version.update({
      where: { id },
      data: {
        name: data.name,
        comment: data.comment,
        data: data.data
      }
    })
  },

  async delete(id: string) {
    return await prisma.version.delete({
      where: { id }
    })
  }
}
