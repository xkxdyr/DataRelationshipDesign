import { Table, Column, Relationship, Project } from '../types/index'

interface ParsedTable {
  name: string
  comment?: string
  columns: ParsedColumn[]
  indexes: ParsedIndex[]
}

interface ParsedColumn {
  name: string
  dataType: string
  length?: number
  precision?: number
  scale?: number
  nullable: boolean
  autoIncrement: boolean
  primaryKey: boolean
  unique: boolean
  defaultValue?: string
  comment?: string
}

interface ParsedIndex {
  name: string
  columns: string[]
  unique: boolean
  type: string
}

export interface ImportResult {
  success: boolean
  project?: Partial<Project>
  tables?: Partial<Table>[]
  relationships?: Partial<Relationship>[]
  columns?: Partial<Column>[]
  errors?: string[]
  warnings?: string[]
}

export interface ImportConflictOption {
  type: 'create_new' | 'overwrite' | 'skip'
  projectId?: string
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
  
  const intMatch = upper.match(/^(?:TINYINT|SMALLINT|INT|BIGINT)/i)
  if (intMatch) {
    return { dataType: intMatch[0].toUpperCase() }
  }
  
  if (upper.startsWith('ENUM')) {
    return { dataType: 'ENUM' }
  }
  
  const simpleTypes: Record<string, string> = {
    'TEXT': 'TEXT',
    'DATE': 'DATE',
    'DATETIME': 'DATETIME',
    'TIMESTAMP': 'TIMESTAMP',
    'TIME': 'TIME',
    'FLOAT': 'FLOAT',
    'DOUBLE': 'DOUBLE'
  }
  
  for (const [key, value] of Object.entries(simpleTypes)) {
    if (upper.startsWith(key)) {
      return { dataType: value }
    }
  }
  
  return { dataType: 'VARCHAR' }
}

function parseCreateTable(sql: string): ParsedTable[] {
  const tables: ParsedTable[] = []
  const upperSql = sql.toUpperCase()
  
  console.log('🔍 开始解析 SQL...')
  
  const sqlWithoutComments = sql.replace(/\/\*[\s\S]*?\*\//g, '')
  const statements = sqlWithoutComments.split(';')
  
  for (const stmt of statements) {
    const trimmedStmt = stmt.trim()
    if (!trimmedStmt.toUpperCase().startsWith('CREATE TABLE')) {
      continue
    }
    
    try {
      const tableNameMatch = trimmedStmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([\w_]+)`?/i)
      if (!tableNameMatch) {
        continue
      }
      const tableName = tableNameMatch[1]
      console.log(`📋 找到表: ${tableName}`)
      
      const columnsStart = trimmedStmt.indexOf('(')
      const columnsEnd = trimmedStmt.lastIndexOf(')')
      if (columnsStart === -1 || columnsEnd === -1) {
        continue
      }
      
      const columnsStr = trimmedStmt.substring(columnsStart + 1, columnsEnd)
      const columns: ParsedColumn[] = []
      const indexes: ParsedIndex[] = []
      const primaryKeys: string[] = []
      
      const definitions: string[] = []
      let current = ''
      let depth = 0
      
      for (let i = 0; i < columnsStr.length; i++) {
        const char = columnsStr[i]
        if (char === '(') depth++
        if (char === ')') depth--
        
        if (char === ',' && depth === 0) {
          definitions.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      if (current.trim()) {
        definitions.push(current.trim())
      }
      
      console.log(`  找到 ${definitions.length} 个定义`)
      
      for (const def of definitions) {
        if (!def.trim()) continue
        
        const upperDef = def.toUpperCase()
        
        if (upperDef.includes('PRIMARY KEY')) {
          const pkMatch = def.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
          if (pkMatch) {
            const pkCols = pkMatch[1].split(',').map(col => col.trim().replace(/`/g, ''))
            primaryKeys.push(...pkCols)
            console.log(`  🔑 主键: ${pkCols.join(', ')}`)
          }
          continue
        }
        
        if (upperDef.startsWith('FOREIGN KEY') || upperDef.startsWith('CONSTRAINT') || upperDef.startsWith('CHECK')) {
          continue
        }
        
        if (upperDef.includes('KEY') || upperDef.includes('INDEX')) {
          continue
        }
        
        try {
          let colName = ''
          
          if (def.startsWith('`')) {
            const endQuote = def.indexOf('`', 1)
            if (endQuote > -1) {
              colName = def.substring(1, endQuote)
            }
          } else {
            const firstSpace = def.indexOf(' ')
            if (firstSpace > -1) {
              colName = def.substring(0, firstSpace)
            }
          }
          
          if (!colName) {
            continue
          }
          
          const typeMatch = def.match(/`?[\w_]+`?\s+([\w]+)(?:\s*\(([\s\S]*?)\))?/i)
          if (!typeMatch) {
            continue
          }
          
          const typeName = typeMatch[1]
          let typeStr = typeName
          if (typeMatch[2]) {
            typeStr = `${typeName}(${typeMatch[2]})`
          }
          
          const typeInfo = parseDataType(typeStr)
          
          const nullable = !upperDef.includes('NOT NULL')
          const autoIncrement = upperDef.includes('AUTO_INCREMENT')
          const unique = upperDef.includes('UNIQUE') && !upperDef.includes('PRIMARY KEY')
          
          let defaultValue: string | undefined
          const defaultMatch = def.match(/DEFAULT\s+(?:(NULL)|'([^']*)'|"([^"]*)")/i)
          if (defaultMatch) {
            defaultValue = defaultMatch[1] || defaultMatch[2] || defaultMatch[3]
          }
          
          let comment: string | undefined
          const commentMatch = def.match(/COMMENT\s+(?:'([^']*)'|"([^"]*)")/i)
          if (commentMatch) {
            comment = commentMatch[1] || commentMatch[2]
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
          
          console.log(`  ✅ 列: ${colName} (${typeInfo.dataType})`)
        } catch (e) {
          console.log(`  ❌ 跳过: ${def.substring(0, 50)}...`)
        }
      }
      
      for (const col of columns) {
        if (primaryKeys.includes(col.name)) {
          col.primaryKey = true
          col.nullable = false
        }
      }
      
      let tableComment: string | undefined
      const commentMatch = trimmedStmt.match(/COMMENT\s*=\s*(?:'([^']*)'|"([^"]*)")/i)
      if (commentMatch) {
        tableComment = commentMatch[1] || commentMatch[2]
      }
      
      tables.push({
        name: tableName,
        comment: tableComment,
        columns,
        indexes
      })
      
      console.log(`✅ 表 ${tableName} 完成！${columns.length} 列`)
    } catch (e) {
      console.error(`解析表失败`, e)
    }
  }
  
  return tables
}

export const importService = {
  async importFromJSON(file: File, conflictOption: ImportConflictOption = { type: 'create_new' }): Promise<ImportResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      const text = await file.text()
      const data: any = JSON.parse(text)
      
      if (!data.version || !data.project || !data.tables) {
        errors.push('无效的JSON格式，缺少必要字段')
        return { success: false, errors }
      }
      
      const tables: Partial<Table>[] = data.tables.map((t: any) => ({
        ...t,
        id: t.id || `import_table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
      
      const columns: Partial<Column>[] = (data.columns || []).map((c: any) => ({
        ...c,
        id: c.id || `import_col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
      
      const relationships: Partial<Relationship>[] = (data.relationships || []).map((r: any) => ({
        ...r,
        id: r.id || `import_rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
      
      const project: Partial<Project> = {
        ...data.project,
        id: conflictOption.projectId || `import_proj_${Date.now()}`
      }
      
      return {
        success: true,
        project,
        tables,
        columns,
        relationships,
        warnings
      }
    } catch (e) {
      errors.push(`解析JSON失败: ${e instanceof Error ? e.message : '未知错误'}`)
      return { success: false, errors }
    }
  },
  
  async importFromSQL(file: File, options?: { projectName?: string, databaseType?: string }): Promise<ImportResult> {
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
      
      const dbType = 'MYSQL'
      
      const project: Partial<Project> = {
        id: projectId,
        name: options?.projectName || fileName,
        description: `从 SQL 文件导入: ${file.name}`,
        databaseType: dbType as any,
        status: 'active',
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'import'
      }
      
      const tables: Partial<Table>[] = parsedTables.map((t, idx) => ({
        id: `import_table_${Date.now()}_${idx}`,
        name: t.name,
        comment: t.comment,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        x: 100 + (idx % 4) * 300,
        y: 100 + Math.floor(idx / 4) * 250,
        width: 250,
        height: 200
      }))
      
      const columns: Partial<Column>[] = []
      
      parsedTables.forEach((pt, tableIdx) => {
        const table = tables[tableIdx]
        pt.columns.forEach((pc, colIdx) => {
          const columnId = `import_col_${Date.now()}_${tableIdx}_${colIdx}`
          columns.push({
            id: columnId,
            tableId: table.id!,
            name: pc.name,
            dataType: pc.dataType,
            length: pc.length,
            precision: pc.precision,
            scale: pc.scale,
            nullable: pc.nullable,
            primaryKey: pc.primaryKey,
            unique: pc.unique,
            autoIncrement: pc.autoIncrement,
            defaultValue: pc.defaultValue,
            comment: pc.comment,
            order: colIdx,
            createdAt: now,
            updatedAt: now
          })
        })
      })
      
      return {
        success: true,
        project,
        tables,
        columns,
        relationships: [],
        warnings
      }
    } catch (e) {
      errors.push(`解析SQL失败: ${e instanceof Error ? e.message : '未知错误'}`)
      return { success: false, errors }
    }
  }
}
