import { useEffect, useRef, useCallback, useState } from 'react'
import * as Y from 'yjs'
import { pack, unpack } from 'msgpackr'
import { collabService, MessageType, ConnectionState } from '../services/collabService'

// 表结构类型
export interface TableData {
  id: string
  name: string
  comment: string
  positionX: number
  positionY: number
  color?: string
  projectId: string
  createdAt?: string
  updatedAt?: string
}

// 列结构类型
export interface ColumnData {
  id: string
  tableId: string
  name: string
  type: string
  comment: string
  isPrimaryKey: boolean
  isUnique: boolean
  isNotNull: boolean
  isAutoIncrement: boolean
  defaultValue: string
  order: number
}

// 关系结构类型
export interface RelationshipData {
  id: string
  projectId: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many'
  onUpdate: 'CASCADE' | 'RESTRICT' | 'NO ACTION' | 'SET NULL' | 'SET DEFAULT'
  onDelete: 'CASCADE' | 'RESTRICT' | 'NO ACTION' | 'SET NULL' | 'SET DEFAULT'
}

// 索引结构类型
export interface IndexData {
  id: string
  tableId: string
  name: string
  columns: string[]
  isUnique: boolean
  indexType: 'BTREE' | 'HASH' | 'FULLTEXT'
}

// CRDT Hook 配置
export interface UseCRDTConfig {
  projectId: string
  enabled?: boolean
  onUpdate?: () => void
}

// CRDT Hook 返回类型
export interface UseCRDTReturn {
  isReady: boolean
  tables: TableData[]
  columns: ColumnData[]
  relationships: RelationshipData[]
  indexes: IndexData[]
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
  applyRemoteUpdate: (update: Uint8Array) => void
  getLocalUpdate: () => Uint8Array | null
}

// Yjs 文档管理 Hook
export function useCRDT(config: UseCRDTConfig): UseCRDTReturn {
  const { projectId, enabled = true, onUpdate } = config
  const docRef = useRef<Y.Doc | null>(null)
  const lastUpdateRef = useRef<Uint8Array | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [tables, setTables] = useState<TableData[]>([])
  const [columns, setColumns] = useState<ColumnData[]>([])
  const [relationships, setRelationships] = useState<RelationshipData[]>([])
  const [indexes, setIndexes] = useState<IndexData[]>([])

  // 初始化 Yjs 文档
  useEffect(() => {
    if (!enabled || !projectId) return

    const doc = new Y.Doc()
    docRef.current = doc

    // 初始化文档结构
    const root = doc.getMap('root')
    if (!root.has('tables')) {
      root.set('tables', new Y.Map())
    }
    if (!root.has('columns')) {
      root.set('columns', new Y.Map())
    }
    if (!root.has('relationships')) {
      root.set('relationships', new Y.Map())
    }
    if (!root.has('indexes')) {
      root.set('indexes', new Y.Map())
    }

    // 监听文档变化
    const updateHandler = () => {
      syncFromDoc()
      onUpdate?.()
    }
    doc.on('update', updateHandler)

    // 等待连接就绪后请求同步
    const requestSync = () => {
      if (collabService.getConnectionState() === ConnectionState.CONNECTED) {
        collabService.send({
          type: MessageType.SYNC_REQUEST,
          projectId,
          data: { lastUpdate: lastUpdateRef.current ? Array.from(lastUpdateRef.current) : null }
        })
      } else {
        // 等待连接状态变化
        const waitForConnection = (state: ConnectionState) => {
          if (state === ConnectionState.CONNECTED) {
            collabService.offConnectionChange(waitForConnection)
            collabService.send({
              type: MessageType.SYNC_REQUEST,
              projectId,
              data: { lastUpdate: lastUpdateRef.current ? Array.from(lastUpdateRef.current) : null }
            })
          }
        }
        collabService.onConnectionChange(waitForConnection)
        return waitForConnection
      }
      return null
    }

    const waitHandler = requestSync()

    // 处理同步响应
    const handleSyncResponse = (message: any) => {
      if (message.data?.state) {
        try {
          const state = new Uint8Array(message.data.state)
          Y.applyUpdate(doc, state)
          lastUpdateRef.current = Y.encodeStateAsUpdate(doc)
          syncFromDoc()
          setIsReady(true)
        } catch (err) {
          console.error('应用同步状态失败:', err)
        }
      } else {
        setIsReady(true)
      }
    }

    // 处理远程更新
    const handleRemoteUpdate = (message: any) => {
      if (message.data?.update) {
        try {
          const update = new Uint8Array(message.data.update)
          Y.applyUpdate(doc, update)
          lastUpdateRef.current = Y.encodeStateAsUpdate(doc)
          syncFromDoc()
        } catch (err) {
          console.error('应用远程更新失败:', err)
        }
      }
    }

    collabService.on(MessageType.SYNC_RESPONSE, handleSyncResponse)
    collabService.on(MessageType.OP_UPDATE, handleRemoteUpdate)

    return () => {
      doc.off('update', updateHandler)
      collabService.off(MessageType.SYNC_RESPONSE, handleSyncResponse)
      collabService.off(MessageType.OP_UPDATE, handleRemoteUpdate)
      if (waitHandler) {
        collabService.offConnectionChange(waitHandler)
      }
      doc.destroy()
      docRef.current = null
    }
  }, [projectId, enabled, onUpdate])

  // 从文档同步数据到状态
  const syncFromDoc = useCallback(() => {
    const doc = docRef.current
    if (!doc) return

    const root = doc.getMap('root')

    // 同步表
    const tableMaps = root.get('tables') as Y.Map<Y.Map<any>>
    const tableList: TableData[] = []
    tableMaps.forEach((tableMap) => {
      const table: any = {}
      tableMap.forEach((value, key) => {
        table[key] = value
      })
      tableList.push(table as TableData)
    })
    setTables(tableList)

    // 同步列
    const columnMaps = root.get('columns') as Y.Map<Y.Map<any>>
    const columnList: ColumnData[] = []
    columnMaps.forEach((columnMap) => {
      const column: any = {}
      columnMap.forEach((value, key) => {
        column[key] = value
      })
      columnList.push(column as ColumnData)
    })
    setColumns(columnList)

    // 同步关系
    const relationshipMaps = root.get('relationships') as Y.Map<Y.Map<any>>
    const relationshipList: RelationshipData[] = []
    relationshipMaps.forEach((relationshipMap) => {
      const relationship: any = {}
      relationshipMap.forEach((value, key) => {
        relationship[key] = value
      })
      relationshipList.push(relationship as RelationshipData)
    })
    setRelationships(relationshipList)

    // 同步索引
    const indexMaps = root.get('indexes') as Y.Map<Y.Map<any>>
    const indexList: IndexData[] = []
    indexMaps.forEach((indexMap) => {
      const index: any = {}
      indexMap.forEach((value, key) => {
        index[key] = value
      })
      indexList.push(index as IndexData)
    })
    setIndexes(indexList)
  }, [])

  // 广播本地更新
  const broadcastUpdate = useCallback(() => {
    const doc = docRef.current
    if (!doc || !enabled) return

    const update = Y.encodeStateAsUpdate(doc)
    lastUpdateRef.current = update

    collabService.send({
      type: MessageType.OP_UPDATE,
      projectId,
      data: { update: Array.from(update) }
    })
  }, [projectId, enabled])

  // ========== 表操作 ==========

  const createTable = useCallback((table: TableData) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>
      const tableMap = new Y.Map()
      Object.entries(table).forEach(([key, value]) => {
        if (value !== undefined) {
          tableMap.set(key, value)
        }
      })
      tables.set(table.id, tableMap)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  const updateTable = useCallback((tableId: string, updates: Partial<TableData>) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>
    const tableMap = tables.get(tableId)

    if (tableMap) {
      doc.transact(() => {
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            tableMap.set(key, value)
          }
        })
      })
      broadcastUpdate()
    }
  }, [enabled, broadcastUpdate])

  const deleteTable = useCallback((tableId: string) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>
      tables.delete(tableId)

      // 删除关联的列
      const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
      const columnsToDelete: string[] = []
      columns.forEach((col, colId) => {
        if (col.get('tableId') === tableId) {
          columnsToDelete.push(colId)
        }
      })
      columnsToDelete.forEach(colId => columns.delete(colId))

      // 删除关联的索引
      const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
      const indexesToDelete: string[] = []
      indexes.forEach((idx, idxId) => {
        if (idx.get('tableId') === tableId) {
          indexesToDelete.push(idxId)
        }
      })
      indexesToDelete.forEach(idxId => indexes.delete(idxId))
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  // ========== 列操作 ==========

  const createColumn = useCallback((column: ColumnData) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
      const columnMap = new Y.Map()
      Object.entries(column).forEach(([key, value]) => {
        if (value !== undefined) {
          columnMap.set(key, value)
        }
      })
      columns.set(column.id, columnMap)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  const updateColumn = useCallback((columnId: string, updates: Partial<ColumnData>) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
    const columnMap = columns.get(columnId)

    if (columnMap) {
      doc.transact(() => {
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            columnMap.set(key, value)
          }
        })
      })
      broadcastUpdate()
    }
  }, [enabled, broadcastUpdate])

  const deleteColumn = useCallback((columnId: string) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
      columns.delete(columnId)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  // ========== 关系操作 ==========

  const createRelationship = useCallback((relationship: RelationshipData) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>
      const relationshipMap = new Y.Map()
      Object.entries(relationship).forEach(([key, value]) => {
        if (value !== undefined) {
          relationshipMap.set(key, value)
        }
      })
      relationships.set(relationship.id, relationshipMap)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  const updateRelationship = useCallback((relationshipId: string, updates: Partial<RelationshipData>) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>
    const relationshipMap = relationships.get(relationshipId)

    if (relationshipMap) {
      doc.transact(() => {
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            relationshipMap.set(key, value)
          }
        })
      })
      broadcastUpdate()
    }
  }, [enabled, broadcastUpdate])

  const deleteRelationship = useCallback((relationshipId: string) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>
      relationships.delete(relationshipId)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  // ========== 索引操作 ==========

  const createIndex = useCallback((index: IndexData) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
      const indexMap = new Y.Map()
      Object.entries(index).forEach(([key, value]) => {
        if (value !== undefined) {
          indexMap.set(key, value)
        }
      })
      indexes.set(index.id, indexMap)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  const updateIndex = useCallback((indexId: string, updates: Partial<IndexData>) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
    const indexMap = indexes.get(indexId)

    if (indexMap) {
      doc.transact(() => {
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            indexMap.set(key, value)
          }
        })
      })
      broadcastUpdate()
    }
  }, [enabled, broadcastUpdate])

  const deleteIndex = useCallback((indexId: string) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    doc.transact(() => {
      const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
      indexes.delete(indexId)
    })

    broadcastUpdate()
  }, [enabled, broadcastUpdate])

  // ========== 外部更新应用 ==========

  const applyRemoteUpdate = useCallback((update: Uint8Array) => {
    const doc = docRef.current
    if (!doc || !enabled) return

    Y.applyUpdate(doc, update)
    lastUpdateRef.current = Y.encodeStateAsUpdate(doc)
    syncFromDoc()
  }, [enabled, syncFromDoc])

  const getLocalUpdate = useCallback((): Uint8Array | null => {
    return lastUpdateRef.current
  }, [])

  return {
    isReady,
    tables,
    columns,
    relationships,
    indexes,
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
    deleteIndex,
    applyRemoteUpdate,
    getLocalUpdate
  }
}

export default useCRDT
