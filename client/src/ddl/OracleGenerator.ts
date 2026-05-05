import { Table, Column, Relationship, Index } from '../types'
import { BaseDDLGenerator, DDLOptions } from './types'

const oracleTypeMap: Record<string, string> = {
  'INT': 'NUMBER(10)',
  'BIGINT': 'NUMBER(19)',
  'SMALLINT': 'NUMBER(5)',
  'TINYINT': 'NUMBER(3)',
  'VARCHAR': 'VARCHAR2',
  'CHAR': 'CHAR',
  'TEXT': 'CLOB',
  'MEDIUMTEXT': 'CLOB',
  'LONGTEXT': 'CLOB',
  'DATE': 'DATE',
  'DATETIME': 'DATE',
  'TIMESTAMP': 'TIMESTAMP',
  'TIME': 'INTERVAL DAY TO SECOND',
  'DECIMAL': 'NUMBER',
  'NUMERIC': 'NUMBER',
  'FLOAT': 'FLOAT',
  'DOUBLE': 'FLOAT',
  'BOOLEAN': 'NUMBER(1)',
  'BOOL': 'NUMBER(1)',
  'BLOB': 'BLOB',
  'JSON': 'CLOB',
  'UUID': 'RAW(16)'
}

export class OracleDDLGenerator extends BaseDDLGenerator {
  mapDataType(col: Column): string {
    const baseType = oracleTypeMap[col.dataType.toUpperCase()] || col.dataType

    if (baseType === 'VARCHAR2' || baseType === 'CHAR') {
      return `${baseType}(${col.length || 255})`
    }

    if (baseType === 'NUMBER' && (col.precision || col.scale)) {
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
    if (val === 'CURRENT_TIMESTAMP') return 'SYSTIMESTAMP'
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

    lines.push('\n)')

    if (options.includeComments && table.comment) {
      lines.push(`\nCOMMENT ON TABLE ${this.escapeIdentifier(tableName)} IS '${this.escapeString(table.comment)}';`)
    }

    lines.push(';')
    return lines.join('\n')
  }

  generateDropTable(tableName: string, options: DDLOptions): string {
    return `DROP TABLE ${this.escapeIdentifier(tableName)} CASCADE CONSTRAINTS;`
  }

  generateCreateIndex(index: Index, tableName: string, options: DDLOptions): string {
    const columns = index.columns.map((c: string) => this.escapeIdentifier(c)).join(', ')

    if (index.unique) {
      return `CREATE UNIQUE INDEX ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(tableName)} (${columns});`
    }
    return `CREATE INDEX ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(tableName)} (${columns});`
  }

  generateDropIndex(indexName: string, tableName: string, options: DDLOptions): string {
    return `DROP INDEX ${this.escapeIdentifier(indexName)};`
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
    const constraintName = rel.name || `FK_${sourceTable.name}_${sourceColumn.name}`

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

  private generateIndexLine(idx: Index, tableName: string, options: DDLOptions): string {
    const columns = idx.columns.map((c: string) => this.escapeIdentifier(c)).join(', ')

    if (idx.unique) {
      return `CONSTRAINT ${this.escapeIdentifier(idx.name)} UNIQUE (${columns})`
    }
    return `INDEX ${this.escapeIdentifier(idx.name)} (${columns})`
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
    const constraintName = rel.name || `FK_${sourceTable.name}_${sourceColumn.name}`

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
