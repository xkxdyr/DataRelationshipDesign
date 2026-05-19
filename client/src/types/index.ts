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
  collaborationEnabled?: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ApiResponse<T> {
  success: boolean
  result?: T
  data?: T
  error?: string
  message?: string
}

export interface ModelConfig {
  id: string
  name: string
  provider: string
  model: string
  apiKey: string
  endpoint?: string
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  username: string
  email: string
  displayName?: string
  avatar?: string
  color?: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  displayName?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface TeamMember {
  userId: string
  userName: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
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

export interface Comment {
  id: string
  projectId: string
  tableId: string
  userId: string
  userName: string
  userDisplayName?: string
  userColor?: string
  content: string
  parentId?: string
  status: 'open' | 'resolved'
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}
