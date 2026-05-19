import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface GitConfigDTO {
  enabled?: boolean
  repositoryUrl?: string
  branch?: string
  username?: string
  token?: string
  sshKeyPath?: string
  autoCommit?: boolean
  autoPush?: boolean
  commitMessageTemplate?: string
}

export const gitConfigService = {
  async get(projectId: string) {
    return await prisma.gitConfig.findUnique({
      where: { projectId }
    })
  },

  async upsert(projectId: string, data: GitConfigDTO) {
    const existing = await prisma.gitConfig.findUnique({
      where: { projectId }
    })

    if (existing) {
      return await prisma.gitConfig.update({
        where: { projectId },
        data
      })
    }

    return await prisma.gitConfig.create({
      data: {
        projectId,
        enabled: data.enabled ?? false,
        repositoryUrl: data.repositoryUrl ?? null,
        branch: data.branch ?? 'main',
        username: data.username ?? null,
        token: data.token ?? null,
        sshKeyPath: data.sshKeyPath ?? null,
        autoCommit: data.autoCommit ?? false,
        autoPush: data.autoPush ?? false,
        commitMessageTemplate: data.commitMessageTemplate ?? 'Update: {{version}}'
      }
    })
  },

  async remove(projectId: string) {
    await prisma.gitConfig.delete({
      where: { projectId }
    })
    return { message: 'Git 配置已删除' }
  }
}