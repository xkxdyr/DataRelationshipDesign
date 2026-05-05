import { Project, Table, Column, Relationship, Index, Version, ApiResponse } from '../types'

// 动态获取当前主机地址，支持通过 IP 访问
const getApiBase = (): string => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = 3001 // 后端端口固定为 3001
  return `${protocol}//${hostname}:${port}/api`
}

const API_BASE = getApiBase()

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  })
  return await response.json()
}

export const ddlApi = {
  getDatabaseTypes: () => request<Array<{ value: string; label: string }>>('/ddl/databases')
}

export const projectApi = {
  getAll: () => request<Project[]>('/projects'),
  getById: (id: string) => request<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => request<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Project>) => request<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) => request<Project>(`/projects/${id}/duplicate`, { method: 'POST' }),
  generateDDL: (id: string, dbType?: string) => request<{ ddl: string; databaseType: string; tableCount: number; relationshipCount: number }>(`/projects/${id}/ddl${dbType ? `?type=${dbType}` : ''}`)
}

export const tableApi = {
  getAll: (projectId: string) => request<Table[]>(`/projects/${projectId}/tables`),
  getById: (id: string) => request<Table>(`/tables/${id}`),
  create: (projectId: string, data: Partial<Table>) => request<Table>(`/projects/${projectId}/tables`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Table>) => request<Table>(`/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updatePosition: (id: string, positionX: number, positionY: number) => request<Table>(`/tables/${id}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ positionX, positionY })
  }),
  delete: (id: string) => request<void>(`/tables/${id}`, { method: 'DELETE' }),
  deleteAll: (projectId: string) => request<void>(`/projects/${projectId}/tables`, { method: 'DELETE' }),
  generateDDL: (id: string, dbType?: string) => request<{ ddl: string; tableName: string; databaseType?: string }>(`/tables/${id}/ddl${dbType ? `?type=${dbType}` : ''}`)
}

export const columnApi = {
  getAll: (tableId: string) => request<Column[]>(`/tables/${tableId}/columns`),
  getById: (id: string) => request<Column>(`/columns/${id}`),
  create: (tableId: string, data: Partial<Column>) => request<Column>(`/tables/${tableId}/columns`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Column>) => request<Column>(`/columns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/columns/${id}`, { method: 'DELETE' }),
  bulkCreate: (tableId: string, columns: Partial<Column>[]) => request<Column[]>(`/tables/${tableId}/columns/bulk`, {
    method: 'POST',
    body: JSON.stringify({ columns })
  }),
  updateOrder: (tableId: string, columnOrders: { id: string; order: number }[]) => request<Column[]>(`/tables/${tableId}/columns/order`, {
    method: 'PATCH',
    body: JSON.stringify({ columnOrders })
  })
}

export const relationshipApi = {
  getAll: (projectId: string) => request<Relationship[]>(`/projects/${projectId}/relationships`),
  getById: (id: string) => request<Relationship>(`/relationships/${id}`),
  create: (projectId: string, data: Partial<Relationship>) => request<Relationship>(`/projects/${projectId}/relationships`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Relationship>) => request<Relationship>(`/relationships/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/relationships/${id}`, { method: 'DELETE' }),
  deleteAll: (projectId: string) => request<void>(`/projects/${projectId}/relationships`, { method: 'DELETE' })
}

export const indexApi = {
  getAll: (tableId: string) => request<Index[]>(`/tables/${tableId}/indexes`),
  getById: (id: string) => request<Index>(`/indexes/${id}`),
  create: (tableId: string, data: Partial<Index>) => request<Index>(`/tables/${tableId}/indexes`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Index>) => request<Index>(`/indexes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/indexes/${id}`, { method: 'DELETE' })
}

export const versionApi = {
  getAll: (projectId: string) => request<Version[]>(`/projects/${projectId}/versions`),
  getById: (id: string) => request<Version>(`/versions/${id}`),
  create: (projectId: string, data: Partial<Version>) => request<Version>(`/projects/${projectId}/versions`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<Version>) => request<Version>(`/versions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/versions/${id}`, { method: 'DELETE' })
}

export interface TypeConvertResult {
  sourceType: string
  targetType: string
  sourceDb: string
  targetDb: string
}

export interface TableTypeConvertResult {
  tableName: string
  sourceDb: string
  targetDb: string
  originalColumns: any[]
  convertedColumns: any[]
}

export interface TypeMapping {
  source: string
  target: string
}

export interface LLMConfigResult {
  configured: boolean
  hasApiKey: boolean
  endpoint: string
  model: string
}

export interface TableSuggestion {
  tableName: string
  tableComment?: string
  columns: ColumnSuggestion[]
}

export interface ColumnSuggestion {
  name: string
  dataType: string
  length?: number
  precision?: number
  scale?: number
  nullable: boolean
  defaultValue?: string
  primaryKey: boolean
  unique: boolean
  comment?: string
}

export interface RelationshipSuggestion {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  relationshipType: string
  reason: string
}

export const typeConvertApi = {
  convert: (dataType: string, sourceDb: string, targetDb: string) =>
    request<TypeConvertResult>('/type-convert/convert', {
      method: 'POST',
      body: JSON.stringify({ dataType, sourceDb, targetDb })
    }),
  convertTable: (table: any, sourceDb: string, targetDb: string) =>
    request<TableTypeConvertResult>('/type-convert/table', {
      method: 'POST',
      body: JSON.stringify({ table, sourceDb, targetDb })
    }),
  getMappings: (sourceDb: string, targetDb: string) =>
    request<{ sourceDb: string; targetDb: string; mappings: TypeMapping[] }>(`/type-convert/mappings?sourceDb=${sourceDb}&targetDb=${targetDb}`),
  getDatabaseTypes: () =>
    request<Array<{ value: string; label: string }>>('/type-convert/database-types')
}

export const llmApi = {
  configure: (apiKey: string, endpoint?: string, model?: string) =>
    request<{ configured: boolean }>('/llm/config', {
      method: 'POST',
      body: JSON.stringify({ apiKey, endpoint, model })
    }),
  getConfig: () =>
    request<LLMConfigResult>('/llm/config'),
  generateTables: (description: string, databaseType?: string) =>
    request<TableSuggestion[]>('/llm/generate-tables', {
      method: 'POST',
      body: JSON.stringify({ description, databaseType })
    }),
  analyzeColumns: (tableName: string, columns: Array<{ name: string; description: string }>, databaseType?: string) =>
    request<ColumnSuggestion[]>('/llm/analyze-columns', {
      method: 'POST',
      body: JSON.stringify({ tableName, columns, databaseType })
    }),
  suggestRelationships: (tables: any[]) =>
    request<RelationshipSuggestion[]>('/llm/suggest-relationships', {
      method: 'POST',
      body: JSON.stringify({ tables })
    })
}
