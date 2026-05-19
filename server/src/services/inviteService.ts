import { PrismaClient } from '@prisma/client'
import { ProjectRole } from './projectMemberService'

const prisma = new PrismaClient()

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export interface CreateInviteDTO {
  projectId: string
  role: ProjectRole
  maxUses: number
  expiresInDays: number
  createdBy: string
}

export const inviteService = {
  async findProjectName(projectId: string) {
    return await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    })
  },

  async findByCode(code: string) {
    return await prisma.invite.findUnique({
      where: { code },
      include: {
        project: {
          select: { name: true }
        }
      }
    })
  },

  async findByCodeWithProject(code: string) {
    return await prisma.invite.findUnique({
      where: { code },
      include: { project: true }
    })
  },

  async generateUniqueCode(): Promise<string> {
    let code: string
    let exists = true
    let attempts = 0

    while (exists && attempts < 10) {
      code = generateInviteCode()
      const existing = await prisma.invite.findUnique({
        where: { code }
      })
      exists = !!existing
      attempts++
    }

    if (exists) {
      throw new Error('生成邀请码失败，请重试')
    }

    return code!
  },

  async create(data: CreateInviteDTO) {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + data.expiresInDays * 24 * 60 * 60 * 1000)

    return await prisma.invite.create({
      data: {
        code: await this.generateUniqueCode(),
        projectId: data.projectId,
        role: data.role,
        maxUses: Math.max(1, data.maxUses),
        usedCount: 0,
        createdBy: data.createdBy,
        createdAt: now,
        expiresAt,
        isActive: true
      }
    })
  },

  async findActiveByProject(projectId: string) {
    return await prisma.invite.findMany({
      where: {
        projectId,
        isActive: true
      },
      include: {
        project: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  },

  async findHistoryByProject(projectId: string) {
    return await prisma.invite.findMany({
      where: { projectId },
      include: {
        project: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  },

  async incrementUsage(inviteId: string, currentCount: number, maxUses: number) {
    const newUsedCount = currentCount + 1
    const isFullyUsed = newUsedCount >= maxUses

    return await prisma.invite.update({
      where: { id: inviteId },
      data: {
        usedCount: newUsedCount,
        isActive: !isFullyUsed
      }
    })
  },

  async revoke(code: string) {
    return await prisma.invite.update({
      where: { code },
      data: { isActive: false }
    })
  },

  async findByCodeForRevoke(code: string) {
    return await prisma.invite.findUnique({
      where: { code }
    })
  }
}