import fs from 'fs'
import path from 'path'

export interface ModelConfig {
  id: string
  name: string
  provider: string
  model: string
  apiKey: string
  endpoint?: string
  isDefault: boolean
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateModelDTO {
  name: string
  provider: string
  model: string
  apiKey: string
  endpoint?: string
  isDefault?: boolean
  description?: string
}

export interface UpdateModelDTO {
  name?: string
  provider?: string
  model?: string
  apiKey?: string
  endpoint?: string
  isDefault?: boolean
  description?: string
}

const STORAGE_FILE = path.join(__dirname, '../../data/models.json')

function ensureStorage(): void {
  const dir = path.dirname(STORAGE_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2))
  }
}

function readModels(): ModelConfig[] {
  ensureStorage()
  const content = fs.readFileSync(STORAGE_FILE, 'utf-8')
  return JSON.parse(content)
}

function writeModels(models: ModelConfig[]): void {
  ensureStorage()
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(models, null, 2), 'utf-8')
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const modelService = {
  async findAll(): Promise<ModelConfig[]> {
    return readModels()
  },

  async findById(id: string): Promise<ModelConfig | undefined> {
    const models = readModels()
    return models.find(m => m.id === id)
  },

  async findDefault(): Promise<ModelConfig | undefined> {
    const models = readModels()
    return models.find(m => m.isDefault)
  },

  async create(data: CreateModelDTO): Promise<ModelConfig> {
    const models = readModels()
    const now = new Date()
    
    // 如果是第一个模型，设为默认
    const isDefault = data.isDefault !== undefined ? data.isDefault : models.length === 0
    
    // 如果设为默认，取消其他的默认
    if (isDefault) {
      models.forEach(m => m.isDefault = false)
    }

    const newModel: ModelConfig = {
      id: generateId(),
      name: data.name,
      provider: data.provider,
      model: data.model,
      apiKey: data.apiKey,
      endpoint: data.endpoint,
      isDefault: isDefault,
      description: data.description,
      createdAt: now,
      updatedAt: now
    }
    models.push(newModel)
    writeModels(models)
    return newModel
  },

  async update(id: string, data: UpdateModelDTO): Promise<ModelConfig | undefined> {
    const models = readModels()
    const index = models.findIndex(m => m.id === id)
    if (index === -1) {
      return undefined
    }

    // 如果设为默认，取消其他的默认
    if (data.isDefault === true) {
      models.forEach(m => m.isDefault = false)
    }

    const updated: ModelConfig = {
      ...models[index],
      ...data,
      updatedAt: new Date()
    }
    models[index] = updated
    writeModels(models)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    const models = readModels()
    const index = models.findIndex(m => m.id === id)
    if (index === -1) {
      return false
    }
    models.splice(index, 1)
    writeModels(models)
    return true
  }
}

export default modelService