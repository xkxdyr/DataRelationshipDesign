import Dexie, { Table as DexieTable } from 'dexie'
import { Project, Table, Column, Relationship, Index, Version } from '../types'

export interface LocalProject extends Project {
  lastModified?: number
}

export interface LocalTable extends Omit<Table, 'columns' | 'indexes'> {
  columns?: Column[]
  indexes?: Index[]
  lastModified?: number
}

export interface LocalColumn extends Column {
  lastModified?: number
}

export interface LocalRelationship extends Relationship {
  lastModified?: number
}

export interface LocalIndex extends Index {
  lastModified?: number
}

export interface LocalVersion extends Version {
  lastModified?: number
}

export interface LocalConnection {
  id: string
  name: string
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  encryptedPassword: string
  sslEnabled: boolean
  description?: string
  createdAt: string
  updatedAt: string
  lastModified?: number
}

export interface SyncQueueItem {
  id?: number
  type: 'create' | 'update' | 'delete'
  entity: 'project' | 'table' | 'column' | 'relationship' | 'index' | 'version'
  entityId: string
  data?: any
  timestamp: number
}

const ENCRYPTION_KEY = 'DataVisualizationDesignTool_v1'

function generateKey(password: string, salt: string): string {
  let key = password
  for (let i = 0; i < 1000; i++) {
    key = btoa(key + salt)
  }
  return key
}

function encryptPassword(password: string): string {
  if (!password) return ''
  const salt = Date.now().toString(36)
  const key = generateKey(ENCRYPTION_KEY, salt)
  let encrypted = ''
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    encrypted += charCode.toString(16).padStart(2, '0')
  }
  return salt + ':' + encrypted
}

function decryptPassword(encrypted: string): string {
  if (!encrypted || !encrypted.includes(':')) return ''
  try {
    const [salt, data] = encrypted.split(':')
    const key = generateKey(ENCRYPTION_KEY, salt)
    let decrypted = ''
    for (let i = 0; i < data.length; i += 2) {
      const charCode = parseInt(data.substr(i, 2), 16) ^ key.charCodeAt(Math.floor(i / 2) % key.length)
      decrypted += String.fromCharCode(charCode)
    }
    return decrypted
  } catch {
    return ''
  }
}

class LocalDatabase extends Dexie {
  projects!: DexieTable<LocalProject, string>
  localTables!: DexieTable<LocalTable, string>
  columns!: DexieTable<LocalColumn, string>
  relationships!: DexieTable<LocalRelationship, string>
  indexes!: DexieTable<LocalIndex, string>
  versions!: DexieTable<LocalVersion, string>
  connections!: DexieTable<LocalConnection, string>
  syncQueue!: DexieTable<SyncQueueItem, number>
  meta!: DexieTable<{ key: string; value: any }, string>

  constructor() {
    super('DataRelationshipDesignDB')
    this.version(1).stores({
      projects: 'id, name, databaseType, createdAt, lastModified',
      localTables: 'id, projectId, name, positionX, positionY, lastModified',
      columns: 'id, tableId, name, lastModified',
      relationships: 'id, projectId, sourceTableId, targetTableId, lastModified',
      indexes: 'id, tableId, name, lastModified',
      versions: 'id, projectId, version, lastModified',
      syncQueue: '++id, entity, entityId, timestamp',
      meta: 'key'
    })
    this.version(2).stores({
      projects: 'id, name, databaseType, createdAt, lastModified',
      localTables: 'id, projectId, name, positionX, positionY, lastModified',
      columns: 'id, tableId, name, lastModified',
      relationships: 'id, projectId, sourceTableId, targetTableId, lastModified',
      indexes: 'id, tableId, name, lastModified',
      versions: 'id, projectId, version, lastModified',
      connections: 'id, name, databaseType, host, lastModified',
      syncQueue: '++id, entity, entityId, timestamp',
      meta: 'key'
    })
  }
}

export const localDb = new LocalDatabase()

export const localStorageService = {
  db: localDb,

  async saveProject(project: LocalProject): Promise<void> {
    await localDb.projects.put({
      ...project,
      lastModified: Date.now()
    })
  },

  async getProject(id: string): Promise<LocalProject | undefined> {
    return localDb.projects.get(id)
  },

  async getAllProjects(): Promise<LocalProject[]> {
    return localDb.projects.toArray()
  },

  async deleteProject(id: string): Promise<void> {
    await localDb.transaction('rw', [localDb.projects, localDb.localTables, localDb.columns, localDb.relationships, localDb.indexes, localDb.versions], async () => {
      await localDb.projects.delete(id)
      const tables = await localDb.localTables.where('projectId').equals(id).toArray()
      for (const table of tables) {
        await localDb.columns.where('tableId').equals(table.id).delete()
        await localDb.indexes.where('tableId').equals(table.id).delete()
      }
      await localDb.localTables.where('projectId').equals(id).delete()
      await localDb.relationships.where('projectId').equals(id).delete()
      await localDb.versions.where('projectId').equals(id).delete()
    })
  },

  async saveTable(table: LocalTable): Promise<void> {
    await localDb.localTables.put({
      ...table,
      lastModified: Date.now()
    })
  },

  async getTable(id: string): Promise<LocalTable | undefined> {
    return localDb.localTables.get(id)
  },

  async getTablesByProject(projectId: string): Promise<LocalTable[]> {
    return localDb.localTables.where('projectId').equals(projectId).toArray()
  },

  async deleteTable(id: string): Promise<void> {
    await localDb.transaction('rw', [localDb.localTables, localDb.columns, localDb.indexes], async () => {
      await localDb.columns.where('tableId').equals(id).delete()
      await localDb.indexes.where('tableId').equals(id).delete()
      await localDb.localTables.delete(id)
    })
  },

  async saveColumn(column: LocalColumn): Promise<void> {
    await localDb.columns.put({
      ...column,
      lastModified: Date.now()
    })
  },

  async getColumn(id: string): Promise<LocalColumn | undefined> {
    return localDb.columns.get(id)
  },

  async getColumnsByTable(tableId: string): Promise<LocalColumn[]> {
    return localDb.columns.where('tableId').equals(tableId).toArray()
  },

  async deleteColumn(id: string): Promise<void> {
    await localDb.columns.delete(id)
  },

  async saveRelationship(relationship: LocalRelationship): Promise<void> {
    await localDb.relationships.put({
      ...relationship,
      lastModified: Date.now()
    })
  },

  async getRelationship(id: string): Promise<LocalRelationship | undefined> {
    return localDb.relationships.get(id)
  },

  async getRelationshipsByProject(projectId: string): Promise<LocalRelationship[]> {
    return localDb.relationships.where('projectId').equals(projectId).toArray()
  },

  async deleteRelationship(id: string): Promise<void> {
    await localDb.relationships.delete(id)
  },

  async saveIndex(index: LocalIndex): Promise<void> {
    await localDb.indexes.put({
      ...index,
      lastModified: Date.now()
    })
  },

  async getIndexesByTable(tableId: string): Promise<LocalIndex[]> {
    return localDb.indexes.where('tableId').equals(tableId).toArray()
  },

  async deleteIndex(id: string): Promise<void> {
    await localDb.indexes.delete(id)
  },

  async saveVersion(version: LocalVersion): Promise<void> {
    await localDb.versions.put({
      ...version,
      lastModified: Date.now()
    })
  },

  async getVersionsByProject(projectId: string): Promise<LocalVersion[]> {
    return localDb.versions.where('projectId').equals(projectId).toArray()
  },

  async deleteVersion(id: string): Promise<void> {
    await localDb.versions.delete(id)
  },

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
    await localDb.syncQueue.add({
      ...item,
      timestamp: Date.now()
    })
  },

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return localDb.syncQueue.orderBy('timestamp').toArray()
  },

  async clearSyncQueue(): Promise<void> {
    await localDb.syncQueue.clear()
  },

  async removeSyncQueueItem(id: number): Promise<void> {
    await localDb.syncQueue.delete(id)
  },

  async setMeta(key: string, value: any): Promise<void> {
    await localDb.meta.put({ key, value })
  },

  async getMeta<T>(key: string): Promise<T | undefined> {
    const item = await localDb.meta.get(key)
    return item?.value as T | undefined
  },

  async clearAll(): Promise<void> {
    await localDb.transaction('rw', [localDb.projects, localDb.localTables, localDb.columns, localDb.relationships, localDb.indexes, localDb.versions, localDb.syncQueue, localDb.meta], async () => {
      await localDb.projects.clear()
      await localDb.localTables.clear()
      await localDb.columns.clear()
      await localDb.relationships.clear()
      await localDb.indexes.clear()
      await localDb.versions.clear()
      await localDb.syncQueue.clear()
      await localDb.meta.clear()
    })
  },

  async exportProjectData(projectId: string): Promise<{
    project: LocalProject | undefined
    tables: LocalTable[]
    columns: LocalColumn[]
    relationships: LocalRelationship[]
    indexes: LocalIndex[]
    versions: LocalVersion[]
  }> {
    const project = await this.getProject(projectId)
    const tables = await this.getTablesByProject(projectId)
    const columns: LocalColumn[] = []
    const indexes: LocalIndex[] = []

    for (const table of tables) {
      const tableColumns = await this.getColumnsByTable(table.id)
      columns.push(...tableColumns)
      const tableIndexes = await this.getIndexesByTable(table.id)
      indexes.push(...tableIndexes)
    }

    const relationships = await this.getRelationshipsByProject(projectId)
    const versions = await this.getVersionsByProject(projectId)

    return { project, tables, columns, relationships, indexes, versions }
  },

  async importProjectData(data: {
    project: LocalProject
    tables: LocalTable[]
    columns: LocalColumn[]
    relationships: LocalRelationship[]
    indexes: LocalIndex[]
    versions: LocalVersion[]
  }): Promise<void> {
    const { project, tables, columns, relationships, indexes, versions } = data

    await localDb.transaction('rw', [localDb.projects, localDb.localTables, localDb.columns, localDb.relationships, localDb.indexes, localDb.versions], async () => {
      await localDb.projects.put(project)
      await localDb.localTables.bulkPut(tables)
      await localDb.columns.bulkPut(columns)
      await localDb.relationships.bulkPut(relationships)
      await localDb.indexes.bulkPut(indexes)
      await localDb.versions.bulkPut(versions)
    })
  },

  async saveConnection(connection: Omit<LocalConnection, 'lastModified'>): Promise<void> {
    await localDb.connections.put({
      ...connection,
      lastModified: Date.now()
    })
  },

  async getConnection(id: string): Promise<LocalConnection | undefined> {
    return localDb.connections.get(id)
  },

  async getAllConnections(): Promise<LocalConnection[]> {
    return localDb.connections.toArray()
  },

  async getDecryptedConnection(id: string): Promise<{
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
    createdAt: string
    updatedAt: string
  } | undefined> {
    const connection = await localDb.connections.get(id)
    if (!connection) return undefined
    return {
      id: connection.id,
      name: connection.name,
      databaseType: connection.databaseType,
      host: connection.host,
      port: connection.port,
      databaseName: connection.databaseName,
      username: connection.username,
      sslEnabled: connection.sslEnabled,
      description: connection.description,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      password: decryptPassword(connection.encryptedPassword)
    }
  },

  async getDecryptedAllConnections(): Promise<Array<{
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
    createdAt: string
    updatedAt: string
  }>> {
    const connections = await localDb.connections.toArray()
    return connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      databaseType: conn.databaseType,
      host: conn.host,
      port: conn.port,
      databaseName: conn.databaseName,
      username: conn.username,
      sslEnabled: conn.sslEnabled,
      description: conn.description,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      password: decryptPassword(conn.encryptedPassword)
    }))
  },

  async deleteConnection(id: string): Promise<void> {
    await localDb.connections.delete(id)
  },

  encryptPassword,
  decryptPassword
}

export default localStorageService