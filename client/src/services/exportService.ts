import { Project, Table, Column, Relationship, Index, Version } from '../types'

export interface ExportData {
  version: string
  exportedAt: string
  project: {
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
  tables: {
    id: string
    name: string
    comment?: string
    positionX: number
    positionY: number
    columns: {
      id: string
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
    }[]
    indexes: {
      id: string
      name: string
      columns: string
      unique: boolean
      type: string
    }[]
  }[]
  relationships: {
    id: string
    name?: string
    sourceTableId: string
    sourceColumnId: string
    targetTableId: string
    targetColumnId: string
    relationshipType: string
    onUpdate: string
    onDelete: string
  }[]
  versions: {
    id: string
    version: number
    name: string
    comment?: string
    data: string
    createdAt: string
  }[]
}

const typeMap: Record<string, string> = {
  'INT': 'INT',
  'BIGINT': 'BIGINT',
  'SMALLINT': 'SMALLINT',
  'TINYINT': 'TINYINT',
  'VARCHAR': 'VARCHAR',
  'CHAR': 'CHAR',
  'TEXT': 'TEXT',
  'MEDIUMTEXT': 'MEDIUMTEXT',
  'LONGTEXT': 'LONGTEXT',
  'DATE': 'DATE',
  'DATETIME': 'DATETIME',
  'TIMESTAMP': 'TIMESTAMP',
  'TIME': 'TIME',
  'DECIMAL': 'DECIMAL',
  'NUMERIC': 'NUMERIC',
  'FLOAT': 'FLOAT',
  'DOUBLE': 'DOUBLE',
  'BOOLEAN': 'TINYINT(1)',
  'BOOL': 'TINYINT(1)',
  'BLOB': 'BLOB',
  'JSON': 'JSON',
  'UUID': 'CHAR(36)'
}

function mapDataType(col: Column): string {
  const baseType = typeMap[col.dataType.toUpperCase()] || col.dataType

  if (baseType === 'VARCHAR' || baseType === 'CHAR') {
    return `${baseType}(${col.length || 255})`
  }

  if (baseType === 'DECIMAL' || baseType === 'NUMERIC') {
    const precision = col.precision || 10
    const scale = col.scale || 2
    return `${baseType}(${precision},${scale})`
  }

  return baseType
}

function escapeString(str: string): string {
  return str.replace(/'/g, "''")
}

function formatDefaultValue(col: Column): string {
  const val = col.defaultValue
  if (!val) return 'NULL'
  if (val === 'NULL') return 'NULL'
  if (val === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP'
  if (!isNaN(Number(val))) return val
  return `'${escapeString(val)}'`
}

function generateColumnLine(col: Column): string {
  let line = `  \`${col.name}\` ${mapDataType(col)}`

  if (!col.nullable) {
    line += ' NOT NULL'
  }

  if (col.autoIncrement) {
    line += ' AUTO_INCREMENT'
  }

  if (col.defaultValue !== undefined && col.defaultValue !== null) {
    line += ` DEFAULT ${formatDefaultValue(col)}`
  }

  if (col.unique && !col.primaryKey) {
    line += ' UNIQUE'
  }

  if (col.comment) {
    line += ` COMMENT '${escapeString(col.comment)}'`
  }

  return line
}

function generateIndexLine(tableName: string, idx: Index): string {
  const columns = JSON.parse(idx.columns).map((c: string) => `\`${c}\``).join(', ')
  const type = idx.type === 'FULLTEXT' ? 'FULLTEXT' : idx.type === 'HASH' ? 'HASH' : ''

  if (idx.unique) {
    return `UNIQUE KEY \`${idx.name}\` (${columns})`
  }
  return `${type} KEY \`${idx.name}\` (${columns})`.trim()
}

function generateForeignKeyLine(rel: Relationship, tableMap: Map<string, Table>): string {
  const sourceTable = tableMap.get(rel.sourceTableId)
  const targetTable = tableMap.get(rel.targetTableId)
  if (!sourceTable || !targetTable) return ''

  const sourceColumn = sourceTable.columns.find(c => c.id === rel.sourceColumnId)
  const targetColumn = targetTable.columns.find(c => c.id === rel.targetColumnId)
  if (!sourceColumn || !targetColumn) return ''

  const constraintName = rel.name || `fk_${sourceTable.name}_${sourceColumn.name}`

  let line = `CONSTRAINT \`${constraintName}\``
  line += ` FOREIGN KEY (\`${sourceColumn.name}\`)`
  line += ` REFERENCES \`${targetTable.name}\` (\`${targetColumn.name}\`)`

  if (rel.onUpdate !== 'RESTRICT') {
    line += ` ON UPDATE ${rel.onUpdate}`
  }

  if (rel.onDelete !== 'RESTRICT') {
    line += ` ON DELETE ${rel.onDelete}`
  }

  return line
}

function generateCreateTable(table: Table, relationships: Relationship[], tableMap: Map<string, Table>): string {
  const lines: string[] = []
  lines.push(`CREATE TABLE \`${table.name}\` (`)

  const columnLines = table.columns.map(col => generateColumnLine(col))
  lines.push(columnLines.join(',\n'))

  const pkColumns = table.columns.filter(c => c.primaryKey)
  if (pkColumns.length > 0) {
    lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `\`${c.name}\``).join(', ')})`)
  }

  table.indexes.forEach(idx => {
    lines.push(`,\n  ${generateIndexLine(table.name, idx)}`)
  })

  const tableRelationships = relationships.filter(
    r => r.sourceTableId === table.id
  )

  tableRelationships.forEach(rel => {
    const fkLine = generateForeignKeyLine(rel, tableMap)
    if (fkLine) {
      lines.push(`,\n  ${fkLine}`)
    }
  })

  lines.push('\n)')

  if (table.comment) {
    lines.push(` COMMENT='${escapeString(table.comment)}'`)
  }

  lines.push(';')
  return lines.join('')
}

export const exportService = {
  exportToJSON(
    project: Project,
    tables: Table[],
    relationships: Relationship[],
    versions: Version[]
  ): ExportData {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        databaseType: project.databaseType,
        status: project.status,
        version: project.version,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        createdBy: project.createdBy
      },
      tables: tables.map(table => ({
        id: table.id,
        name: table.name,
        comment: table.comment,
        positionX: table.positionX,
        positionY: table.positionY,
        columns: table.columns.map(col => ({
          id: col.id,
          name: col.name,
          dataType: col.dataType,
          length: col.length,
          precision: col.precision,
          scale: col.scale,
          nullable: col.nullable,
          defaultValue: col.defaultValue,
          autoIncrement: col.autoIncrement,
          primaryKey: col.primaryKey,
          unique: col.unique,
          comment: col.comment,
          order: col.order
        })),
        indexes: table.indexes.map(idx => ({
          id: idx.id,
          name: idx.name,
          columns: idx.columns,
          unique: idx.unique,
          type: idx.type
        }))
      })),
      relationships: relationships.map(rel => ({
        id: rel.id,
        name: rel.name,
        sourceTableId: rel.sourceTableId,
        sourceColumnId: rel.sourceColumnId,
        targetTableId: rel.targetTableId,
        targetColumnId: rel.targetColumnId,
        relationshipType: rel.relationshipType,
        onUpdate: rel.onUpdate,
        onDelete: rel.onDelete
      })),
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        name: v.name,
        comment: v.comment,
        data: v.data,
        createdAt: v.createdAt
      }))
    }
  },

  exportToSQL(
    project: Project,
    tables: Table[],
    relationships: Relationship[]
  ): string {
    const lines: string[] = []
    lines.push(`-- Database: ${project.name}`)
    lines.push(`-- Exported at: ${new Date().toISOString()}`)
    lines.push(`-- Database type: ${project.databaseType}`)
    lines.push('')

    if (project.description) {
      lines.push(`-- ${project.description}`)
      lines.push('')
    }

    const tableMap = new Map<string, Table>()
    tables.forEach(t => tableMap.set(t.id, t))

    tables.forEach(table => {
      lines.push(generateCreateTable(table, relationships, tableMap))
      lines.push('')
    })

    return lines.join('\n')
  },

  downloadJSON(data: ExportData, filename: string): void {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  downloadSQL(sql: string, filename: string): void {
    const blob = new Blob([sql], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export default exportService