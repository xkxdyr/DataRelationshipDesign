import { Column, Table, Relationship, Index } from './ddlGenerator'
import { DatabaseType, databaseTypeLabels } from './typeConverter'
import { mapDataType, formatDefaultValue, escapeString } from './ddlTypeMapper'

export { DatabaseType, databaseTypeLabels }

export class MultiDDLGenerator {
  private dbType: DatabaseType

  constructor(dbType: DatabaseType = 'MYSQL') {
    this.dbType = dbType
  }

  setDatabaseType(dbType: DatabaseType): void {
    this.dbType = dbType
  }

  getDatabaseType(): DatabaseType {
    return this.dbType
  }

  generateCreateTable(table: Table, relationships?: Relationship[]): string {
    switch (this.dbType) {
      case 'MYSQL':
        return this.generateMySQLCreateTable(table, relationships)
      case 'POSTGRESQL':
        return this.generatePostgreSQLCreateTable(table, relationships)
      case 'SQLITE':
        return this.generateSQLiteCreateTable(table, relationships)
      case 'SQLSERVER':
        return this.generateSQLServerCreateTable(table, relationships)
      case 'ORACLE':
        return this.generateOracleCreateTable(table, relationships)
      default:
        return this.generateMySQLCreateTable(table, relationships)
    }
  }

  generateAllTables(tables: Table[], relationships?: Relationship[]): string {
    return tables.map(t => this.generateCreateTable(t, relationships)).join('\n\n')
  }

  generateDropTable(tableName: string): string {
    switch (this.dbType) {
      case 'MYSQL':
      case 'POSTGRESQL':
      case 'SQLITE':
        return `DROP TABLE IF EXISTS \`${tableName}\`;`
      case 'SQLSERVER':
        return `IF OBJECT_ID('${tableName}', 'U') IS NOT NULL DROP TABLE ${tableName};`
      case 'ORACLE':
        return `DROP TABLE "${tableName}" CASCADE CONSTRAINTS;`
      default:
        return `DROP TABLE IF EXISTS \`${tableName}\`;`
    }
  }

  private generateMySQLCreateTable(table: Table, relationships?: Relationship[]): string {
    const lines: string[] = []
    lines.push(`CREATE TABLE \`${table.name}\` (`)

    const columnLines = table.columns.map(col => this.generateMySQLColumnLine(col))
    lines.push(columnLines.join(',\n'))

    const pkColumns = table.columns.filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `\`${c.name}\``).join(', ')})`)
    }

    table.indexes.forEach(idx => {
      lines.push(`,\n  ${this.generateMySQLIndexLine(table.name, idx)}`)
    })

    const tableRelationships = relationships?.filter(r => r.sourceTableName === table.name) || []
    tableRelationships.forEach(rel => {
      lines.push(`,\n  ${this.generateMySQLForeignKeyLine(rel)}`)
    })

    lines.push('\n)')

    if (table.comment) {
      lines.push(` COMMENT='${escapeString(table.comment)}'`)
    }

    lines.push(';')
    return lines.join('')
  }

  private generateMySQLColumnLine(col: Column): string {
    let line = `  \`${col.name}\` ${mapDataType(col, 'MYSQL')}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.autoIncrement) {
      line += ' AUTO_INCREMENT'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${formatDefaultValue(col, 'MYSQL')}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    if (col.comment) {
      line += ` COMMENT '${escapeString(col.comment)}'`
    }

    return line
  }

  private generateMySQLIndexLine(tableName: string, idx: Index): string {
    const columns = JSON.parse(idx.columns).map((c: string) => `\`${c}\``).join(', ')
    const type = idx.type === 'FULLTEXT' ? 'FULLTEXT' : idx.type === 'HASH' ? 'HASH' : ''

    if (idx.unique) {
      return `UNIQUE KEY \`${idx.name}\` (${columns})`
    }
    return `${type} KEY \`${idx.name}\` (${columns})`.trim()
  }

  private generateMySQLForeignKeyLine(rel: Relationship): string {
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

  private generatePostgreSQLCreateTable(table: Table, relationships?: Relationship[]): string {
    const lines: string[] = []
    lines.push(`CREATE TABLE "${table.name}" (`)

    const columnLines = table.columns.map(col => this.generatePostgreSQLColumnLine(col))
    lines.push(columnLines.join(',\n'))

    const pkColumns = table.columns.filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `"${c.name}"`).join(', ')})`)
    }

    table.indexes.forEach(idx => {
      const columns = JSON.parse(idx.columns).map((c: string) => `"${c}"`).join(', ')
      if (idx.unique) {
        lines.push(`,\n  CONSTRAINT "${idx.name}" UNIQUE (${columns})`)
      } else {
        lines.push(`,\n  INDEX "${idx.name}" USING ${idx.type || 'BTREE'} (${columns})`)
      }
    })

    const tableRelationships = relationships?.filter(r => r.sourceTableName === table.name) || []
    tableRelationships.forEach(rel => {
      lines.push(`,\n  ${this.generatePostgreSQLForeignKeyLine(rel)}`)
    })

    lines.push('\n)')

    if (table.comment) {
      lines.push(`\nCOMMENT ON TABLE "${table.name}" IS '${escapeString(table.comment)}'`)
    }

    lines.push(';')
    return lines.join('')
  }

  private generatePostgreSQLColumnLine(col: Column): string {
    let line = `  "${col.name}" ${mapDataType(col, 'POSTGRESQL')}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.autoIncrement) {
      const baseType = col.dataType.toUpperCase()
      if (baseType === 'INT' || baseType === 'BIGINT') {
        line = `  "${col.name}" ${col.dataType.toUpperCase() === 'BIGINT' ? 'BIGSERIAL' : 'SERIAL'}`
      } else {
        line += ` DEFAULT nextval('${col.name}_seq'::regclass)`
      }
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${formatDefaultValue(col, 'POSTGRESQL')}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private generatePostgreSQLForeignKeyLine(rel: Relationship): string {
    const constraintName = rel.name || `fk_${rel.sourceTableName}_${rel.sourceColumnName}`

    let line = `CONSTRAINT "${constraintName}" FOREIGN KEY ("${rel.sourceColumnName}")`
    line += ` REFERENCES "${rel.targetTableName}" ("${rel.targetColumnName}")`

    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }

    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }

    return line
  }

  private generateSQLiteCreateTable(table: Table, relationships?: Relationship[]): string {
    const lines: string[] = []
    lines.push(`CREATE TABLE "${table.name}" (`)

    const columnLines = table.columns.map(col => this.generateSQLiteColumnLine(col))
    lines.push(columnLines.join(',\n'))

    const pkColumns = table.columns.filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `"${c.name}"`).join(', ')})`)
    }

    const tableRelationships = relationships?.filter(r => r.sourceTableName === table.name) || []
    tableRelationships.forEach(rel => {
      lines.push(`,\n  ${this.generateSQLiteForeignKeyLine(rel)}`)
    })

    lines.push('\n)')

    if (table.comment) {
      lines.push(`; -- ${escapeString(table.comment)}`)
    } else {
      lines.push(';')
    }

    return lines.join('')
  }

  private generateSQLiteColumnLine(col: Column): string {
    let line = `  "${col.name}" ${mapDataType(col, 'SQLITE')}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${formatDefaultValue(col, 'SQLITE')}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private generateSQLiteForeignKeyLine(rel: Relationship): string {
    let line = `FOREIGN KEY ("${rel.sourceColumnName}")`
    line += ` REFERENCES "${rel.targetTableName}" ("${rel.targetColumnName}")`

    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }

    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }

    return line
  }

  private generateSQLServerCreateTable(table: Table, relationships?: Relationship[]): string {
    const lines: string[] = []
    lines.push(`CREATE TABLE [${table.name}] (`)

    const columnLines = table.columns.map(col => this.generateSQLServerColumnLine(col))
    lines.push(columnLines.join(',\n'))

    const pkColumns = table.columns.filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `[${c.name}]`).join(', ')})`)
    }

    table.indexes.forEach(idx => {
      lines.push(`,\n  ${this.generateSQLServerIndexLine(table.name, idx)}`)
    })

    const tableRelationships = relationships?.filter(r => r.sourceTableName === table.name) || []
    tableRelationships.forEach(rel => {
      lines.push(`,\n  ${this.generateSQLServerForeignKeyLine(rel)}`)
    })

    lines.push('\n)')

    if (table.comment) {
      lines.push(`\nEXEC sp_addextendedproperty @name = N'MS_Description', @value = N'${escapeString(table.comment)}', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'${table.name}';`)
    }

    lines.push('')
    return lines.join('\n')
  }

  private generateSQLServerColumnLine(col: Column): string {
    let line = `  [${col.name}] ${mapDataType(col, 'SQLSERVER')}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.autoIncrement) {
      const baseType = col.dataType.toUpperCase()
      if (baseType === 'INT' || baseType === 'BIGINT' || baseType === 'SMALLINT') {
        line = `  [${col.name}] ${col.dataType.toUpperCase()} IDENTITY(1,1)`
      }
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${formatDefaultValue(col, 'SQLSERVER')}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private generateSQLServerIndexLine(tableName: string, idx: Index): string {
    const columns = JSON.parse(idx.columns).map((c: string) => `[${c}]`).join(', ')

    if (idx.unique) {
      return `CONSTRAINT [${idx.name}] UNIQUE ([${columns}])`
    }
    return `INDEX [${idx.name}] ([${columns}])`
  }

  private generateSQLServerForeignKeyLine(rel: Relationship): string {
    const constraintName = rel.name || `FK_${rel.sourceTableName}_${rel.sourceColumnName}`

    let line = `CONSTRAINT [${constraintName}] FOREIGN KEY ([${rel.sourceColumnName}])`
    line += ` REFERENCES [${rel.targetTableName}] ([${rel.targetColumnName}])`

    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }

    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }

    return line
  }

  private generateOracleCreateTable(table: Table, relationships?: Relationship[]): string {
    const lines: string[] = []
    lines.push(`CREATE TABLE "${table.name}" (`)

    const columnLines = table.columns.map(col => this.generateOracleColumnLine(col))
    lines.push(columnLines.join(',\n'))

    const pkColumns = table.columns.filter(c => c.primaryKey)
    if (pkColumns.length > 0) {
      lines.push(`,\n  PRIMARY KEY (${pkColumns.map(c => `"${c.name}"`).join(', ')})`)
    }

    table.indexes.forEach(idx => {
      const columns = JSON.parse(idx.columns).map((c: string) => `"${c}"`).join(', ')
      if (idx.unique) {
        lines.push(`,\n  CONSTRAINT "${idx.name}" UNIQUE (${columns})`)
      } else {
        lines.push(`,\n  INDEX "${idx.name}" (${columns})`)
      }
    })

    const tableRelationships = relationships?.filter(r => r.sourceTableName === table.name) || []
    tableRelationships.forEach(rel => {
      lines.push(`,\n  ${this.generateOracleForeignKeyLine(rel)}`)
    })

    lines.push('\n)')

    if (table.comment) {
      lines.push(`\nCOMMENT ON TABLE "${table.name}" IS '${escapeString(table.comment)}'`)
    }

    lines.push(';')
    return lines.join('')
  }

  private generateOracleColumnLine(col: Column): string {
    let line = `  "${col.name}" ${mapDataType(col, 'ORACLE')}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${formatDefaultValue(col, 'ORACLE')}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private generateOracleForeignKeyLine(rel: Relationship): string {
    const constraintName = rel.name || `FK_${rel.sourceTableName}_${rel.sourceColumnName}`

    let line = `CONSTRAINT "${constraintName}" FOREIGN KEY ("${rel.sourceColumnName}")`
    line += ` REFERENCES "${rel.targetTableName}" ("${rel.targetColumnName}")`

    if (rel.onUpdate !== 'RESTRICT') {
      line += ` ON UPDATE ${rel.onUpdate}`
    }

    if (rel.onDelete !== 'RESTRICT') {
      line += ` ON DELETE ${rel.onDelete}`
    }

    return line
  }
}

export const multiDDLGenerator = new MultiDDLGenerator()
