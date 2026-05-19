import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const snapshotService = {
  async create(projectId: string, name: string, comment: string, data: string) {
    const versionCount = await prisma.version.count({
      where: { projectId }
    })

    return await prisma.version.create({
      data: {
        projectId,
        version: versionCount + 1,
        name,
        comment,
        data
      }
    })
  },

  async listByProject(projectId: string) {
    return await prisma.version.findMany({
      where: { projectId, version: { gt: 0 } },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        projectId: true,
        version: true,
        name: true,
        comment: true,
        createdAt: true
      }
    })
  },

  async findById(projectId: string, versionId: string) {
    return await prisma.version.findFirst({
      where: { projectId, id: versionId }
    })
  },

  async delete(versionId: string) {
    return await prisma.version.delete({
      where: { id: versionId }
    })
  }
}