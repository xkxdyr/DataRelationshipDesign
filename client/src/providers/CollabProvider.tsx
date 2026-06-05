import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import { collabManager, CollabState, UserInfo } from '../services/collabManager'
import { useAppStore } from '../stores/appStore'
import { Table, Column, Relationship, Index } from '../types'

export interface TableData {
  id: string
  name: string
  comment?: string
  positionX?: number
  positionY?: number
  projectId?: string
  createdAt?: string
  updatedAt?: string
}

export interface ColumnData {
  id: string
  tableId: string
  name: string
  type: string
  comment?: string
  isPrimaryKey?: boolean
  isUnique?: boolean
  isNotNull?: boolean
  isAutoIncrement?: boolean
  defaultValue?: string
  order?: number
  length?: number
  precision?: number
  scale?: number
}

export interface RelationshipData {
  id: string
  projectId?: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  relationshipType: string
  onUpdate?: string
  onDelete?: string
}

export interface IndexData {
  id: string
  tableId: string
  name: string
  columns: string[]
  isUnique?: boolean
  indexType?: string
}

interface CollabContextType {
  state: CollabState
  isConnected: boolean
  isReady: boolean
  isError: boolean
  onlineUsers: UserInfo[]
  tables: TableData[]
  columns: ColumnData[]
  relationships: RelationshipData[]
  indexes: IndexData[]
  startCollaboration: () => Promise<void>
  stopCollaboration: () => void
  createTable: (table: TableData) => void
  updateTable: (tableId: string, updates: Partial<TableData>) => void
  deleteTable: (tableId: string) => void
  createColumn: (column: ColumnData) => void
  updateColumn: (columnId: string, updates: Partial<ColumnData>) => void
  deleteColumn: (columnId: string) => void
  createRelationship: (relationship: RelationshipData) => void
  updateRelationship: (relationshipId: string, updates: Partial<RelationshipData>) => void
  deleteRelationship: (relationshipId: string) => void
  createIndex: (index: IndexData) => void
  updateIndex: (indexId: string, updates: Partial<IndexData>) => void
  deleteIndex: (indexId: string) => void
}

const CollabContext = createContext<CollabContextType | undefined>(undefined)

interface CollabProviderProps {
  children: ReactNode
}

function extractTables(doc: Y.Doc): TableData[] {
  const root = doc.getMap('root')
  const tablesMap = root.get('tables') as Y.Map<Y.Map<any>>
  if (!tablesMap) return []
  
  const tables: TableData[] = []
  tablesMap.forEach((tableMap) => {
    const table: TableData = {
      id: tableMap.get('id') as string,
      name: tableMap.get('name') as string,
      comment: tableMap.get('comment') as string,
      positionX: tableMap.get('positionX') as number,
      positionY: tableMap.get('positionY') as number,
      projectId: tableMap.get('projectId') as string,
      createdAt: tableMap.get('createdAt') as string,
      updatedAt: tableMap.get('updatedAt') as string,
    }
    tables.push(table)
  })
  return tables
}

function extractColumns(doc: Y.Doc): ColumnData[] {
  const root = doc.getMap('root')
  const columnsMap = root.get('columns') as Y.Map<Y.Map<any>>
  if (!columnsMap) return []
  
  const columns: ColumnData[] = []
  columnsMap.forEach((columnMap) => {
    const column: ColumnData = {
      id: columnMap.get('id') as string,
      tableId: columnMap.get('tableId') as string,
      name: columnMap.get('name') as string,
      type: columnMap.get('type') as string,
      comment: columnMap.get('comment') as string,
      isPrimaryKey: columnMap.get('isPrimaryKey') as boolean,
      isUnique: columnMap.get('isUnique') as boolean,
      isNotNull: columnMap.get('isNotNull') as boolean,
      isAutoIncrement: columnMap.get('isAutoIncrement') as boolean,
      defaultValue: columnMap.get('defaultValue') as string,
      order: columnMap.get('order') as number,
      length: columnMap.get('length') as number,
      precision: columnMap.get('precision') as number,
      scale: columnMap.get('scale') as number,
    }
    columns.push(column)
  })
  return columns
}

function extractRelationships(doc: Y.Doc): RelationshipData[] {
  const root = doc.getMap('root')
  const relsMap = root.get('relationships') as Y.Map<Y.Map<any>>
  if (!relsMap) return []
  
  const rels: RelationshipData[] = []
  relsMap.forEach((relMap) => {
    const rel: RelationshipData = {
      id: relMap.get('id') as string,
      projectId: relMap.get('projectId') as string,
      sourceTableId: relMap.get('sourceTableId') as string,
      sourceColumnId: relMap.get('sourceColumnId') as string,
      targetTableId: relMap.get('targetTableId') as string,
      targetColumnId: relMap.get('targetColumnId') as string,
      relationshipType: relMap.get('relationshipType') as string,
      onUpdate: relMap.get('onUpdate') as string,
      onDelete: relMap.get('onDelete') as string,
    }
    rels.push(rel)
  })
  return rels
}

function extractIndexes(doc: Y.Doc): IndexData[] {
  const root = doc.getMap('root')
  const indexesMap = root.get('indexes') as Y.Map<Y.Map<any>>
  if (!indexesMap) return []
  
  const indexes: IndexData[] = []
  indexesMap.forEach((indexMap) => {
    const index: IndexData = {
      id: indexMap.get('id') as string,
      tableId: indexMap.get('tableId') as string,
      name: indexMap.get('name') as string,
      columns: indexMap.get('columns') as string[] || [],
      isUnique: indexMap.get('isUnique') as boolean,
      indexType: indexMap.get('indexType') as string,
    }
    indexes.push(index)
  })
  return indexes
}

export function CollabProvider({ children }: CollabProviderProps) {
  const [state, setState] = useState<CollabState>(CollabState.IDLE)
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([])
  const [tables, setTables] = useState<TableData[]>([])
  const [columns, setColumns] = useState<ColumnData[]>([])
  const [relationships, setRelationships] = useState<RelationshipData[]>([])
  const [indexes, setIndexes] = useState<IndexData[]>([])
  
  const { currentProject, currentUser, authToken } = useAppStore()
  const isInitializedRef = useRef(false)
  const lastProjectIdRef = useRef<string | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateFromDocData = useCallback(() => {
    const doc = collabManager.getDoc()
    if (!doc) return
    
    const crdtTables = extractTables(doc)
    const crdtColumns = extractColumns(doc)
    const crdtRelationships = extractRelationships(doc)
    const crdtIndexes = extractIndexes(doc)
    
    setTables(crdtTables)
    setColumns(crdtColumns)
    setRelationships(crdtRelationships)
    setIndexes(crdtIndexes)

    // 防抖同步 CRDT 数据到 appStore，避免快速连续更新导致频繁重绘
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
    }
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null
      const latestDoc = collabManager.getDoc()
      if (!latestDoc) return
      
      const store = useAppStore.getState()
      if (!store.currentProject?.collaborationEnabled) return

      const now = new Date().toISOString()
      const latestTables = extractTables(latestDoc)
      const latestColumns = extractColumns(latestDoc)
      const latestRelationships = extractRelationships(latestDoc)
      const latestIndexes = extractIndexes(latestDoc)

      const appTables: Table[] = latestTables.map(t => ({
        id: t.id,
        projectId: t.projectId || store.currentProject!.id,
        name: t.name,
        comment: t.comment,
        positionX: t.positionX || 0,
        positionY: t.positionY || 0,
        columns: latestColumns
          .filter(c => c.tableId === t.id)
          .map(c => ({
            id: c.id,
            tableId: c.tableId,
            name: c.name,
            dataType: c.type,
            length: c.length,
            precision: c.precision,
            scale: c.scale,
            nullable: !c.isNotNull,
            defaultValue: c.defaultValue,
            autoIncrement: c.isAutoIncrement || false,
            primaryKey: c.isPrimaryKey || false,
            unique: c.isUnique || false,
            comment: c.comment,
            order: c.order || 0,
            createdAt: now,
            updatedAt: now,
          } as Column)),
        indexes: latestIndexes
          .filter(i => i.tableId === t.id)
          .map(i => ({
            id: i.id,
            tableId: i.tableId,
            name: i.name,
            columns: i.columns,
            unique: i.isUnique || false,
            type: i.indexType || 'BTREE',
          } as Index)),
        createdAt: t.createdAt || now,
        updatedAt: t.updatedAt || now,
      }))

      const appRelationships: Relationship[] = latestRelationships.map(r => ({
        id: r.id,
        projectId: r.projectId || store.currentProject!.id,
        sourceTableId: r.sourceTableId,
        sourceColumnId: r.sourceColumnId,
        targetTableId: r.targetTableId,
        targetColumnId: r.targetColumnId,
        relationshipType: r.relationshipType,
        onUpdate: r.onUpdate || 'NO ACTION',
        onDelete: r.onDelete || 'NO ACTION',
        createdAt: now,
      }))

      useAppStore.setState({
        tables: appTables,
        relationships: appRelationships,
      })
    }, 100)
  }, [])

  useEffect(() => {
    const unsubscribeState = collabManager.onStateChange((newState) => {
      setState(newState)
    })
    
    const unsubscribeUsers = collabManager.onUserListChange((users) => {
      setOnlineUsers(users)
    })
    
    const unsubscribeCRDT = collabManager.onCRDTUpdate(() => {
      updateFromDocData()
    })
    
    return () => {
      unsubscribeState()
      unsubscribeUsers()
      unsubscribeCRDT()
      // 清理防抖定时器
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }
    }
  }, [updateFromDocData])

  useEffect(() => {
    if (!currentProject) {
      if (lastProjectIdRef.current !== null) {
        collabManager.stop()
        lastProjectIdRef.current = null
        isInitializedRef.current = false
        setTables([])
        setColumns([])
        setRelationships([])
        setIndexes([])
        setOnlineUsers([])
      }
      return
    }
    
    if (lastProjectIdRef.current === currentProject.id) {
      return
    }
    
    const isLocalProject = currentProject.id.startsWith('local_') || currentProject.createdBy === 'local'
    if (isLocalProject || !currentProject.collaborationEnabled) {
      if (lastProjectIdRef.current !== null) {
        collabManager.stop()
        lastProjectIdRef.current = null
        isInitializedRef.current = false
      }
      return
    }

    isInitializedRef.current = false
    startCollaboration()
  }, [currentProject?.id, currentProject?.collaborationEnabled])

  const startCollaboration = useCallback(async () => {
    if (!currentProject) {
      console.warn('[CollabProvider] 没有当前项目')
      return
    }
    
    const isLocalProject = currentProject.id.startsWith('local_') || currentProject.createdBy === 'local'
    if (isLocalProject) {
      return
    }
    
    if (!currentProject.collaborationEnabled) {
      return
    }
    
    lastProjectIdRef.current = currentProject.id
    
    if (isInitializedRef.current) {
      return
    }
    
    const userName = currentUser?.displayName || currentUser?.username || '用户'
    
    try {
      await collabManager.start(currentProject.id, userName, authToken || undefined)
      isInitializedRef.current = true
      updateFromDocData()
    } catch (error) {
      console.error('[CollabProvider] 启动协作失败:', error)
      isInitializedRef.current = false
    }
  }, [currentProject, currentUser, updateFromDocData])

  const stopCollaboration = useCallback(() => {
    collabManager.stop()
    lastProjectIdRef.current = null
    isInitializedRef.current = false
    setTables([])
    setColumns([])
    setRelationships([])
    setIndexes([])
    setOnlineUsers([])
  }, [])

  const getOrCreateMap = (doc: Y.Doc, mapName: string): Y.Map<Y.Map<any>> => {
    const root = doc.getMap('root')
    let map = root.get(mapName) as Y.Map<Y.Map<any>>
    if (!map) {
      map = new Y.Map()
      root.set(mapName, map)
    }
    return map
  }

  const createTable = useCallback((table: TableData) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const tablesMap = getOrCreateMap(doc, 'tables')
    const tableMap = new Y.Map()
    Object.entries(table).forEach(([key, value]) => {
      if (value !== undefined) {
        tableMap.set(key, value)
      }
    })
    tablesMap.set(table.id, tableMap)
  }, [])

  const updateTable = useCallback((tableId: string, updates: Partial<TableData>) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const tablesMap = getOrCreateMap(doc, 'tables')
    const tableMap = tablesMap.get(tableId)
    if (tableMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          tableMap.set(key, value)
        }
      })
    }
  }, [])

  const deleteTable = useCallback((tableId: string) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const tablesMap = getOrCreateMap(doc, 'tables')
    tablesMap.delete(tableId)
  }, [])

  const createColumn = useCallback((column: ColumnData) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const columnsMap = getOrCreateMap(doc, 'columns')
    const columnMap = new Y.Map()
    Object.entries(column).forEach(([key, value]) => {
      if (value !== undefined) {
        columnMap.set(key, value)
      }
    })
    columnsMap.set(column.id, columnMap)
  }, [])

  const updateColumn = useCallback((columnId: string, updates: Partial<ColumnData>) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const columnsMap = getOrCreateMap(doc, 'columns')
    const columnMap = columnsMap.get(columnId)
    if (columnMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          columnMap.set(key, value)
        }
      })
    }
  }, [])

  const deleteColumn = useCallback((columnId: string) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const columnsMap = getOrCreateMap(doc, 'columns')
    columnsMap.delete(columnId)
  }, [])

  const createRelationship = useCallback((relationship: RelationshipData) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const relsMap = getOrCreateMap(doc, 'relationships')
    const relMap = new Y.Map()
    Object.entries(relationship).forEach(([key, value]) => {
      if (value !== undefined) {
        relMap.set(key, value)
      }
    })
    relsMap.set(relationship.id, relMap)
  }, [])

  const updateRelationship = useCallback((relationshipId: string, updates: Partial<RelationshipData>) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const relsMap = getOrCreateMap(doc, 'relationships')
    const relMap = relsMap.get(relationshipId)
    if (relMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          relMap.set(key, value)
        }
      })
    }
  }, [])

  const deleteRelationship = useCallback((relationshipId: string) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const relsMap = getOrCreateMap(doc, 'relationships')
    relsMap.delete(relationshipId)
  }, [])

  const createIndex = useCallback((index: IndexData) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const indexesMap = getOrCreateMap(doc, 'indexes')
    const indexMap = new Y.Map()
    Object.entries(index).forEach(([key, value]) => {
      if (value !== undefined) {
        indexMap.set(key, value)
      }
    })
    indexesMap.set(index.id, indexMap)
  }, [])

  const updateIndex = useCallback((indexId: string, updates: Partial<IndexData>) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const indexesMap = getOrCreateMap(doc, 'indexes')
    const indexMap = indexesMap.get(indexId)
    if (indexMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          indexMap.set(key, value)
        }
      })
    }
  }, [])

  const deleteIndex = useCallback((indexId: string) => {
    const doc = collabManager.getDoc()
    if (!doc) {
      return
    }
    const indexesMap = getOrCreateMap(doc, 'indexes')
    indexesMap.delete(indexId)
  }, [])

  const isConnected = state === CollabState.READY || state === CollabState.SYNCING
  const isReady = state === CollabState.READY
  const isError = state === CollabState.ERROR

  return (
    <CollabContext.Provider value={{
      state,
      isConnected,
      isReady,
      isError,
      onlineUsers,
      tables,
      columns,
      relationships,
      indexes,
      startCollaboration,
      stopCollaboration,
      createTable,
      updateTable,
      deleteTable,
      createColumn,
      updateColumn,
      deleteColumn,
      createRelationship,
      updateRelationship,
      deleteRelationship,
      createIndex,
      updateIndex,
      deleteIndex
    }}>
      {children}
    </CollabContext.Provider>
  )
}

export function useCollab() {
  const context = useContext(CollabContext)
  if (context === undefined) {
    throw new Error('useCollab must be used within a CollabProvider')
  }
  return context
}
