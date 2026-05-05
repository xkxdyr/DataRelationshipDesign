import { Column, Table, Relationship, Index } from './ddlGenerator'

export type DatabaseType = 'MYSQL' | 'POSTGRESQL' | 'SQLITE' | 'SQLSERVER' | 'ORACLE'

export const databaseTypeLabels: Record<DatabaseType, string> = {
  MYSQL: 'MySQL',
  POSTGRESQL: 'PostgreSQL',
  SQLITE: 'SQLite',
  SQLSERVER: 'SQL Server',
  ORACLE: 'Oracle'
}

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
      lines.push(` COMMENT='${this.escapeString(table.comment)}'`)
    }

    lines.push(';')
    return lines.join('')
  }

  private generateMySQLColumnLine(col: Column): string {
    let line = `  \`${col.name}\` ${this.mapMySQLDataType(col)}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.autoIncrement) {
      line += ' AUTO_INCREMENT'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${this.formatMySQLDefaultValue(col)}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    if (col.comment) {
      line += ` COMMENT '${this.escapeString(col.comment)}'`
    }

    return line
  }

  private mapMySQLDataType(col: Column): string {
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

  private formatMySQLDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP'
    if (!isNaN(Number(val))) return val
    return `'${this.escapeString(val)}'`
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
      lines.push(`\nCOMMENT ON TABLE "${table.name}" IS '${this.escapeString(table.comment)}'`)
    }

    lines.push(';')
    return lines.join('')
  }

  private generatePostgreSQLColumnLine(col: Column): string {
    let line = `  "${col.name}" ${this.mapPostgreSQLDataType(col)}`

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
      line += ` DEFAULT ${this.formatPostgreSQLDefaultValue(col)}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private mapPostgreSQLDataType(col: Column): string {
    const typeMap: Record<string, string> = {
      'INT': 'INTEGER',
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
      'UUID': 'UUID'
    }

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

  private formatPostgreSQLDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP'
    if (!isNaN(Number(val))) return val
    return `'${this.escapeString(val)}'`
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
      lines.push(`; -- ${this.escapeString(table.comment)}`)
    } else {
      lines.push(';')
    }

    return lines.join('')
  }

  private generateSQLiteColumnLine(col: Column): string {
    let line = `  "${col.name}" ${this.mapSQLiteDataType(col)}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${this.formatSQLiteDefaultValue(col)}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private mapSQLiteDataType(col: Column): string {
    const typeMap: Record<string, string> = {
      'INT': 'INTEGER',
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
      'TIMESTAMP': 'TEXT',
      'TIME': 'TEXT',
      'DECIMAL': 'REAL',
      'NUMERIC': 'REAL',
      'FLOAT': 'REAL',
      'DOUBLE': 'REAL',
      'BOOLEAN': 'INTEGER',
      'BOOL': 'INTEGER',
      'BLOB': 'BLOB',
      'JSON': 'TEXT',
      'UUID': 'TEXT'
    }

    const baseType = typeMap[col.dataType.toUpperCase()] || 'TEXT'

    if ((baseType === 'VARCHAR' || baseType === 'CHAR' || baseType === 'TEXT') && col.length) {
      return 'TEXT'
    }

    return baseType
  }

  private formatSQLiteDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP'
    if (!isNaN(Number(val))) return val
    return `'${this.escapeString(val)}'`
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
      lines.push(`\nEXEC sp_addextendedproperty @name = N'MS_Description', @value = N'${this.escapeString(table.comment)}', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'${table.name}';`)
    }

    lines.push('')
    return lines.join('\n')
  }

  private generateSQLServerColumnLine(col: Column): string {
    let line = `  [${col.name}] ${this.mapSQLServerDataType(col)}`

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
      line += ` DEFAULT ${this.formatSQLServerDefaultValue(col)}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private mapSQLServerDataType(col: Column): string {
    const typeMap: Record<string, string> = {
      'INT': 'INT',
      'BIGINT': 'BIGINT',
      'SMALLINT': 'SMALLINT',
      'TINYINT': 'TINYINT',
      'VARCHAR': 'NVARCHAR',
      'CHAR': 'NCHAR',
      'TEXT': 'TEXT',
      'MEDIUMTEXT': 'TEXT',
      'LONGTEXT': 'TEXT',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME2',
      'TIMESTAMP': 'DATETIME2',
      'TIME': 'TIME',
      'DECIMAL': 'DECIMAL',
      'NUMERIC': 'NUMERIC',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'FLOAT',
      'BOOLEAN': 'BIT',
      'BOOL': 'BIT',
      'BLOB': 'VARBINARY(MAX)',
      'JSON': 'NVARCHAR(MAX)',
      'UUID': 'UNIQUEIDENTIFIER'
    }

    const baseType = typeMap[col.dataType.toUpperCase()] || col.dataType

    if (baseType === 'NVARCHAR' || baseType === 'NCHAR') {
      return `${baseType}(${col.length || 255})`
    }

    if (baseType === 'DECIMAL' || baseType === 'NUMERIC') {
      const precision = col.precision || 10
      const scale = col.scale || 2
      return `${baseType}(${precision},${scale})`
    }

    return baseType
  }

  private formatSQLServerDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'GETDATE()'
    if (!isNaN(Number(val))) return val
    return `N'${this.escapeString(val)}'`
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
      lines.push(`\nCOMMENT ON TABLE "${table.name}" IS '${this.escapeString(table.comment)}'`)
    }

    lines.push(';')
    return lines.join('')
  }

  private generateOracleColumnLine(col: Column): string {
    let line = `  "${col.name}" ${this.mapOracleDataType(col)}`

    if (!col.nullable) {
      line += ' NOT NULL'
    }

    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      line += ` DEFAULT ${this.formatOracleDefaultValue(col)}`
    }

    if (col.unique && !col.primaryKey) {
      line += ' UNIQUE'
    }

    return line
  }

  private mapOracleDataType(col: Column): string {
    const typeMap: Record<string, string> = {
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

    const baseType = typeMap[col.dataType.toUpperCase()] || col.dataType

    if (baseType === 'VARCHAR2' || baseType === 'CHAR') {
      return `${baseType}(${col.length || 255})`
    }

    if (baseType === 'NUMBER') {
      const precision = col.precision || 10
      const scale = col.scale || 2
      return `${baseType}(${precision},${scale})`
    }

    return baseType
  }

  private formatOracleDefaultValue(col: Column): string {
    const val = col.defaultValue
    if (!val) return 'NULL'
    if (val === 'NULL') return 'NULL'
    if (val === 'CURRENT_TIMESTAMP') return 'SYSTIMESTAMP'
    if (!isNaN(Number(val))) return val
    return `'${this.escapeString(val)}'`
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

  private escapeString(str: string): string {
    return str.replace(/'/g, "''")
  }
}

export const multiDDLGenerator = new MultiDDLGenerator()
