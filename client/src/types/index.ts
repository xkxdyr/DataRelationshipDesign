export interface Column {
  id: string
  tableId: string
  name: string
  dataType: string
  length?: number
  precision?: number
  scale?: number
  nullable: boolean
  defaultValue?: string
  autoIncrement: boolean
  primaryKey: boolean
  unique: boolean
  comment?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Index {
  id: string
  tableId: string
  name: string
  columns: string[]
  unique: boolean
  type: string
}

export interface Table {
  id: string
  projectId: string
  name: string
  comment?: string
  positionX: number
  positionY: number
  width?: string
  columns: Column[]
  indexes: Index[]
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  projectId: string
  name?: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  relationshipType: string
  sourceCardinality: '1' | 'N' | '*'
  targetCardinality: '1' | 'N' | '*'
  onUpdate: string
  onDelete: string
  createdAt: string
}

export interface Version {
  id: string
  projectId: string
  version: number
  name: string
  comment?: string
  data: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  databaseType: string
  status: string
  version: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type TabType = 'project' | 'sql' | 'table' | 'settings'

export interface Tab {
  id: string
  type: TabType
  title: string
  projectId?: string
  tableId?: string
  sqlContent?: string
  closable: boolean
  unsaved?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  result?: T
  data?: T
  error?: string
  message?: string
}
