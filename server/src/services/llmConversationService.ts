import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const llmConversationService = {
  async saveMessage(userId: string, projectId: string | null, role: string, content: string, configId?: string) {
    return prisma.lLMConversation.create({
      data: {
        userId,
        projectId,
        role,
        content,
        configId
      }
    })
  },

  async getConversationHistory(userId: string, projectId?: string, limit: number = 20) {
    const where: any = { userId }
    if (projectId) {
      where.projectId = projectId
    }
    return prisma.lLMConversation.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit
    })
  },

  async clearHistory(userId: string, projectId?: string) {
    const where: any = { userId }
    if (projectId) {
      where.projectId = projectId
    }
    return prisma.lLMConversation.deleteMany({ where })
  }
}
