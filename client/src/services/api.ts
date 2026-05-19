import { Project, Table, Column, Relationship, Index, Version, ApiResponse, User, AuthResponse, RegisterRequest, LoginRequest, Comment } from '../types'

// 动态获取当前主机地址，支持通过 IP 访问
const getApiBase = (): string => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = 3001 // 后端端口固定为 3001
  return `${protocol}//${hostname}:${port}/api`
}

const API_BASE = getApiBase()

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('authToken')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        ...headers,
        ...options?.headers
      },
      ...options
    })
    return await response.json()
  } catch (error) {
    return { success: false, message: 'Network error', data: undefined } as ApiResponse<T>
  }
}

export interface ProjectWithRole {
  projectId: string
  projectName: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: string
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
  generateDDL: (id: string, dbType?: string) => request<{ ddl: string; databaseType: string; tableCount: number; relationshipCount: number }>(`/projects/${id}/ddl${dbType ? `?type=${dbType}` : ''}`),
  getUserProjects: () => request<ProjectWithRole[]>('/users/projects')
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

export interface LLMConfigInfo {
  id: string
  name: string
  provider: string
  model: string
  endpoint: string
  hasApiKey: boolean
  isDefault: boolean
  isActive: boolean
  description?: string
  ownerType: 'user' | 'team'
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface LLMConfigCreate {
  name: string
  provider: string
  model: string
  endpoint: string
  apiKey: string
  description?: string
  isDefault?: boolean
}

export interface MockDataRequest {
  tableName: string
  columns: Array<{
    name: string
    dataType: string
    nullable: boolean
    primaryKey: boolean
    unique: boolean
    comment?: string
  }>
  rowCount: number
}

export interface MockDataResult {
  tableName: string
  columns: Array<{
    name: string
    dataType: string
    values: any[]
  }>
  rows: Record<string, any>[]
  sql: string
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

export interface ConnectionTestResult {
  success: boolean
  model?: string
  error?: string
  security?: {
    isHttps: boolean
    isLocalhost: boolean
    endpointSecure: boolean
    apiKeyMasked: string
    apiKeyStrength: 'none' | 'weak' | 'good' | 'strong'
    warnings: string[]
    score: 'safe' | 'warning' | 'unsafe'
    summary: string
  }
  availability?: {
    tested: boolean
    responseTimeMs: number
    modelConfirmed: boolean
    modelReported: string
    capable: boolean
    details: string
  }
}

export const llmApi = {
  configure: (apiKey: string, endpoint?: string, model?: string) =>
    request<{ configured: boolean }>('/llm/config', {
      method: 'POST',
      body: JSON.stringify({ apiKey, endpoint, model })
    }),
  getConfig: () =>
    request<LLMConfigResult>('/llm/config'),
  testConnection: (configId?: string, apiKey?: string, endpoint?: string, model?: string, provider?: string) =>
    request<ConnectionTestResult>('/llm/test-connection', {
      method: 'POST',
      body: JSON.stringify({ configId, apiKey, endpoint, model, provider })
    }),
  generateTables: (description: string, databaseType?: string, configId?: string) =>
    request<TableSuggestion[]>('/llm/generate-tables', {
      method: 'POST',
      body: JSON.stringify({ description, databaseType, configId })
    }),
  analyzeColumns: (tableName: string, columns: Array<{ name: string; description: string }>, databaseType?: string, configId?: string) =>
    request<ColumnSuggestion[]>('/llm/analyze-columns', {
      method: 'POST',
      body: JSON.stringify({ tableName, columns, databaseType, configId })
    }),
  suggestRelationships: (tables: any[], configId?: string) =>
    request<RelationshipSuggestion[]>('/llm/suggest-relationships', {
      method: 'POST',
      body: JSON.stringify({ tables, configId })
    }),
  getUserConfigs: (userId: string) =>
    request<LLMConfigInfo[]>(`/llm/configs/user/${userId}`),
  getTeamConfigs: (teamId: string) =>
    request<LLMConfigInfo[]>(`/llm/configs/team/${teamId}`),
  createUserConfig: (userId: string, config: LLMConfigCreate) =>
    request<{ id: string; name: string }>(`/llm/configs/user/${userId}`, {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  createTeamConfig: (teamId: string, config: LLMConfigCreate) =>
    request<{ id: string; name: string }>(`/llm/configs/team/${teamId}`, {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  updateConfig: (configId: string, data: Partial<LLMConfigCreate & { isDefault?: boolean; isActive?: boolean }>) =>
    request<{ id: string; name: string }>(`/llm/configs/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteConfig: (configId: string) =>
    request<void>(`/llm/configs/${configId}`, { method: 'DELETE' }),
  generateMockData: (mockRequest: MockDataRequest) =>
    request<MockDataResult>('/llm/mock-data', {
      method: 'POST',
      body: JSON.stringify(mockRequest)
    }),
  generateBatchMockData: (requests: MockDataRequest[]) =>
    request<MockDataResult[]>('/llm/mock-data/batch', {
      method: 'POST',
      body: JSON.stringify(requests)
    }),
  getMockTemplates: () =>
    request<Array<{ id: string; name: string; description: string }>>('/llm/mock-templates'),
  createSnapshot: (projectId: string, operation: string, description: string, data: any) =>
    request<{ id: string }>('/llm/snapshot', {
      method: 'POST',
      body: JSON.stringify({ projectId, operation, description, data })
    }),
  getLatestSnapshot: (projectId: string) =>
    request<{ id: string; data: string; createdAt: string }>(`/llm/snapshot/${projectId}/latest`),
  logOperation: (userId: string, projectId: string, operation: string, input?: string, output?: string, confirmed?: boolean, snapshotId?: string) =>
    request<{ id: string }>('/llm/log-operation', {
      method: 'POST',
      body: JSON.stringify({ userId, projectId, operation, input, output, confirmed, snapshotId })
    })
}

export interface ConnectionConfig {
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

export interface TestConnectionResult {
  success: boolean
  message: string
  responseTime?: number
}

export const connectionApi = {
  getAll: () => request<ConnectionConfig[]>('/connections'),
  getById: (id: string) => request<ConnectionConfig>(`/connections/${id}`),
  create: (data: Partial<ConnectionConfig>) => request<ConnectionConfig>('/connections', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<ConnectionConfig>) => request<ConnectionConfig>(`/connections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => request<void>(`/connections/${id}`, { method: 'DELETE' }),
  testConnection: (data: { databaseType: string; host: string; port: number; databaseName: string; username: string; password: string; sslEnabled?: boolean }) =>
    request<TestConnectionResult>('/connections/test', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

export interface ColumnInfo {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isNullable: boolean
  defaultValue: string | null
  comment: string
  autoIncrement: boolean
}

export interface TableInfo {
  name: string
  comment: string
  columns: ColumnInfo[]
  indexes: Array<{ name: string; columns: string[]; isUnique: boolean; isPrimary: boolean }>
  foreignKeys: Array<{ name: string; column: string; referencedTable: string; referencedColumn: string }>
}

export interface ReverseEngineeringResult {
  success: boolean
  message: string
  tables?: TableInfo[]
}

export const reverseEngineeringApi = {
  importFromDatabase: (data: { databaseType: string; host: string; port: number; databaseName: string; username: string; password: string; sslEnabled?: boolean; tables?: string[] }) =>
    request<ReverseEngineeringResult>('/reverse-engineering/import', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getTableList: (data: { databaseType: string; host: string; port: number; databaseName: string; username: string; password: string; sslEnabled?: boolean }) =>
    request<string[]>('/reverse-engineering/tables', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

export interface SyncConnection {
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled?: boolean
}

export interface TableSchema {
  name: string
  comment?: string
  columns: ColumnSchema[]
  indexes: IndexSchema[]
  foreignKeys: ForeignKeySchema[]
}

export interface ColumnSchema {
  name: string
  dataType: string
  nullable: boolean
  defaultValue?: string
  autoIncrement: boolean
  primaryKey: boolean
  unique: boolean
  comment?: string
}

export interface IndexSchema {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
}

export interface ForeignKeySchema {
  name: string
  column: string
  referencedTable: string
  referencedColumn: string
  onDelete?: string
  onUpdate?: string
}

export interface SyncResult {
  success: boolean
  message: string
  executedDDL?: string[]
  errors?: string[]
}

export interface DryRunResult {
  success: boolean
  ddl: string
  message: string
}

export const databaseSyncApi = {
  syncToDatabase: (connection: SyncConnection, tables: TableSchema[]) =>
    request<SyncResult>('/database-sync/sync', {
      method: 'POST',
      body: JSON.stringify({ connection, tables })
    }),
  dryRun: (connection: SyncConnection, tables: TableSchema[]) =>
    request<DryRunResult>('/database-sync/dry-run', {
      method: 'POST',
      body: JSON.stringify({ connection, tables })
    })
}

export interface Team {
  id: string
  name: string
  description?: string
  avatar?: string
  ownerId: string
  members: TeamMember[]
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  userId: string
  userName: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface CreateTeamRequest {
  name: string
  description?: string
  avatar?: string
  ownerId: string
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  avatar?: string
}

export interface AddMemberRequest {
  userId: string
  userName: string
  role?: 'admin' | 'member'
}

export interface UpdateMemberRoleRequest {
  role: 'admin' | 'member'
}

export const teamApi = {
  createTeam: (data: CreateTeamRequest) =>
    request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getAllTeams: () =>
    request<Team[]>('/teams', {
      method: 'GET'
    }),
  getTeamsByUserId: (userId: string) =>
    request<Team[]>(`/teams/user/${userId}`, {
      method: 'GET'
    }),
  getTeamById: (teamId: string) =>
    request<Team>(`/teams/${teamId}`, {
      method: 'GET'
    }),
  updateTeam: (teamId: string, data: UpdateTeamRequest) =>
    request<Team>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteTeam: (teamId: string) =>
    request<{ message: string }>(`/teams/${teamId}`, {
      method: 'DELETE'
    }),
  addMember: (teamId: string, data: AddMemberRequest) =>
    request<Team>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  removeMember: (teamId: string, userId: string) =>
    request<Team>(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE'
    }),
  updateMemberRole: (teamId: string, userId: string, data: UpdateMemberRoleRequest) =>
    request<Team>(`/teams/${teamId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  isMember: (teamId: string, userId: string) =>
    request<{ isMember: boolean }>(`/teams/${teamId}/members/${userId}/is-member`, {
      method: 'GET'
    }),
  isAdmin: (teamId: string, userId: string) =>
    request<{ isAdmin: boolean }>(`/teams/${teamId}/members/${userId}/is-admin`, {
      method: 'GET'
    }),
  addProjectToTeam: (teamId: string, projectId: string) =>
    request<void>(`/teams/${teamId}/projects/${projectId}`, {
      method: 'POST'
    }),
  removeProjectFromTeam: (teamId: string, projectId: string) =>
    request<void>(`/teams/${teamId}/projects/${projectId}`, {
      method: 'DELETE'
    }),
  getTeamProjects: (teamId: string) =>
    request<Project[]>(`/teams/${teamId}/projects`, {
      method: 'GET'
    })
}

export const userApi = {
  register: (data: RegisterRequest) =>
    request<AuthResponse>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  login: (data: LoginRequest) =>
    request<AuthResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getCurrentUser: (token: string) =>
    request<User>('/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }),
  getUserById: (userId: string) =>
    request<User>(`/users/${userId}`, {
      method: 'GET'
    }),
  getUserByUsername: (username: string) =>
    request<User>(`/users/username/${username}`, {
      method: 'GET'
    }),
  searchUsers: (query: string) =>
    request<User[]>(`/users/search?query=${encodeURIComponent(query)}`, {
      method: 'GET'
    })
}

export interface ServerLogEntry {
  id: string
  date: string
  type: 'feature' | 'bugfix' | 'security' | 'other'
  version: string
  description: string
  operator: string
}

export const updateLogApi = {
  getAll: () => request<ServerLogEntry[]>('/update-logs'),
  add: (data: { type: string; description: string; operator?: string }) =>
    request<{ message: string }>('/update-logs', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

export const commentApi = {
  getByTableId: (tableId: string) =>
    request<Comment[]>(`/tables/${tableId}/comments`),
  countByTableId: (tableId: string) =>
    request<{ count: number }>(`/tables/${tableId}/comments/count`),
  getById: (id: string) =>
    request<Comment>(`/comments/${id}`),
  create: (tableId: string, data: { projectId: string; content: string; parentId?: string }) =>
    request<Comment>(`/tables/${tableId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: string, data: { content?: string; status?: 'open' | 'resolved' }) =>
    request<Comment>(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: string) =>
    request<void>(`/comments/${id}`, { method: 'DELETE' })
}

export interface SqliteTableInfo {
  name: string
  columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean; defaultValue: string | null }>
  foreignKeys: Array<{ column: string; referencedTable: string; referencedColumn: string }>
  indexes: Array<{ name: string; columns: string[]; unique: boolean }>
}

export interface SqliteReadResult {
  success: boolean
  message: string
  tables?: SqliteTableInfo[]
}

export const sqliteApi = {
  readFromFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('authToken')
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const apiBase = (() => {
      const protocol = window.location.protocol
      const hostname = window.location.hostname
      return `${protocol}//${hostname}:3001/api`
    })()
    return fetch(`${apiBase}/sqlite/read`, {
      method: 'POST',
      headers,
      body: formData
    }).then(res => res.json())
  }
}

export interface IncrementalColumnDiff {
  type: 'ADD' | 'DROP' | 'MODIFY'
  columnName: string
  changes: string[]
}

export interface IncrementalIndexDiff {
  type: 'ADD' | 'DROP'
  indexName: string
}

export interface IncrementalTableResult {
  tableName: string
  columnDiffs: IncrementalColumnDiff[]
  indexDiffs: IncrementalIndexDiff[]
  statements: string[]
  summary: string
}

export interface IncrementalDDLResult {
  results: IncrementalTableResult[]
  ddl: string
  databaseType: string
  databaseTypeLabel: string
  tableCount: number
  totalChanges: number
}

export const incrementalDdlApi = {
  generateFromVersions: (versionId1: string, versionId2: string, dbType?: string) =>
    request<IncrementalDDLResult>(`/ddl/incremental/versions/${versionId1}/${versionId2}${dbType ? `?type=${dbType}` : ''}`, { method: 'POST' }),
  
  generateFromProjectVersion: (projectId: string, versionId: string, dbType?: string) =>
    request<IncrementalDDLResult>(`/ddl/incremental/projects/${projectId}/vs-version/${versionId}${dbType ? `?type=${dbType}` : ''}`),
  
  generateFromProjectVersions: (projectId: string, versionId1: string, versionId2: string, dbType?: string) =>
    request<IncrementalDDLResult>(`/ddl/incremental/projects/${projectId}/versions${dbType ? `?type=${dbType}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ versionId1, versionId2 })
    })
}

export interface BranchInfo {
  id: string
  projectId: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  parentId: string | null
  createdAt: string
  updatedAt: string
  _count?: { versions: number }
  parent?: { id: string; name: string }
  children?: { id: string; name: string }[]
}

export const branchApi = {
  getByProject: (projectId: string) =>
    request<BranchInfo[]>(`/projects/${projectId}/branches`),

  getDefault: (projectId: string) =>
    request<BranchInfo>(`/projects/${projectId}/branches/default`),

  getById: (id: string) =>
    request<BranchInfo>(`/branches/${id}`),

  create: (projectId: string, data: { name: string; description?: string; parentId?: string }) =>
    request<BranchInfo>(`/projects/${projectId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    request<BranchInfo>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  remove: (id: string) =>
    request<{ message: string }>(`/branches/${id}`, { method: 'DELETE' }),

  setDefault: (id: string) =>
    request<BranchInfo>(`/branches/${id}/set-default`, { method: 'POST' }),

  switchBranch: (id: string, projectId: string) =>
    request<BranchInfo>(`/branches/${id}/switch`, {
      method: 'POST',
      body: JSON.stringify({ projectId })
    })
}

export interface GitConfigInfo {
  id: string
  projectId: string
  enabled: boolean
  repositoryUrl: string | null
  branch: string
  username: string | null
  token: string | null
  sshKeyPath: string | null
  autoCommit: boolean
  autoPush: boolean
  commitMessageTemplate: string
  createdAt: string
  updatedAt: string
}

export const gitConfigApi = {
  get: (projectId: string) =>
    request<GitConfigInfo>(`/projects/${projectId}/git-config`),

  upsert: (projectId: string, data: Partial<GitConfigInfo>) =>
    request<GitConfigInfo>(`/projects/${projectId}/git-config`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  remove: (projectId: string) =>
    request<{ message: string }>(`/projects/${projectId}/git-config`, { method: 'DELETE' })
}


