import { Project, Table, Column, Relationship, Index, Version } from '../types'
import { ExportData } from './exportService'

export interface ImportResult {
  success: boolean
  project?: Partial<Project>
  tables?: Partial<Table>[]
  relationships?: Partial<Relationship>[]
  errors?: string[]
  warnings?: string[]
}

export interface ImportConflictOption {
  type: 'skip' | 'overwrite' | 'create_new'
}

interface ParsedColumn {
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
}

interface ParsedTable {
  name: string
  comment?: string
  columns: ParsedColumn[]
  indexes: { name: string; columns: string[]; unique: boolean; type: string }[]
}

function parseDataType(typeStr: string): { dataType: string; length?: number; precision?: number; scale?: number } {
  const upper = typeStr.toUpperCase().trim()

  const varcharMatch = upper.match(/^VARCHAR\s*\((\d+)\)/i)
  if (varcharMatch) {
    return { dataType: 'VARCHAR', length: parseInt(varcharMatch[1], 10) }
  }

  const charMatch = upper.match(/^CHAR\s*\((\d+)\)/i)
  if (charMatch) {
    return { dataType: 'CHAR', length: parseInt(charMatch[1], 10) }
  }

  const decimalMatch = upper.match(/^DECIMAL\s*\((\d+),(\d+)\)/i)
  if (decimalMatch) {
    return { dataType: 'DECIMAL', precision: parseInt(decimalMatch[1], 10), scale: parseInt(decimalMatch[2], 10) }
  }

  const numericMatch = upper.match(/^NUMERIC\s*\((\d+),(\d+)\)/i)
  if (numericMatch) {
    return { dataType: 'NUMERIC', precision: parseInt(numericMatch[1], 10), scale: parseInt(numericMatch[2], 10) }
  }

  const intMatch = upper.match(/^(?:TINYINT|SMALLINT|INT|BIGINT)\s*\(?(\d*)\)?/i)
  if (intMatch) {
    const baseType = intMatch[0].match(/^(TINYINT|SMALLINT|INT|BIGINT)/i)?.[0].toUpperCase() || 'INT'
    return { dataType: baseType }
  }

  const simpleTypes: Record<string, string> = {
    'TEXT': 'TEXT',
    'MEDIUMTEXT': 'MEDIUMTEXT',
    'LONGTEXT': 'LONGTEXT',
    'DATE': 'DATE',
    'DATETIME': 'DATETIME',
    'TIMESTAMP': 'TIMESTAMP',
    'TIME': 'TIME',
    'FLOAT': 'FLOAT',
    'DOUBLE': 'DOUBLE',
    'BOOLEAN': 'BOOLEAN',
    'BOOL': 'BOOLEAN',
    'BLOB': 'BLOB',
    'JSON': 'JSON'
  }

  for (const [key, value] of Object.entries(simpleTypes)) {
    if (upper.startsWith(key)) {
      return { dataType: value }
    }
  }

  return { dataType: upper }
}

function parseCreateTable(sql: string): ParsedTable[] {
  const tables: ParsedTable[] = []
  const createTableRegex = /CREATE\s+TABLE\s+`?(\w+)`?\s*\(([\s\S]*?)\)(?:\s+COMMENT\s*=\s*'([^']*)')?/gi

  let match
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1]
    const columnsStr = match[2]
    const tableComment = match[3]

    const columns: ParsedColumn[] = []
    const indexes: ParsedTable['indexes'] = []
    const primaryKeys: string[] = []

    const lines = columnsStr.split(',').map(line => line.trim()).filter(line => line.length > 0)

    for (const line of lines) {
      if (line.toUpperCase().startsWith('PRIMARY KEY')) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
        if (pkMatch) {
          const pkCols = pkMatch[1].split(',').map(col => col.trim().replace(/`/g, ''))
          primaryKeys.push(...pkCols)
        }
      } else if (line.toUpperCase().startsWith('FOREIGN KEY') || line.toUpperCase().startsWith('CONSTRAINT')) {
        continue
      } else if (line.toUpperCase().startsWith('UNIQUE') || line.toUpperCase().startsWith('KEY') || line.toUpperCase().startsWith('FULLTEXT')) {
        const idxMatch = line.match(/(?:UNIQUE\s+)?(?:KEY|FULLTEXT)\s+`?(\w+)`?\s*\(([^)]+)\)/i)
        if (idxMatch) {
          const idxName = idxMatch[1]
          const idxCols = idxMatch[2].split(',').map(col => col.trim().replace(/`/g, ''))
          indexes.push({ name: idxName, columns: idxCols, unique: line.toUpperCase().startsWith('UNIQUE'), type: line.toUpperCase().startsWith('FULLTEXT') ? 'FULLTEXT' : 'BTREE' })
        }
      } else {
        const colMatch = line.match(/`?(\w+)`?\s+(\w+(?:\([^)]+\))?)/i)
        if (colMatch) {
          const colName = colMatch[1]
          const typeStr = colMatch[2]
          const typeInfo = parseDataType(typeStr)

          const nullable = !line.toUpperCase().includes('NOT NULL')
          const autoIncrement = line.toUpperCase().includes('AUTO_INCREMENT')
          const unique = line.toUpperCase().includes('UNIQUE') && !line.toUpperCase().includes('PRIMARY KEY')

          let defaultValue: string | undefined
          const defaultMatch = line.match(/DEFAULT\s+(\S+)/i)
          if (defaultMatch) {
            defaultValue = defaultMatch[1]
          }

          let comment: string | undefined
          const commentMatch = line.match(/COMMENT\s+'([^']+)'/i)
          if (commentMatch) {
            comment = commentMatch[1]
          }

          columns.push({
            name: colName,
            dataType: typeInfo.dataType,
            length: typeInfo.length,
            precision: typeInfo.precision,
            scale: typeInfo.scale,
            nullable,
            autoIncrement,
            primaryKey: false,
            unique,
            defaultValue,
            comment
          })
        }
      }
    }

    for (const col of columns) {
      if (primaryKeys.includes(col.name)) {
        col.primaryKey = true
        col.nullable = false
      }
    }

    tables.push({ name: tableName, comment: tableComment, columns, indexes })
  }

  return tables
}

export const importService = {
  async importFromJSON(file: File, conflictOption: ImportConflictOption = { type: 'create_new' }): Promise<ImportResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const text = await file.text()
      const data: ExportData = JSON.parse(text)

      if (!data.version || !data.project || !data.tables) {
        errors.push('无效的 JSON 文件格式：缺少必要的字段')
        return { success: false, errors }
      }

      if (!data.project.name) {
        errors.push('项目名称不能为空')
        return { success: false, errors }
      }

      const now = new Date().toISOString()
      const projectId = conflictOption.type === 'create_new' ? `import_${Date.now()}` : data.project.id

      const project: Partial<Project> = {
        id: projectId,
        name: data.project.name,
        description: data.project.description,
        databaseType: data.project.databaseType || 'MySQL',
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'import'
      }

      const tables: Partial<Table>[] = []
      const tableIdMap = new Map<string, string>()

      for (const oldTable of data.tables) {
        const newTableId = conflictOption.type === 'create_new' ? `import_${Date.now()}_${tables.length}` : oldTable.id
        tableIdMap.set(oldTable.id, newTableId)

        const table: Partial<Table> = {
          id: newTableId,
          projectId,
          name: oldTable.name,
          comment: oldTable.comment,
          positionX: oldTable.positionX || 0,
          positionY: oldTable.positionY || 0,
          createdAt: now,
          updatedAt: now
        }
        tables.push(table)
      }

      const columns: Partial<Column>[] = []
      for (const oldTable of data.tables) {
        const newTableId = tableIdMap.get(oldTable.id) || oldTable.id
        for (let i = 0; i < oldTable.columns.length; i++) {
          const oldCol = oldTable.columns[i]
          const newColId = conflictOption.type === 'create_new' ? `import_${Date.now()}_col_${columns.length}` : oldCol.id
          const column: Partial<Column> = {
            id: newColId,
            tableId: newTableId,
            name: oldCol.name,
            dataType: oldCol.dataType,
            length: oldCol.length,
            precision: oldCol.precision,
            scale: oldCol.scale,
            nullable: oldCol.nullable,
            defaultValue: oldCol.defaultValue,
            autoIncrement: oldCol.autoIncrement,
            primaryKey: oldCol.primaryKey,
            unique: oldCol.unique,
            comment: oldCol.comment,
            order: i,
            createdAt: now,
            updatedAt: now
          }
          columns.push(column)
        }
      }

      const relationships: Partial<Relationship>[] = []
      for (const oldRel of (data.relationships || [])) {
        const newSourceTableId = tableIdMap.get(oldRel.sourceTableId)
        const newTargetTableId = tableIdMap.get(oldRel.targetTableId)
        if (newSourceTableId && newTargetTableId) {
          const rel: Partial<Relationship> = {
            id: conflictOption.type === 'create_new' ? `import_${Date.now()}_rel_${relationships.length}` : oldRel.id,
            projectId,
            sourceTableId: newSourceTableId,
            sourceColumnId: oldRel.sourceColumnId,
            targetTableId: newTargetTableId,
            targetColumnId: oldRel.targetColumnId,
            relationshipType: oldRel.relationshipType || 'one-to-one',
            onUpdate: oldRel.onUpdate || 'NO ACTION',
            onDelete: oldRel.onDelete || 'NO ACTION',
            createdAt: now
          }
          relationships.push(rel)
        } else {
          warnings.push(`关系 "${oldRel.name || oldRel.id}" 引用的表不存在，已跳过`)
        }
      }

      return {
        success: true,
        project,
        tables,
        relationships,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (e) {
      errors.push(`JSON 解析失败: ${e instanceof Error ? e.message : '未知错误'}`)
      return { success: false, errors }
    }
  },

  async importFromSQL(file: File): Promise<ImportResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const sql = await file.text()
      const parsedTables = parseCreateTable(sql)

      if (parsedTables.length === 0) {
        errors.push('未能从 SQL 文件中解析出任何表结构')
        return { success: false, errors }
      }

      const now = new Date().toISOString()
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      const projectId = `import_sql_${Date.now()}`

      const project: Partial<Project> = {
        id: projectId,
        name: fileName,
        description: `从 SQL 文件导入: ${file.name}`,
        databaseType: 'MySQL',
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'import'
      }

      const tables: Partial<Table>[] = []
      const tableIdMap = new Map<string, string>()

      for (let i = 0; i < parsedTables.length; i++) {
        const parsed = parsedTables[i]
        const tableId = `import_sql_${Date.now()}_table_${i}`
        tableIdMap.set(parsed.name, tableId)

        const table: Partial<Table> = {
          id: tableId,
          projectId,
          name: parsed.name,
          comment: parsed.comment,
          positionX: (i % 4) * 300,
          positionY: Math.floor(i / 4) * 200,
          createdAt: now,
          updatedAt: now
        }
        tables.push(table)
      }

      const columns: Partial<Column>[] = []
      for (let i = 0; i < parsedTables.length; i++) {
        const parsed = parsedTables[i]
        const tableId = tableIdMap.get(parsed.name)
        if (!tableId) continue

        for (let j = 0; j < parsed.columns.length; j++) {
          const col = parsed.columns[j]
          const column: Partial<Column> = {
            id: `import_sql_${Date.now()}_col_${columns.length}`,
            tableId,
            name: col.name,
            dataType: col.dataType,
            length: col.length,
            precision: col.precision,
            scale: col.scale,
            nullable: col.nullable,
            autoIncrement: col.autoIncrement,
            primaryKey: col.primaryKey,
            unique: col.unique,
            defaultValue: col.defaultValue,
            comment: col.comment,
            order: j,
            createdAt: now,
            updatedAt: now
          }
          columns.push(column)
        }
      }

      const indexes: Partial<Index>[] = []
      for (let i = 0; i < parsedTables.length; i++) {
        const parsed = parsedTables[i]
        const tableId = tableIdMap.get(parsed.name)
        if (!tableId) continue

        for (const idx of parsed.indexes) {
          const index: Partial<Index> = {
            id: `import_sql_${Date.now()}_idx_${indexes.length}`,
            tableId,
            name: idx.name,
            columns: JSON.stringify(idx.columns),
            unique: idx.unique,
            type: idx.type
          }
          indexes.push(index)
        }
      }

      return {
        success: true,
        project,
        tables,
        relationships: [],
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (e) {
      errors.push(`SQL 解析失败: ${e instanceof Error ? e.message : '未知错误'}`)
      return { success: false, errors }
    }
  }
}

export default importService