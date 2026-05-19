import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateBranchDTO {
  name: string
  description?: string
  parentId?: string
}

export interface UpdateBranchDTO {
  name?: string
  description?: string
  isActive?: boolean
}

export const branchService = {
  async findByProject(projectId: string) {
    return await prisma.branch.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { versions: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    })
  },

  async findById(id: string) {
    return await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { versions: true }
        },
        parent: {
          select: { id: true, name: true }
        },
        children: {
          select: { id: true, name: true }
        }
      }
    })
  },

  async create(projectId: string, data: CreateBranchDTO) {
    const branch = await prisma.branch.create({
      data: {
        projectId,
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null
      }
    })
    return branch
  },

  async update(id: string, data: UpdateBranchDTO) {
    const branch = await prisma.branch.update({
      where: { id },
      data
    })
    return branch
  },

  async remove(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        versions: { select: { id: true } },
        children: { select: { id: true } }
      }
    })

    if (!branch) {
      throw new Error('分支不存在')
    }

    if (branch.isDefault) {
      throw new Error('不能删除默认分支')
    }

    if (branch.children.length > 0) {
      throw new Error('该分支下有子分支，请先删除子分支')
    }

    await prisma.version.updateMany({
      where: { branchId: id },
      data: { branchId: null }
    })

    return await prisma.branch.delete({
      where: { id }
    })
  },

  async setDefault(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id }
    })

    if (!branch) {
      throw new Error('分支不存在')
    }

    await prisma.branch.updateMany({
      where: { projectId: branch.projectId },
      data: { isDefault: false }
    })

    return await prisma.branch.update({
      where: { id },
      data: { isDefault: true, isActive: true }
    })
  },

  async switchBranch(projectId: string, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, projectId }
    })

    if (!branch) {
      throw new Error('分支不存在')
    }

    return await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: true }
    })
  },

  async getDefaultBranch(projectId: string) {
    let branch = await prisma.branch.findFirst({
      where: { projectId, isDefault: true }
    })

    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          projectId,
          name: 'main',
          description: '默认主分支',
          isDefault: true,
          isActive: true
        }
      })
    }

    return branch
  }
}