export interface Column {
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

export interface Index {
  name: string
  columns: string
  unique: boolean
  type: string
}

export interface Table {
  name: string
  comment?: string
  columns: Column[]
  indexes: Index[]
}

export interface Relationship {
  sourceTableName: string
  sourceColumnName: string
  targetTableName: string
  targetColumnName: string
  relationshipType: string
  onUpdate: string
  onDelete: string
  name?: string
}

export class MysqlDDLGenerator {
  private static typeMap: Record<string, string> = {
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

  static mapDataType(col: Column): string {
    const baseType = this.typeMap[col.dataType.toUpperCase()] || col.dataType
    
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

  static generateCreateTable(table: Table, relationships?: Relationship[]): string {
    const lines: string[] = []
    lines.push(`CREATE TABLE \`${table.name}\` (`)
    
    const columnLines = table.columns.map(col => this.generateColumnLine(col))
    lines.push(columnLines.join(',\n'))
    
    const pkColumns = table.columns.filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `\`${c.name}\``).join(', ')})`)
    }
    
    table.indexes.forEach(idx => {
      lines.push(`,\n  ${this.generateIndexLine(table.name, idx)}`)
    })
    
    const tableRelationships = relationships?.filter(
      r => r.sourceTableName === table.name
    ) || []
    
    tableRelationships.forEach(rel => {
      lines.push(`,\n  ${this.generateForeignKeyLine(rel)}`)
    })
    
    lines.push('\n)')
    
    if (table.comment) {
      lines.push(` COMMENT='${this.escapeString(table.comment)}'`)
    }
    
    lines.push(';')
    return lines.join('')
  }

  static generateColumnLine(col: Column): string {
    let line = `  \`${col.name}\` ${this.mapDataType(col)}`
    
    if (!col.nullable) {
      line += ' NOT NULL'
    }
    
    if (col.autoIncrement) {
      line += ' AUTO_INCREMENT'
    }
    
    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${this.formatDefaultValue(col)}`
    }
    
    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }
    
    if (col.comment) {
      line += ` COMMENT '${this.escapeString(col.comment)}'`
    }
    
    return line
  }

  static formatDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP'
    if (!isNaN(Number(val))) return val
    return `'${this.escapeString(val)}'`
  }

  static generateIndexLine(tableName: string, idx: Index): string {
    const columns = JSON.parse(idx.columns).map((c: string) => `\`${c}\``).join(', ')
    const type = idx.type === 'FULLTEXT' ? 'FULLTEXT' : idx.type === 'HASH' ? 'HASH' : ''
    
    if (idx.unique) {
      return `UNIQUE KEY \`${idx.name}\` (${columns})`
    }
    return `${type} KEY \`${idx.name}\` (${columns})`.trim()
  }

  static generateForeignKeyLine(rel: Relationship): string {
    const constraintName = rel.name || `fk_${rel.sourceTableName}_${rel.sourceColumnName}`
    
    let line = `CONSTRAINT \`${constraintName}\``
    line += ` FOREIGN KEY (\`${rel.sourceColumnName}\`)`
    line += ` REFERENCES \`${rel.targetTableName}\` (\`${rel.targetColumnName}\`)`
    
    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }
    
    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }
    
    return line
  }

  static generateDropTable(tableName: string): string {
    return `DROP TABLE IF EXISTS \`${tableName}\`;`
  }

  static generateAllTables(tables: Table[], relationships?: Relationship[]): string {
    const ddls = tables.map(t => this.generateCreateTable(t, relationships))
    return ddls.join('\n\n')
  }

  static escapeString(str: string): string {
    return str.replace(/'/g, "''")
  }
}
