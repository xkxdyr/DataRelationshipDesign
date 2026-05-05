import { Table, Column, Relationship, Index } from '../types'
import { BaseDDLGenerator, DDLOptions } from './types'

const sqliteTypeMap: Record<string, string> = {
  'INT': 'INTEGER',
  'INTEGER': 'INTEGER',
  'BIGINT': 'INTEGER',
  'SMALLINT': 'INTEGER',
  'TINYINT': 'INTEGER',
  'VARCHAR': 'TEXT',
  'CHAR': 'TEXT',
  'TEXT': 'TEXT',
  'MEDIUMTEXT': 'TEXT',
  'LONGTEXT': 'TEXT',
  'DATE': 'TEXT',
  'DATETIME': 'TEXT',
  'TIMESTAMP': 'INTEGER',
  'TIME': 'TEXT',
  'DECIMAL': 'REAL',
  'NUMERIC': 'REAL',
  'FLOAT': 'REAL',
  'DOUBLE': 'REAL',
  'BOOLEAN': 'INTEGER',
  'BOOL': 'INTEGER',
  'BLOB': 'BLOB',
  'JSON': 'TEXT',
  'UUID': 'TEXT',
  'SERIAL': 'INTEGER PRIMARY KEY AUTOINCREMENT',
  'BIGSERIAL': 'INTEGER PRIMARY KEY AUTOINCREMENT'
}

export class SQLiteDDLGenerator extends BaseDDLGenerator {
  mapDataType(col: Column): string {
    const baseType = sqliteTypeMap[col.dataType.toUpperCase()] || col.dataType

    if (baseType === 'INTEGER PRIMARY KEY AUTOINCREMENT') {
      return baseType
    }

    return baseType
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier}"`
  }

  escapeString(str: string): string {
    return str.replace(/'/g, "''")
  }

  formatDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP'
    if (val === 'NOW()') return 'datetime("now")'
    if (!isNaN(Number(val))) return val
    return `'${this.escapeString(val)}'`
  }

  generateCreateTable(
    table: Table, 
    relationships: Relationship[], 
    tableMap: Map<string, Table>, 
    options: DDLOptions
  ): string {
    const lines: string[] = []
    const tableName = options.tablePrefix ? `${options.tablePrefix}${table.name}` : table.name

    if (options.includeDropTable) {
      lines.push(this.generateDropTable(tableName, options))
      lines.push('')
    }

    lines.push(`CREATE TABLE ${this.escapeIdentifier(tableName)} (`)

    const columnLines = (table.columns || []).map(col => this.generateColumnLine(col, options))
    lines.push(columnLines.join(',\n'))

    const pkColumns = (table.columns || []).filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      const hasSerialPK = pkColumns.some(c => c.autoIncrement)
      if (!hasSerialPK) {
        lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => this.escapeIdentifier(c.name)).join(', ')})`)
      }
    }

    const tableRelationships = relationships.filter(r => r.sourceTableId === table.id)
    tableRelationships.forEach(rel => {
      const fkLine = this.generateForeignKeyLine(rel, tableMap, options)
      if (fkLine) {
        lines.push(`,\n  ${fkLine}`)
      }
    })

    lines.push('\n);')

    table.indexes.forEach(idx => {
      lines.push('')
      lines.push(this.generateCreateIndex(idx, tableName, options))
    })

    return lines.join('\n')
  }

  generateDropTable(tableName: string, options: DDLOptions): string {
    return `DROP TABLE IF EXISTS ${this.escapeIdentifier(tableName)};`
  }

  generateCreateIndex(index: Index, tableName: string, options: DDLOptions): string {
    const columns = index.columns.map((c: string) => this.escapeIdentifier(c)).join(', ')

    if (index.unique) {
      return `CREATE UNIQUE INDEX ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(tableName)} (${columns});`
    }
    return `CREATE INDEX ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(tableName)} (${columns});`
  }

  generateDropIndex(indexName: string, tableName: string, options: DDLOptions): string {
    return `DROP INDEX IF EXISTS ${this.escapeIdentifier(indexName)};`
  }

  generateCreateRelationship(
    rel: Relationship, 
    tableMap: Map<string, Table>, 
    options: DDLOptions
  ): string {
    const sourceTable = tableMap.get(rel.sourceTableId)
    const targetTable = tableMap.get(rel.targetTableId)
    if (!sourceTable || !targetTable) return ''

    const sourceColumn = sourceTable.columns.find(c => c.id === rel.sourceColumnId)
    const targetColumn = targetTable.columns.find(c => c.id === rel.targetColumnId)
    if (!sourceColumn || !targetColumn) return ''

    const sourceTableName = options.tablePrefix ? `${options.tablePrefix}${sourceTable.name}` : sourceTable.name
    const targetTableName = options.tablePrefix ? `${options.tablePrefix}${targetTable.name}` : targetTable.name
    const constraintName = rel.name || `fk_${sourceTable.name}_${sourceColumn.name}`

    let line = `ALTER TABLE ${this.escapeIdentifier(sourceTableName)}`
    line += ` ADD CONSTRAINT ${this.escapeIdentifier(constraintName)}`
    line += ` FOREIGN KEY (${this.escapeIdentifier(sourceColumn.name)})`
    line += ` REFERENCES ${this.escapeIdentifier(targetTableName)} (${this.escapeIdentifier(targetColumn.name)})`

    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }

    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }

    line += ';'
    return line
  }

  private generateColumnLine(col: Column, options: DDLOptions): string {
    if (col.primaryKey && col.autoIncrement) {
      return `  ${this.escapeIdentifier(col.name)} INTEGER PRIMARY KEY AUTOINCREMENT`
    }

    let line = `  ${this.escapeIdentifier(col.name)} ${this.mapDataType(col)}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${this.formatDefaultValue(col)}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private generateForeignKeyLine(
    rel: Relationship, 
    tableMap: Map<string, Table>, 
    options: DDLOptions
  ): string {
    const sourceTable = tableMap.get(rel.sourceTableId)
    const targetTable = tableMap.get(rel.targetTableId)
    if (!sourceTable || !targetTable) return ''

    const sourceColumn = sourceTable.columns.find(c => c.id === rel.sourceColumnId)
    const targetColumn = targetTable.columns.find(c => c.id === rel.targetColumnId)
    if (!sourceColumn || !targetColumn) return ''

    const targetTableName = options.tablePrefix ? `${options.tablePrefix}${targetTable.name}` : targetTable.name
    const constraintName = rel.name || `fk_${sourceTable.name}_${sourceColumn.name}`

    let line = `CONSTRAINT ${this.escapeIdentifier(constraintName)}`
    line += ` FOREIGN KEY (${this.escapeIdentifier(sourceColumn.name)})`
    line += ` REFERENCES ${this.escapeIdentifier(targetTableName)} (${this.escapeIdentifier(targetColumn.name)})`

    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }

    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }

    return line
  }
}
