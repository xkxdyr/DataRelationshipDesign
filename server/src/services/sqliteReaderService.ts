import Database from 'better-sqlite3'
import * as fs from 'fs'

export interface SqliteColumnInfo {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  defaultValue: string | null
}

export interface SqliteTableInfo {
  name: string
  columns: SqliteColumnInfo[]
  foreignKeys: Array<{
    column: string
    referencedTable: string
    referencedColumn: string
  }>
  indexes: Array<{
    name: string
    columns: string[]
    unique: boolean
  }>
}

export interface SqliteReadResult {
  success: boolean
  message: string
  tables?: SqliteTableInfo[]
}

function parseColumnDef(columnDef: string): { name: string; type: string } {
  const match = columnDef.match(/^[\["`]?(\w+)[\]"`]?\s+(\w[\w\s()]*?)(?:\s|$)/i)
  if (match) {
    return { name: match[1], type: match[2].trim().toUpperCase() }
  }
  const parts = columnDef.trim().split(/\s+/)
  return { name: parts[0].replace(/[\["`]/g, '').replace(/[\]"`]/g, ''), type: parts[1]?.toUpperCase() || 'TEXT' }
}

function parseCreateTable(sql: string): { columns: SqliteColumnInfo[]; primaryKeys: string[] } {
  const columns: SqliteColumnInfo[] = []
  const primaryKeys: string[] = []

  const bodyMatch = sql.match(/\(([\s\S]*)\)\s*;?\s*$/i)
  if (!bodyMatch) return { columns, primaryKeys }

  const body = bodyMatch[1]

  const colRegex = /([^,]+?)(?=,(?![^(]*\))|$)/g
  let colMatch: RegExpExecArray | null
  const rawColumns: string[] = []

  while ((colMatch = colRegex.exec(body)) !== null) {
    rawColumns.push(colMatch[1].trim())
  }

  if (rawColumns.length === 0) {
    rawColumns.push(...body.split(',').map(s => s.trim()))
  }

  for (const raw of rawColumns) {
    const trimmed = raw.trim().replace(/^\s*|\s*$/g, '')
    if (!trimmed) continue

    const upperLine = trimmed.toUpperCase()

    if (upperLine.startsWith('PRIMARY KEY') || upperLine.startsWith('FOREIGN KEY') ||
        upperLine.startsWith('UNIQUE') || upperLine.startsWith('CHECK') ||
        upperLine.startsWith('CONSTRAINT')) {
      if (upperLine.startsWith('PRIMARY KEY')) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
        if (pkMatch) {
          primaryKeys.push(...pkMatch[1].split(',').map(k => k.trim().replace(/[\["`]/g, '').replace(/[\]"`]/g, '')))
        }
      }
      continue
    }

    const { name, type } = parseColumnDef(trimmed)

    if (!name) continue

    const upper = trimmed.toUpperCase()
    const nullable = !upper.includes('NOT NULL')
    const primaryKey = upper.includes('PRIMARY KEY')
    const autoIncrement = upper.includes('AUTOINCREMENT')

    const defaultMatch = trimmed.match(/DEFAULT\s+(.+?)(?:\s|$)/i)
    const defaultValue = defaultMatch ? defaultMatch[1].replace(/['"]/g, '').trim() : null

    columns.push({
      name: name.replace(/[\["`]/g, '').replace(/[\]"`]/g, ''),
      type: autoIncrement ? 'INTEGER' : type,
      nullable,
      primaryKey: primaryKey || false,
      defaultValue
    })

    if (primaryKey) {
      primaryKeys.push(name)
    }
  }

  return { columns, primaryKeys }
}

export const sqliteReaderService = {
  readFromFile(filePath: string): SqliteReadResult {
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `文件不存在: ${filePath}` }
    }

    let db: Database.Database
    try {
      db = new Database(filePath, { readonly: true })
    } catch (err) {
      return { success: false, message: `无法打开数据库文件: ${(err as Error).message}` }
    }

    try {
      const tables: SqliteTableInfo[] = []

      const tableRows = db.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
      ).all() as Array<{ name: string; sql: string | null }>

      for (const row of tableRows) {
        const columns: SqliteColumnInfo[] = []
        const foreignKeys: SqliteTableInfo['foreignKeys'] = []
        const indexes: SqliteTableInfo['indexes'] = []
        const primaryKeys: string[] = []

        if (row.sql) {
          const parsed = parseCreateTable(row.sql)
          columns.push(...parsed.columns)
          primaryKeys.push(...parsed.primaryKeys)
        }

        const tableInfo = db.prepare(`PRAGMA table_info("${row.name}")`).all() as Array<{
          cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number
        }>

        if (tableInfo.length > 0 && columns.length === 0) {
          for (const col of tableInfo) {
            columns.push({
              name: col.name,
              type: col.type.toUpperCase(),
              nullable: col.notnull === 0,
              primaryKey: col.pk === 1,
              defaultValue: col.dflt_value
            })
            if (col.pk === 1) primaryKeys.push(col.name)
          }
        }

        for (const col of columns) {
          if (primaryKeys.includes(col.name)) {
            col.primaryKey = true
          }
        }

        try {
          const fkList = db.prepare(`PRAGMA foreign_key_list("${row.name}")`).all() as Array<{
            id: number; seq: number; table: string; from: string; to: string
          }>
          for (const fk of fkList) {
            foreignKeys.push({
              column: fk.from,
              referencedTable: fk.table,
              referencedColumn: fk.to
            })
          }
        } catch {
          // foreign_key_list not available in some SQLite builds
        }

        try {
          const indexList = db.prepare(`PRAGMA index_list("${row.name}")`).all() as Array<{
            seq: number; name: string; unique: number; origin: string; partial: number
          }>
          for (const idx of indexList) {
            if (idx.origin === 'pk') continue
            const idxInfo = db.prepare(`PRAGMA index_info("${idx.name}")`).all() as Array<{
              seqno: number; cid: number; name: string
            }>
            indexes.push({
              name: idx.name,
              columns: idxInfo.map(i => i.name),
              unique: idx.unique === 1
            })
          }
        } catch {
          // ignore index errors
        }

        tables.push({
          name: row.name,
          columns,
          foreignKeys,
          indexes
        })
      }

      return {
        success: true,
        message: `成功读取 ${tables.length} 个表`,
        tables
      }
    } catch (err) {
      return { success: false, message: `读取数据库结构失败: ${(err as Error).message}` }
    } finally {
      try { db.close() } catch { /* ignore */ }
    }
  }
}