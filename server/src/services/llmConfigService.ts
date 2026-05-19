import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const ENCRYPTION_KEY = process.env.LLM_ENCRYPTION_KEY || 'data-relationship-design-encryption-key-2026'
const IV_LENGTH = 16

export interface LLMConfigCreate {
  name: string
  provider: string
  model: string
  endpoint: string
  apiKey: string
  description?: string
  isDefault?: boolean
}

export interface LLMConfigUpdate {
  name?: string
  provider?: string
  model?: string
  endpoint?: string
  apiKey?: string
  description?: string
  isDefault?: boolean
  isActive?: boolean
}

export interface LLMConfigInfo {
  id: string
  name: string
  provider: string
  model: string
  endpoint: string
  hasApiKey: boolean
  isDefault: boolean
  isActive: boolean
  description?: string | null
  ownerType: 'user' | 'team'
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  
  return `${iv.toString('hex')}:${tag}:${encrypted}`
}

function decrypt(encrypted: string): string {
  const [ivHex, tagHex, encryptedText] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

export const llmConfigService = {
  async createUserConfig(
    userId: string,
    config: LLMConfigCreate
  ) {
    if (config.isDefault) {
      await prisma.lLMConfig.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      })
    }
    
    return prisma.lLMConfig.create({
      data: {
        name: config.name,
        provider: config.provider,
        model: config.model,
        endpoint: config.endpoint,
        apiKey: encrypt(config.apiKey),
        description: config.description,
        isDefault: config.isDefault || false,
        userId
      }
    })
  },

  async createTeamConfig(
    teamId: string,
    config: LLMConfigCreate
  ) {
    if (config.isDefault) {
      await prisma.lLMConfig.updateMany({
        where: { teamId, isDefault: true },
        data: { isDefault: false }
      })
    }
    
    return prisma.lLMConfig.create({
      data: {
        name: config.name,
        provider: config.provider,
        model: config.model,
        endpoint: config.endpoint,
        apiKey: encrypt(config.apiKey),
        description: config.description,
        isDefault: config.isDefault || false,
        teamId
      }
    })
  },

  async updateConfig(
    configId: string,
    config: LLMConfigUpdate
  ) {
    const existing = await prisma.lLMConfig.findUnique({
      where: { id: configId }
    })
    
    if (!existing) {
      throw new Error('配置不存在')
    }
    
    if (config.isDefault) {
      if (existing.userId) {
        await prisma.lLMConfig.updateMany({
          where: { userId: existing.userId, isDefault: true },
          data: { isDefault: false }
        })
      } else if (existing.teamId) {
        await prisma.lLMConfig.updateMany({
          where: { teamId: existing.teamId, isDefault: true },
          data: { isDefault: false }
        })
      }
    }
    
    const updateData: any = { ...config }
    if (config.apiKey) {
      updateData.apiKey = encrypt(config.apiKey)
    }
    
    return prisma.lLMConfig.update({
      where: { id: configId },
      data: updateData
    })
  },

  async deleteConfig(configId: string) {
    return prisma.lLMConfig.delete({
      where: { id: configId }
    })
  },

  async getUserConfigs(userId: string): Promise<LLMConfigInfo[]> {
    const configs = await prisma.lLMConfig.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    })
    
    return configs.map(c => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      model: c.model,
      endpoint: c.endpoint,
      hasApiKey: !!c.apiKey,
      isDefault: c.isDefault,
      isActive: c.isActive,
      description: c.description,
      ownerType: 'user' as const,
      ownerId: c.userId!,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }))
  },

  async getTeamConfigs(teamId: string): Promise<LLMConfigInfo[]> {
    const configs = await prisma.lLMConfig.findMany({
      where: { teamId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    })
    
    return configs.map(c => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      model: c.model,
      endpoint: c.endpoint,
      hasApiKey: !!c.apiKey,
      isDefault: c.isDefault,
      isActive: c.isActive,
      description: c.description,
      ownerType: 'team' as const,
      ownerId: c.teamId!,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }))
  },

  async getConfigById(configId: string) {
    return prisma.lLMConfig.findUnique({
      where: { id: configId }
    })
  },

  async getDecryptedConfig(configId: string) {
    const config = await prisma.lLMConfig.findUnique({
      where: { id: configId }
    })
    
    if (!config) return null
    
    return {
      ...config,
      apiKey: decrypt(config.apiKey)
    }
  },

  async getDefaultUserConfig(userId: string) {
    let config = await prisma.lLMConfig.findFirst({
      where: { userId, isDefault: true, isActive: true }
    })
    
    if (!config) {
      config = await prisma.lLMConfig.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    if (!config) return null
    
    return {
      ...config,
      apiKey: decrypt(config.apiKey)
    }
  },

  async getDefaultTeamConfig(teamId: string) {
    let config = await prisma.lLMConfig.findFirst({
      where: { teamId, isDefault: true, isActive: true }
    })
    
    if (!config) {
      config = await prisma.lLMConfig.findFirst({
        where: { teamId, isActive: true },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    if (!config) return null
    
    return {
      ...config,
      apiKey: decrypt(config.apiKey)
    }
  },

  async createSnapshot(projectId: string, operation: string, description: string, data: any) {
    return prisma.lLMSnapshot.create({
      data: {
        projectId,
        operation,
        description,
        data: JSON.stringify(data)
      }
    })
  },

  async getLatestSnapshot(projectId: string) {
    return prisma.lLMSnapshot.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  },

  async logOperation(
    userId: string,
    projectId: string,
    operation: string,
    input?: string,
    output?: string,
    confirmed: boolean = false,
    snapshotId?: string
  ) {
    return prisma.lLMOperationLog.create({
      data: {
        userId,
        projectId,
        operation,
        input,
        output,
        confirmed,
        snapshotId
      }
    })
  }
}
