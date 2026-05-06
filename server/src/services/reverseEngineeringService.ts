import * as mysql from 'mysql2/promise'

export interface ReverseEngineeringRequest {
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled?: boolean
  tables?: string[]
}

export interface ColumnInfo {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isNullable: boolean
  defaultValue: string | null
  comment: string
  autoIncrement: boolean
}

export interface TableInfo {
  name: string
  comment: string
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: ForeignKeyInfo[]
}

export interface IndexInfo {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
}

export interface ForeignKeyInfo {
  name: string
  column: string
  referencedTable: string
  referencedColumn: string
}

export interface ReverseEngineeringResult {
  success: boolean
  message: string
  tables?: TableInfo[]
}

export const reverseEngineeringService = {
  async importFromDatabase(data: ReverseEngineeringRequest): Promise<ReverseEngineeringResult> {
    let connection: mysql.Connection | null = null
    
    try {
      switch (data.databaseType.toUpperCase()) {
        case 'MYSQL':
          connection = await mysql.createConnection({
            host: data.host,
            port: data.port,
            user: data.username,
            password: data.password,
            database: data.databaseName,
            ssl: data.sslEnabled ? { rejectUnauthorized: false } : undefined,
            connectTimeout: 5000
          })
          
          await connection.connect()
          console.log('Connected to database successfully')
          
          const tables = await this.getMySQLTables(connection, data.databaseName, data.tables)
          console.log('Tables found:', tables)
          const tableInfos: TableInfo[] = []
          
          for (const table of tables) {
            const columns = await this.getMySQLColumns(connection, data.databaseName, table)
            console.log(`Table ${table} columns:`, columns)
            const indexes = await this.getMySQLIndexes(connection, data.databaseName, table)
            console.log(`Table ${table} indexes:`, indexes)
            const foreignKeys = await this.getMySQLForeignKeys(connection, data.databaseName, table)
            console.log(`Table ${table} foreign keys:`, foreignKeys)
            
            const tableComment = await this.getMySQLTableComment(connection, data.databaseName, table)
            
            tableInfos.push({
              name: table,
              comment: tableComment,
              columns,
              indexes,
              foreignKeys
            })
          }
          
          await connection.end()
          
          return {
            success: true,
            message: `成功导入 ${tableInfos.length} 张表`,
            tables: tableInfos
          }
          
        default:
          return {
            success: false,
            message: `暂不支持 ${data.databaseType} 数据库类型的逆向工程`
          }
      }
    } catch (error: any) {
      if (connection) {
        try {
          await connection.end()
        } catch {}
      }
      
      let message = '导入失败'
      if (error.code) {
        switch (error.code) {
          case 'ETIMEDOUT':
            message = '连接超时'
            break
          case 'ECONNREFUSED':
            message = '连接被拒绝（端口未开放或服务未启动）'
            break
          case 'ER_ACCESS_DENIED_ERROR':
            message = '用户名或密码错误'
            break
          case 'ER_BAD_DB_ERROR':
            message = '数据库不存在'
            break
          case 'ENOTFOUND':
            message = '主机地址无法解析'
            break
          default:
            message = error.message || '导入失败'
        }
      }
      
      return {
        success: false,
        message
      }
    }
  },

  async getMySQLTables(connection: mysql.Connection, database: string, filterTables?: string[]): Promise<string[]> {
    const [rows] = await connection.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
      [database, 'BASE TABLE']
    )
    
    const tables = (rows as any[]).map(row => row.TABLE_NAME)
    
    if (filterTables && filterTables.length > 0) {
      return tables.filter(t => filterTables.includes(t))
    }
    
    return tables
  },

  async getMySQLColumns(connection: mysql.Connection, database: string, table: string): Promise<ColumnInfo[]> {
    const [rows] = await connection.execute(
      `SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT, 
        COLUMN_COMMENT,
        COLUMN_TYPE,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
      ORDER BY ORDINAL_POSITION`,
      [database, table]
    )
    
    const [primaryKeys] = await connection.execute(
      `SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
      [database, table, 'PRIMARY']
    )
    
    const pkSet = new Set((primaryKeys as any[]).map(row => row.COLUMN_NAME))
    
    const [foreignKeys] = await connection.execute(
      `SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [database, table]
    )
    
    const fkSet = new Set((foreignKeys as any[]).map(row => row.COLUMN_NAME))
    
    return (rows as any[]).map(row => ({
      name: row.COLUMN_NAME,
      type: this.convertMySQLType(row.DATA_TYPE, row.COLUMN_TYPE),
      isPrimaryKey: pkSet.has(row.COLUMN_NAME),
      isForeignKey: fkSet.has(row.COLUMN_NAME),
      isNullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      comment: row.COLUMN_COMMENT || '',
      autoIncrement: row.EXTRA && row.EXTRA.includes('auto_increment')
    }))
  },

  async getMySQLIndexes(connection: mysql.Connection, database: string, table: string): Promise<IndexInfo[]> {
    const [rows] = await connection.execute(
      `SELECT 
        INDEX_NAME, 
        COLUMN_NAME, 
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [database, table]
    )
    
    const indexMap = new Map<string, IndexInfo>()
    
    for (const row of rows as any[]) {
      const indexName = row.INDEX_NAME
      if (!indexMap.has(indexName)) {
        indexMap.set(indexName, {
          name: indexName,
          columns: [],
          isUnique: row.NON_UNIQUE === 0,
          isPrimary: indexName === 'PRIMARY'
        })
      }
      indexMap.get(indexName)!.columns.push(row.COLUMN_NAME)
    }
    
    return Array.from(indexMap.values())
  },

  async getMySQLForeignKeys(connection: mysql.Connection, database: string, table: string): Promise<ForeignKeyInfo[]> {
    const [rows] = await connection.execute(
      `SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [database, table]
    )
    
    return (rows as any[]).map(row => ({
      name: row.CONSTRAINT_NAME,
      column: row.COLUMN_NAME,
      referencedTable: row.REFERENCED_TABLE_NAME,
      referencedColumn: row.REFERENCED_COLUMN_NAME
    }))
  },

  async getMySQLTableComment(connection: mysql.Connection, database: string, table: string): Promise<string> {
    const [rows] = await connection.execute(
      'SELECT TABLE_COMMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [database, table]
    )
    
    return (rows as any[])[0]?.TABLE_COMMENT || ''
  },

  convertMySQLType(dataType: string, columnType: string): string {
    const typeMap: Record<string, string> = {
      'tinyint': 'INT',
      'smallint': 'INT',
      'mediumint': 'INT',
      'int': 'INT',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'decimal': 'DECIMAL',
      'char': 'CHAR',
      'varchar': 'VARCHAR',
      'text': 'TEXT',
      'mediumtext': 'TEXT',
      'longtext': 'TEXT',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'year': 'YEAR',
      'enum': 'ENUM',
      'set': 'SET',
      'json': 'JSON',
      'binary': 'BINARY',
      'varbinary': 'VARBINARY',
      'blob': 'BLOB',
      'mediumblob': 'BLOB',
      'longblob': 'BLOB',
    }
    
    return typeMap[dataType] || 'VARCHAR'
  }
}