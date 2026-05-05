import { Table, Column, Relationship, Index } from '../types'
import { BaseDDLGenerator, DDLOptions } from './types'

const postgreSQLTypeMap: Record<string, string> = {
  'INT': 'INTEGER',
  'INTEGER': 'INTEGER',
  'BIGINT': 'BIGINT',
  'SMALLINT': 'SMALLINT',
  'TINYINT': 'SMALLINT',
  'VARCHAR': 'VARCHAR',
  'CHAR': 'CHAR',
  'TEXT': 'TEXT',
  'MEDIUMTEXT': 'TEXT',
  'LONGTEXT': 'TEXT',
  'DATE': 'DATE',
  'DATETIME': 'TIMESTAMP',
  'TIMESTAMP': 'TIMESTAMP',
  'TIME': 'TIME',
  'DECIMAL': 'DECIMAL',
  'NUMERIC': 'NUMERIC',
  'FLOAT': 'REAL',
  'DOUBLE': 'DOUBLE PRECISION',
  'BOOLEAN': 'BOOLEAN',
  'BOOL': 'BOOLEAN',
  'BLOB': 'BYTEA',
  'JSON': 'JSONB',
  'UUID': 'UUID',
  'SERIAL': 'SERIAL',
  'BIGSERIAL': 'BIGSERIAL'
}

export class PostgreSQLDDLGenerator extends BaseDDLGenerator {
  mapDataType(col: Column): string {
    const baseType = postgreSQLTypeMap[col.dataType.toUpperCase()] || col.dataType

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
    if (val === 'NOW()') return 'NOW()'
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
    const schemaName = options.schema || 'public'
    const qualifiedTableName = `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(tableName)}`

    if (options.includeDropTable) {
      lines.push(this.generateDropTable(tableName, options))
      lines.push('')
    }

    lines.push(`CREATE TABLE ${qualifiedTableName} (`)

    const columnLines = (table.columns || []).map(col => this.generateColumnLine(col, options))
    lines.push(columnLines.join(',\n'))

    const pkColumns = (table.columns || []).filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => this.escapeIdentifier(c.name)).join(', ')})`)
    }

    (table.indexes || []).forEach(idx => {
      const indexLine = this.generateIndexLine(idx, tableName, options)
      if (indexLine) {
        lines.push(`,\n  ${indexLine}`)
      }
    })

    const tableRelationships = relationships.filter(r => r.sourceTableId === table.id)
    tableRelationships.forEach(rel => {
      const fkLine = this.generateForeignKeyLine(rel, tableMap, options)
      if (fkLine) {
        lines.push(`,\n  ${fkLine}`)
      }
    })

    lines.push('\n);')

    if (options.includeComments) {
      if (table.comment) {
        lines.push(`COMMENT ON TABLE ${qualifiedTableName} IS '${this.escapeString(table.comment)}';`)
      }
      table.columns.forEach(col => {
        if (col.comment) {
          lines.push(`COMMENT ON COLUMN ${qualifiedTableName}.${this.escapeIdentifier(col.name)} IS '${this.escapeString(col.comment)}';`)
        }
      })
    }

    return lines.join('\n')
  }

  generateDropTable(tableName: string, options: DDLOptions): string {
    const schemaName = options.schema || 'public'
    const qualifiedTableName = `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(tableName)}`
    return `DROP TABLE IF EXISTS ${qualifiedTableName};`
  }

  generateCreateIndex(index: Index, tableName: string, options: DDLOptions): string {
    const schemaName = options.schema || 'public'
    const qualifiedTableName = `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(tableName)}`
    const columns = index.columns.map((c: string) => this.escapeIdentifier(c)).join(', ')

    let indexType = ''
    if (index.type === 'HASH') {
      indexType = 'USING HASH'
    }

    if (index.unique) {
      return `CREATE UNIQUE INDEX ${this.escapeIdentifier(index.name)} ${indexType} ON ${qualifiedTableName} (${columns});`
    }
    return `CREATE INDEX ${this.escapeIdentifier(index.name)} ${indexType} ON ${qualifiedTableName} (${columns});`.trim()
  }

  generateDropIndex(indexName: string, tableName: string, options: DDLOptions): string {
    const schemaName = options.schema || 'public'
    return `DROP INDEX IF EXISTS ${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(indexName)};`
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

    const schemaName = options.schema || 'public'
    const sourceTableName = options.tablePrefix ? `${options.tablePrefix}${sourceTable.name}` : sourceTable.name
    const targetTableName = options.tablePrefix ? `${options.tablePrefix}${targetTable.name}` : targetTable.name
    const qualifiedSourceTable = `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(sourceTableName)}`
    const qualifiedTargetTable = `${this.escapeIdentifier(schemaName)}.${this.escapeIdentifier(targetTableName)}`
    const constraintName = rel.name || `fk_${sourceTable.name}_${sourceColumn.name}`

    let line = `ALTER TABLE ${qualifiedSourceTable}`
    line += ` ADD CONSTRAINT ${this.escapeIdentifier(constraintName)}`
    line += ` FOREIGN KEY (${this.escapeIdentifier(sourceColumn.name)})`
    line += ` REFERENCES ${qualifiedTargetTable} (${this.escapeIdentifier(targetColumn.name)})`

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
    let line = `  ${this.escapeIdentifier(col.name)} ${this.mapDataType(col)}`

    if (col.autoIncrement && !col.primaryKey) {
      line += ' GENERATED BY DEFAULT AS IDENTITY'
    } else if (col.autoIncrement && col.primaryKey) {
      return `  ${this.escapeIdentifier(col.name)} SERIAL PRIMARY KEY`
    }

    if (!col.autoIncrement) {
      if (!col.nullable) {
        line += ' NOT NULL'
      }

      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        line += ` DEFAULT ${this.formatDefaultValue(col)}`
      }

      if (col.unique && !col.primaryKey) {
        line += ' UNIQUE'
      }
    }

    return line
  }

  private generateIndexLine(idx: Index, tableName: string, options: DDLOptions): string {
    const columns = idx.columns.map((c: string) => this.escapeIdentifier(c)).join(', ')

    if (idx.unique) {
      return `UNIQUE KEY ${this.escapeIdentifier(idx.name)} (${columns})`
    }
    return `KEY ${this.escapeIdentifier(idx.name)} (${columns})`
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
