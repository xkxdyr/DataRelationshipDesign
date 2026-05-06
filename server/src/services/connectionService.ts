import fs from 'fs'
import path from 'path'

interface ConnectionConfig {
  id: string
  name: string
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled: boolean
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateConnectionDTO {
  name: string
  databaseType?: string
  host?: string
  port?: number
  databaseName: string
  username: string
  password: string
  sslEnabled?: boolean
  description?: string
}

export interface UpdateConnectionDTO {
  name?: string
  databaseType?: string
  host?: string
  port?: number
  databaseName?: string
  username?: string
  password?: string
  sslEnabled?: boolean
  description?: string
}

const STORAGE_FILE = path.join(__dirname, '../../data/connections.json')

function ensureStorage(): void {
  const dir = path.dirname(STORAGE_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([], null, 2))
  }
}

function readConnections(): ConnectionConfig[] {
  ensureStorage()
  const content = fs.readFileSync(STORAGE_FILE, 'utf-8')
  return JSON.parse(content)
}

function writeConnections(connections: ConnectionConfig[]): void {
  ensureStorage()
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(connections, null, 2), 'utf-8')
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const connectionService = {
  async findAll(): Promise<ConnectionConfig[]> {
    return readConnections()
  },

  async findById(id: string): Promise<ConnectionConfig | undefined> {
    const connections = readConnections()
    return connections.find(c => c.id === id)
  },

  async create(data: CreateConnectionDTO): Promise<ConnectionConfig> {
    const connections = readConnections()
    const now = new Date()
    const newConnection: ConnectionConfig = {
      id: generateId(),
      name: data.name,
      databaseType: data.databaseType || 'MYSQL',
      host: data.host || 'localhost',
      port: data.port || 3306,
      databaseName: data.databaseName,
      username: data.username,
      password: data.password,
      sslEnabled: data.sslEnabled || false,
      description: data.description,
      createdAt: now,
      updatedAt: now
    }
    connections.push(newConnection)
    writeConnections(connections)
    return newConnection
  },

  async update(id: string, data: UpdateConnectionDTO): Promise<ConnectionConfig | undefined> {
    const connections = readConnections()
    const index = connections.findIndex(c => c.id === id)
    if (index === -1) {
      return undefined
    }
    const updated: ConnectionConfig = {
      ...connections[index],
      ...data,
      updatedAt: new Date()
    }
    connections[index] = updated
    writeConnections(connections)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    const connections = readConnections()
    const filtered = connections.filter(c => c.id !== id)
    if (filtered.length === connections.length) {
      return false
    }
    writeConnections(filtered)
    return true
  }
}