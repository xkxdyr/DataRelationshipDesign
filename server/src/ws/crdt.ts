import * as Y from 'yjs'
import { pack, unpack } from 'msgpackr'

// CRDT 文档状态
export interface CRDTDocumentState {
  projectId: string
  tables: Y.Map<Y.Map<any>>
  columns: Y.Map<Y.Map<any>>
  relationships: Y.Map<Y.Map<any>>
  indexes: Y.Map<Y.Map<any>>
  awareness: Map<string, any>
}

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

// Yjs 文档管理器
export class CRDTDocumentManager {
  private docs: Map<string, Y.Doc> = new Map()
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
    this.getOrCreateDoc()
  }

  // 获取或创建文档
  private getOrCreateDoc(): Y.Doc {
    let doc = this.docs.get(this.projectId)
    if (!doc) {
      doc = new Y.Doc()
      this.initDocumentStructure(doc)
      this.docs.set(this.projectId, doc)
    }
    return doc
  }

  // 初始化文档结构
  private initDocumentStructure(doc: Y.Doc) {
    // 根节点
    const root = doc.getMap('root')

    // 表结构
    if (!root.has('tables')) {
      root.set('tables', new Y.Map())
    }

    // 列结构
    if (!root.has('columns')) {
      root.set('columns', new Y.Map())
    }

    // 关系结构
    if (!root.has('relationships')) {
      root.set('relationships', new Y.Map())
    }

    // 索引结构
    if (!root.has('indexes')) {
      root.set('indexes', new Y.Map())
    }
  }

  // 获取文档
  getDoc(): Y.Doc {
    return this.getOrCreateDoc()
  }

  // 获取根节点
  getRoot(): Y.Map<any> {
    return this.getOrCreateDoc().getMap('root')
  }

  // ========== 表操作 ==========

  // 创建表
  createTable(table: TableData): void {
    const doc = this.getOrCreateDoc()
    const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>

    const tableMap = new Y.Map()
    Object.entries(table).forEach(([key, value]) => {
      if (value !== undefined) {
        tableMap.set(key, value)
      }
    })

    tables.set(table.id, tableMap)
  }

  // 更新表
  updateTable(tableId: string, updates: Partial<TableData>): void {
    const doc = this.getOrCreateDoc()
    const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>
    const tableMap = tables.get(tableId)

    if (tableMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          tableMap.set(key, value)
        }
      })
    }
  }

  // 删除表
  deleteTable(tableId: string): void {
    const doc = this.getOrCreateDoc()
    const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>
    tables.delete(tableId)

    // 同时删除关联的列
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
  }

  // 获取表
  getTable(tableId: string): TableData | undefined {
    const tables = this.getRoot().get('tables') as Y.Map<Y.Map<any>>
    const tableMap = tables.get(tableId)
    if (!tableMap) return undefined

    const table: any = {}
    tableMap.forEach((value, key) => {
      table[key] = value
    })
    return table as TableData
  }

  // 获取所有表
  getAllTables(): TableData[] {
    const tables: TableData[] = []
    const tableMaps = this.getRoot().get('tables') as Y.Map<Y.Map<any>>
    tableMaps.forEach((tableMap) => {
      const table: any = {}
      tableMap.forEach((value, key) => {
        table[key] = value
      })
      tables.push(table as TableData)
    })
    return tables
  }

  // ========== 列操作 ==========

  // 创建列
  createColumn(column: ColumnData): void {
    const doc = this.getOrCreateDoc()
    const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>

    const columnMap = new Y.Map()
    Object.entries(column).forEach(([key, value]) => {
      if (value !== undefined) {
        columnMap.set(key, value)
      }
    })

    columns.set(column.id, columnMap)
  }

  // 更新列
  updateColumn(columnId: string, updates: Partial<ColumnData>): void {
    const doc = this.getOrCreateDoc()
    const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
    const columnMap = columns.get(columnId)

    if (columnMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          columnMap.set(key, value)
        }
      })
    }
  }

  // 删除列
  deleteColumn(columnId: string): void {
    const doc = this.getOrCreateDoc()
    const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
    columns.delete(columnId)
  }

  // 获取列
  getColumn(columnId: string): ColumnData | undefined {
    const columns = this.getRoot().get('columns') as Y.Map<Y.Map<any>>
    const columnMap = columns.get(columnId)
    if (!columnMap) return undefined

    const column: any = {}
    columnMap.forEach((value, key) => {
      column[key] = value
    })
    return column as ColumnData
  }

  // 获取表的所有列
  getTableColumns(tableId: string): ColumnData[] {
    const columns: ColumnData[] = []
    const columnMaps = this.getRoot().get('columns') as Y.Map<Y.Map<any>>
    columnMaps.forEach((columnMap) => {
      if (columnMap.get('tableId') === tableId) {
        const column: any = {}
        columnMap.forEach((value, key) => {
          column[key] = value
        })
        columns.push(column as ColumnData)
      }
    })
    return columns.sort((a, b) => a.order - b.order)
  }

  // ========== 关系操作 ==========

  // 创建关系
  createRelationship(relationship: RelationshipData): void {
    const doc = this.getOrCreateDoc()
    const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>

    const relationshipMap = new Y.Map()
    Object.entries(relationship).forEach(([key, value]) => {
      if (value !== undefined) {
        relationshipMap.set(key, value)
      }
    })

    relationships.set(relationship.id, relationshipMap)
  }

  // 更新关系
  updateRelationship(relationshipId: string, updates: Partial<RelationshipData>): void {
    const doc = this.getOrCreateDoc()
    const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>
    const relationshipMap = relationships.get(relationshipId)

    if (relationshipMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          relationshipMap.set(key, value)
        }
      })
    }
  }

  // 删除关系
  deleteRelationship(relationshipId: string): void {
    const doc = this.getOrCreateDoc()
    const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>
    relationships.delete(relationshipId)
  }

  // 获取关系
  getRelationship(relationshipId: string): RelationshipData | undefined {
    const relationships = this.getRoot().get('relationships') as Y.Map<Y.Map<any>>
    const relationshipMap = relationships.get(relationshipId)
    if (!relationshipMap) return undefined

    const relationship: any = {}
    relationshipMap.forEach((value, key) => {
      relationship[key] = value
    })
    return relationship as RelationshipData
  }

  // 获取所有关系
  getAllRelationships(): RelationshipData[] {
    const relationships: RelationshipData[] = []
    const relationshipMaps = this.getRoot().get('relationships') as Y.Map<Y.Map<any>>
    relationshipMaps.forEach((relationshipMap) => {
      const relationship: any = {}
      relationshipMap.forEach((value, key) => {
        relationship[key] = value
      })
      relationships.push(relationship as RelationshipData)
    })
    return relationships
  }

  // ========== 索引操作 ==========

  // 创建索引
  createIndex(index: IndexData): void {
    const doc = this.getOrCreateDoc()
    const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>

    const indexMap = new Y.Map()
    Object.entries(index).forEach(([key, value]) => {
      if (value !== undefined) {
        indexMap.set(key, value)
      }
    })

    indexes.set(index.id, indexMap)
  }

  // 更新索引
  updateIndex(indexId: string, updates: Partial<IndexData>): void {
    const doc = this.getOrCreateDoc()
    const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
    const indexMap = indexes.get(indexId)

    if (indexMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          indexMap.set(key, value)
        }
      })
    }
  }

  // 删除索引
  deleteIndex(indexId: string): void {
    const doc = this.getOrCreateDoc()
    const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
    indexes.delete(indexId)
  }

  // 获取索引
  getIndex(indexId: string): IndexData | undefined {
    const indexes = this.getRoot().get('indexes') as Y.Map<Y.Map<any>>
    const indexMap = indexes.get(indexId)
    if (!indexMap) return undefined

    const index: any = {}
    indexMap.forEach((value, key) => {
      index[key] = value
    })
    return index as IndexData
  }

  // 获取表的所有索引
  getTableIndexes(tableId: string): IndexData[] {
    const indexes: IndexData[] = []
    const indexMaps = this.getRoot().get('indexes') as Y.Map<Y.Map<any>>
    indexMaps.forEach((indexMap) => {
      if (indexMap.get('tableId') === tableId) {
        const index: any = {}
        indexMap.forEach((value, key) => {
          index[key] = value
        })
        indexes.push(index as IndexData)
      }
    })
    return indexes
  }

  // ========== 文档同步 ==========

  // 获取文档状态（序列化）
  getState(): Uint8Array {
    const doc = this.getOrCreateDoc()
    return Y.encodeStateAsUpdate(doc)
  }

  // 从状态恢复（反序列化）
  applyState(state: Uint8Array): void {
    const doc = this.getOrCreateDoc()
    Y.applyUpdate(doc, state)
  }

  // 获取差异更新
  getUpdate(lastState: Uint8Array | null): Uint8Array {
    const doc = this.getOrCreateDoc()
    if (!lastState) {
      return Y.encodeStateAsUpdate(doc)
    }
    // 计算从 lastState 到当前状态的差异
    return Y.encodeStateAsUpdate(doc, lastState)
  }

  // 应用差异更新
  applyUpdate(update: Uint8Array): void {
    const doc = this.getOrCreateDoc()
    Y.applyUpdate(doc, update)
  }

  // 序列化整个文档为 JSON（用于持久化）
  toJSON(): object {
    const root = this.getRoot()
    const result: any = {
      tables: {},
      columns: {},
      relationships: {},
      indexes: {}
    }

    const tables = root.get('tables') as Y.Map<Y.Map<any>>
    tables.forEach((tableMap, tableId) => {
      const table: any = {}
      tableMap.forEach((value, key) => {
        table[key] = value
      })
      result.tables[tableId] = table
    })

    const columns = root.get('columns') as Y.Map<Y.Map<any>>
    columns.forEach((columnMap, columnId) => {
      const column: any = {}
      columnMap.forEach((value, key) => {
        column[key] = value
      })
      result.columns[columnId] = column
    })

    const relationships = root.get('relationships') as Y.Map<Y.Map<any>>
    relationships.forEach((relationshipMap, relationshipId) => {
      const relationship: any = {}
      relationshipMap.forEach((value, key) => {
        relationship[key] = value
      })
      result.relationships[relationshipId] = relationship
    })

    const indexes = root.get('indexes') as Y.Map<Y.Map<any>>
    indexes.forEach((indexMap, indexId) => {
      const index: any = {}
      indexMap.forEach((value, key) => {
        index[key] = value
      })
      result.indexes[indexId] = index
    })

    return result
  }

  // 从 JSON 恢复
  fromJSON(data: any): void {
    const doc = this.getOrCreateDoc()

    doc.transact(() => {
      // 恢复表
      if (data.tables) {
        const tables = doc.getMap('root').get('tables') as Y.Map<Y.Map<any>>
        Object.entries(data.tables).forEach(([tableId, table]) => {
          const tableMap = new Y.Map()
          Object.entries(table as any).forEach(([key, value]) => {
            tableMap.set(key, value)
          })
          tables.set(tableId, tableMap)
        })
      }

      // 恢复列
      if (data.columns) {
        const columns = doc.getMap('root').get('columns') as Y.Map<Y.Map<any>>
        Object.entries(data.columns).forEach(([columnId, column]) => {
          const columnMap = new Y.Map()
          Object.entries(column as any).forEach(([key, value]) => {
            columnMap.set(key, value)
          })
          columns.set(columnId, columnMap)
        })
      }

      // 恢复关系
      if (data.relationships) {
        const relationships = doc.getMap('root').get('relationships') as Y.Map<Y.Map<any>>
        Object.entries(data.relationships).forEach(([relationshipId, relationship]) => {
          const relationshipMap = new Y.Map()
          Object.entries(relationship as any).forEach(([key, value]) => {
            relationshipMap.set(key, value)
          })
          relationships.set(relationshipId, relationshipMap)
        })
      }

      // 恢复索引
      if (data.indexes) {
        const indexes = doc.getMap('root').get('indexes') as Y.Map<Y.Map<any>>
        Object.entries(data.indexes).forEach(([indexId, index]) => {
          const indexMap = new Y.Map()
          Object.entries(index as any).forEach(([key, value]) => {
            indexMap.set(key, value)
          })
          indexes.set(indexId, indexMap)
        })
      }
    })
  }

  // 销毁文档
  destroy(): void {
    const doc = this.docs.get(this.projectId)
    if (doc) {
      doc.destroy()
      this.docs.delete(this.projectId)
    }
  }
}

// CRDT 文档管理器单例工厂
class CRDTDocumentFactory {
  private managers: Map<string, CRDTDocumentManager> = new Map()

  getManager(projectId: string): CRDTDocumentManager {
    let manager = this.managers.get(projectId)
    if (!manager) {
      manager = new CRDTDocumentManager(projectId)
      this.managers.set(projectId, manager)
    }
    return manager
  }

  removeManager(projectId: string): void {
    const manager = this.managers.get(projectId)
    if (manager) {
      manager.destroy()
      this.managers.delete(projectId)
    }
  }

  hasManager(projectId: string): boolean {
    return this.managers.has(projectId)
  }
}

export const crdtFactory = new CRDTDocumentFactory()
