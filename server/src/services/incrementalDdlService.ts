import { PrismaClient } from '@prisma/client'
import { Column, Table, Index } from '../generators/ddlGenerator'
import { DatabaseType } from '../generators/multiDdlGenerator'

const prisma = new PrismaClient()

export interface ColumnDiff {
  type: 'ADD' | 'DROP' | 'MODIFY'
  columnName: string
  oldColumn?: Column
  newColumn?: Column
  changes: string[]
}

export interface IndexDiff {
  type: 'ADD' | 'DROP'
  indexName: string
  oldIndex?: Index
  newIndex?: Index
}

export interface TableDiffResult {
  tableName: string
  columnDiffs: ColumnDiff[]
  indexDiffs: IndexDiff[]
  statements: string[]
  summary: string
}

function compareColumns(oldColumns: Column[], newColumns: Column[]): ColumnDiff[] {
  const diffs: ColumnDiff[] = []
  const oldMap = new Map(oldColumns.map(c => [c.name, c]))
  const newMap = new Map(newColumns.map(c => [c.name, c]))

  for (const col of newColumns) {
    const old = oldMap.get(col.name)
    if (!old) {
      diffs.push({ type: 'ADD', columnName: col.name, newColumn: col, changes: ['新增列'] })
    }
  }

  for (const col of oldColumns) {
    if (!newMap.has(col.name)) {
      diffs.push({ type: 'DROP', columnName: col.name, oldColumn: col, changes: ['删除列'] })
    }
  }

  for (const newCol of newColumns) {
    const oldCol = oldMap.get(newCol.name)
    if (!oldCol) continue

    const changes: string[] = []

    if (oldCol.dataType !== newCol.dataType) {
      changes.push(`类型: ${oldCol.dataType} → ${newCol.dataType}`)
    }
    if (oldCol.length !== newCol.length) {
      changes.push(`长度: ${oldCol.length} → ${newCol.length}`)
    }
    if (oldCol.nullable !== newCol.nullable) {
      changes.push(oldCol.nullable ? '可空 → 非空' : '非空 → 可空')
    }
    if (oldCol.defaultValue !== newCol.defaultValue) {
      changes.push(`默认值: ${oldCol.defaultValue || '无'} → ${newCol.defaultValue || '无'}`)
    }
    if (oldCol.primaryKey !== newCol.primaryKey) {
      changes.push(oldCol.primaryKey ? '移除主键' : '设为主键')
    }
    if (oldCol.autoIncrement !== newCol.autoIncrement) {
      changes.push(newCol.autoIncrement ? '启用自增' : '禁用自增')
    }
    if (oldCol.unique !== newCol.unique) {
      changes.push(newCol.unique ? '设为唯一' : '取消唯一')
    }
    if (oldCol.comment !== newCol.comment) {
      changes.push(`注释: ${oldCol.comment || '无'} → ${newCol.comment || '无'}`)
    }

    if (changes.length > 0) {
      diffs.push({
        type: 'MODIFY',
        columnName: newCol.name,
        oldColumn: oldCol,
        newColumn: newCol,
        changes
      })
    }
  }

  return diffs
}

function compareIndexes(oldIndexes: Index[], newIndexes: Index[]): IndexDiff[] {
  const diffs: IndexDiff[] = []
  const oldMap = new Map(oldIndexes.map(i => [i.name, i]))
  const newMap = new Map(newIndexes.map(i => [i.name, i]))

  for (const idx of newIndexes) {
    if (!oldMap.has(idx.name)) {
      diffs.push({ type: 'ADD', indexName: idx.name, newIndex: idx })
    }
  }

  for (const idx of oldIndexes) {
    if (!newMap.has(idx.name)) {
      diffs.push({ type: 'DROP', indexName: idx.name, oldIndex: idx })
    }
  }

  return diffs
}

export function generateIncrementalDDL(
  oldTables: Table[],
  newTables: Table[],
  dbType: DatabaseType
): TableDiffResult[] {
  const results: TableDiffResult[] = []
  const oldMap = new Map(oldTables.map(t => [t.name, t]))
  const newMap = new Map(newTables.map(t => [t.name, t]))

  const allTableNames = new Set([...oldMap.keys(), ...newMap.keys()])

  for (const tableName of allTableNames) {
    const oldTable = oldMap.get(tableName)
    const newTable = newMap.get(tableName)

    if (!oldTable && newTable) {
      results.push({
        tableName,
        columnDiffs: newTable.columns.map(c => ({ type: 'ADD', columnName: c.name, newColumn: c, changes: ['新增列'] })),
        indexDiffs: newTable.indexes.map(i => ({ type: 'ADD', indexName: i.name, newIndex: i })),
        statements: [`-- 新建表 '${tableName}'，请参考 CREATE TABLE 语句`],
        summary: '新建表'
      })
      continue
    }

    if (oldTable && !newTable) {
      results.push({
        tableName,
        columnDiffs: oldTable.columns.map(c => ({ type: 'DROP', columnName: c.name, oldColumn: c, changes: ['删除列'] })),
        indexDiffs: oldTable.indexes.map(i => ({ type: 'DROP', indexName: i.name, oldIndex: i })),
        statements: [generateDropTable(tableName, dbType)],
        summary: '删除表'
      })
      continue
    }

    if (!oldTable || !newTable) continue

    const columnDiffs = compareColumns(oldTable.columns, newTable.columns)
    const indexDiffs = compareIndexes(oldTable.indexes, newTable.indexes)
    const statements = generateAlterStatements(tableName, columnDiffs, indexDiffs, dbType)

    if (columnDiffs.length === 0 && indexDiffs.length === 0) continue

    results.push({
      tableName,
      columnDiffs,
      indexDiffs,
      statements,
      summary: `${columnDiffs.length} 个列变更, ${indexDiffs.length} 个索引变更`
    })
  }

  return results
}

function generateDropTable(tableName: string, dbType: DatabaseType): string {
  switch (dbType) {
    case 'MYSQL':
      return `DROP TABLE IF EXISTS \`${tableName}\`;`
    case 'POSTGRESQL':
      return `DROP TABLE IF EXISTS "${tableName}";`
    case 'SQLITE':
      return `DROP TABLE IF EXISTS "${tableName}";`
    case 'SQLSERVER':
      return `IF OBJECT_ID('${tableName}', 'U') IS NOT NULL DROP TABLE [${tableName}];`
    case 'ORACLE':
      return `DROP TABLE "${tableName}" CASCADE CONSTRAINTS;`
    default:
      return `DROP TABLE IF EXISTS \`${tableName}\`;`
  }
}

function quoteName(name: string, dbType: DatabaseType): string {
  switch (dbType) {
    case 'MYSQL':
      return `\`${name}\``
    case 'POSTGRESQL':
    case 'SQLITE':
    case 'ORACLE':
      return `"${name}"`
    case 'SQLSERVER':
      return `[${name}]`
    default:
      return `\`${name}\``
  }
}

function formatColumnDef(col: Column, dbType: DatabaseType): string {
  const parts: string[] = []
  const qName = quoteName(col.name, dbType)
  const typeStr = mapDataType(col, dbType)

  parts.push(`${qName} ${typeStr}`)

  if (!col.nullable) {
    parts.push('NOT NULL')
  }

  if (col.defaultValue !== undefined && col.defaultValue !== null) {
    parts.push(`DEFAULT ${formatDefault(col.defaultValue, dbType)}`)
  }

  if (col.comment && dbType !== 'SQLITE') {
    parts.push(formatComment(col.comment, dbType))
  }

  return parts.join(' ')
}

function mapDataType(col: Column, dbType: DatabaseType): string {
  const dt = col.dataType.toUpperCase()
  const len = col.length

  if (col.autoIncrement && col.primaryKey) {
    switch (dbType) {
      case 'POSTGRESQL':
        if (dt === 'BIGINT') return 'BIGSERIAL'
        return 'SERIAL'
      case 'SQLITE':
        return 'INTEGER'
      default:
        break
    }
  }

  switch (dt) {
    case 'VARCHAR':
      return len ? `VARCHAR(${len})` : 'VARCHAR(255)'
    case 'CHAR':
      return len ? `CHAR(${len})` : 'CHAR(1)'
    case 'DECIMAL':
    case 'NUMERIC': {
      const prec = col.precision || 10
      const scl = col.scale || 0
      return dbType === 'ORACLE' ? `NUMBER(${prec},${scl})` : `DECIMAL(${prec},${scl})`
    }
    default:
      return dt
  }
}

function formatDefault(value: string, dbType: DatabaseType): string {
  const upper = value.toUpperCase()
  if (upper === 'NULL') return 'NULL'
  if (upper === 'CURRENT_TIMESTAMP' || upper === 'NOW()' || upper === 'GETDATE()' || upper === 'SYSTIMESTAMP') {
    if (dbType === 'SQLSERVER') return 'GETDATE()'
    return value
  }
  if (upper === 'TRUE' && dbType === 'POSTGRESQL') return 'TRUE'
  if (upper === 'FALSE' && dbType === 'POSTGRESQL') return 'FALSE'

  const num = Number(value)
  if (!isNaN(num)) return value

  return `'${value.replace(/'/g, "''")}'`
}

function formatComment(comment: string, dbType: DatabaseType): string {
  switch (dbType) {
    case 'MYSQL':
      return `COMMENT '${comment.replace(/'/g, "''")}'`
    case 'POSTGRESQL':
    case 'ORACLE':
      return `-- ${comment}`
    case 'SQLSERVER':
      return `-- ${comment}`
    default:
      return ''
  }
}

function generateAlterStatements(
  tableName: string,
  columnDiffs: ColumnDiff[],
  indexDiffs: IndexDiff[],
  dbType: DatabaseType
): string[] {
  const stmts: string[] = []
  const tq = quoteName(tableName, dbType)

  for (const diff of columnDiffs) {
    switch (diff.type) {
      case 'ADD':
        if (!diff.newColumn) continue
        if (dbType === 'SQLITE' || dbType === 'POSTGRESQL' || dbType === 'ORACLE') {
          stmts.push(`ALTER TABLE ${tq} ADD ${formatColumnDef(diff.newColumn, dbType)};`)
        } else if (dbType === 'MYSQL') {
          stmts.push(`ALTER TABLE ${tq} ADD COLUMN ${formatColumnDef(diff.newColumn, dbType)};`)
        } else if (dbType === 'SQLSERVER') {
          stmts.push(`ALTER TABLE ${tq} ADD ${formatColumnDef(diff.newColumn, dbType)};`)
        }
        break
      case 'DROP':
        if (dbType === 'MYSQL') {
          stmts.push(`ALTER TABLE ${tq} DROP COLUMN ${quoteName(diff.columnName, dbType)}; -- ⚠️ 此操作不可逆`)
        } else if (dbType === 'POSTGRESQL') {
          stmts.push(`ALTER TABLE ${tq} DROP COLUMN ${quoteName(diff.columnName, dbType)}; -- ⚠️ 此操作不可逆`)
        } else if (dbType === 'SQLITE') {
          stmts.push(`-- SQLite 不支持直接删除列，需要重建表来删除列 '${diff.columnName}'`)
        } else if (dbType === 'SQLSERVER') {
          stmts.push(`ALTER TABLE ${tq} DROP COLUMN ${quoteName(diff.columnName, dbType)}; -- ⚠️ 此操作不可逆`)
        } else if (dbType === 'ORACLE') {
          stmts.push(`ALTER TABLE ${tq} DROP COLUMN ${quoteName(diff.columnName, dbType)}; -- ⚠️ 此操作不可逆`)
        }
        break
      case 'MODIFY':
        if (!diff.newColumn) continue
        if (dbType === 'MYSQL') {
          stmts.push(`ALTER TABLE ${tq} MODIFY COLUMN ${formatColumnDef(diff.newColumn, dbType)};`)
        } else if (dbType === 'POSTGRESQL') {
          const cq = quoteName(diff.columnName, dbType)
          const altParts: string[] = []
          altParts.push(`ALTER TABLE ${tq} ALTER COLUMN ${cq} TYPE ${mapDataType(diff.newColumn, dbType)}`)
          if (diff.newColumn.nullable) {
            altParts.push(`ALTER TABLE ${tq} ALTER COLUMN ${cq} DROP NOT NULL`)
          } else {
            altParts.push(`ALTER TABLE ${tq} ALTER COLUMN ${cq} SET NOT NULL`)
          }
          if (diff.newColumn.defaultValue) {
            altParts.push(`ALTER TABLE ${tq} ALTER COLUMN ${cq} SET DEFAULT ${formatDefault(diff.newColumn.defaultValue, dbType)}`)
          } else {
            altParts.push(`ALTER TABLE ${tq} ALTER COLUMN ${cq} DROP DEFAULT`)
          }
          stmts.push(altParts.map(p => p + ';').join('\n'))
        } else if (dbType === 'SQLSERVER') {
          stmts.push(`ALTER TABLE ${tq} ALTER COLUMN ${formatColumnDef(diff.newColumn, dbType)};`)
        } else if (dbType === 'ORACLE') {
          stmts.push(`ALTER TABLE ${tq} MODIFY ${formatColumnDef(diff.newColumn, dbType)};`)
        } else if (dbType === 'SQLITE') {
          stmts.push(`-- SQLite 不支持 MODIFY COLUMN，需要重建表来修改列 '${diff.columnName}'`)
        }
        break
    }
  }

  for (const diff of indexDiffs) {
    const iq = quoteName(diff.indexName, dbType)
    switch (diff.type) {
      case 'ADD': {
        if (!diff.newIndex) continue
        const indexColsStr: string = typeof diff.newIndex.columns === 'string'
          ? diff.newIndex.columns
          : Array.isArray(diff.newIndex.columns)
            ? (diff.newIndex.columns as string[]).join(',')
            : String(diff.newIndex.columns)
        const colList = indexColsStr.split(',').map((s: string) => quoteName(s.trim(), dbType)).join(', ')

        if (diff.newIndex.unique) {
          if (dbType === 'MYSQL') {
            stmts.push(`ALTER TABLE ${tq} ADD UNIQUE INDEX ${iq} (${colList});`)
          } else if (dbType === 'POSTGRESQL' || dbType === 'ORACLE') {
            stmts.push(`CREATE UNIQUE INDEX ${iq} ON ${tq} (${colList});`)
          } else if (dbType === 'SQLSERVER') {
            stmts.push(`CREATE UNIQUE INDEX ${iq} ON ${tq} (${colList});`)
          } else {
            stmts.push(`CREATE UNIQUE INDEX ${iq} ON ${tq} (${colList});`)
          }
        } else {
          if (dbType === 'MYSQL') {
            stmts.push(`ALTER TABLE ${tq} ADD INDEX ${iq} (${colList});`)
          } else {
            stmts.push(`CREATE INDEX ${iq} ON ${tq} (${colList});`)
          }
        }
        break
      }
      case 'DROP': {
        if (dbType === 'MYSQL') {
          stmts.push(`ALTER TABLE ${tq} DROP INDEX ${iq};`)
        } else if (dbType === 'POSTGRESQL' || dbType === 'ORACLE') {
          stmts.push(`DROP INDEX ${iq};`)
        } else if (dbType === 'SQLSERVER') {
          stmts.push(`DROP INDEX ${iq} ON ${tq};`)
        } else {
          stmts.push(`DROP INDEX ${iq};`)
        }
        break
      }
    }
  }

  return stmts
}

function mapPrismaTableToDDLTable(table: any): Table {
  return {
    name: table.name,
    comment: table.comment || undefined,
    columns: table.columns.map((c: any): Column => ({
      name: c.name,
      dataType: c.dataType,
      length: c.length || undefined,
      precision: c.precision || undefined,
      scale: c.scale || undefined,
      nullable: c.nullable,
      defaultValue: c.defaultValue || undefined,
      autoIncrement: c.autoIncrement,
      primaryKey: c.primaryKey,
      unique: c.unique,
      comment: c.comment || undefined
    })),
    indexes: table.indexes?.map((i: any): Index => ({
      name: i.name,
      columns: i.columns,
      unique: i.unique,
      type: i.indexType || 'BTREE'
    })) || []
  }
}

export async function getVersionProjectId(versionId: string): Promise<string | null> {
  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: { projectId: true }
  })
  return version?.projectId || null
}

export async function getProjectTables(projectId: string): Promise<Table[] | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tables: {
        include: {
          columns: true,
          indexes: true
        }
      }
    }
  })
  if (!project) return null
  return project.tables.map(mapPrismaTableToDDLTable)
}

export async function getVersionTables(versionId: string): Promise<Table[] | null> {
  const version = await prisma.version.findUnique({
    where: { id: versionId }
  })
  if (!version || !version.data) return null
  try {
    const data = JSON.parse(version.data)
    const tables = data.tables || []
    return tables.map((t: any): Table => ({
      name: t.name,
      comment: t.comment,
      columns: (t.columns || []).map((c: any): Column => ({
        name: c.name,
        dataType: c.dataType,
        length: c.length,
        precision: c.precision,
        scale: c.scale,
        nullable: c.nullable !== false,
        defaultValue: c.defaultValue,
        autoIncrement: c.autoIncrement || false,
        primaryKey: c.primaryKey || false,
        unique: c.unique || false,
        comment: c.comment
      })),
      indexes: (t.indexes || []).map((i: any): Index => ({
        name: i.name,
        columns: Array.isArray(i.columns) ? i.columns.join(',') : (i.columns || ''),
        unique: i.unique || false,
        type: i.indexType || 'BTREE'
      }))
    }))
  } catch {
    return null
  }
}