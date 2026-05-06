import * as mysql from 'mysql2/promise'

export interface SyncConnection {
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled?: boolean
}

export interface TableSchema {
  name: string
  comment?: string
  columns: ColumnSchema[]
  indexes: IndexSchema[]
  foreignKeys: ForeignKeySchema[]
}

export interface ColumnSchema {
  name: string
  dataType: string
  nullable: boolean
  defaultValue?: string
  autoIncrement: boolean
  primaryKey: boolean
  unique: boolean
  comment?: string
}

export interface IndexSchema {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
}

export interface ForeignKeySchema {
  name: string
  column: string
  referencedTable: string
  referencedColumn: string
  onDelete?: string
  onUpdate?: string
}

export interface SyncResult {
  success: boolean
  message: string
  executedDDL?: string[]
  errors?: string[]
}

export const databaseSyncService = {
  async syncToDatabase(connection: SyncConnection, tables: TableSchema[]): Promise<SyncResult> {
    let dbConnection: mysql.Connection | null = null
    const executedDDL: string[] = []
    const errors: string[] = []

    try {
      switch (connection.databaseType.toUpperCase()) {
        case 'MYSQL':
          dbConnection = await mysql.createConnection({
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.databaseName,
            ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined,
            connectTimeout: 10000,
            multipleStatements: true
          })

          await dbConnection.connect()

          for (const table of tables) {
            const ddl = this.generateMySQLDDL(table)
            
            try {
              await dbConnection.execute(ddl)
              executedDDL.push(`-- 表: ${table.name}\n${ddl}`)
            } catch (error: any) {
              errors.push(`表 ${table.name} 创建失败: ${error.message}`)
            }
          }

          await dbConnection.end()

          if (errors.length === 0) {
            return {
              success: true,
              message: `成功同步 ${tables.length} 张表到数据库`,
              executedDDL
            }
          } else {
            return {
              success: false,
              message: `同步完成，但有 ${errors.length} 个错误`,
              executedDDL,
              errors
            }
          }

        default:
          return {
            success: false,
            message: `暂不支持 ${connection.databaseType} 数据库类型的同步`
          }
      }
    } catch (error: any) {
      if (dbConnection) {
        try {
          await dbConnection.end()
        } catch {}
      }

      let message = '同步失败'
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
            message = error.message || '同步失败'
        }
      }

      return {
        success: false,
        message,
        executedDDL,
        errors: [message]
      }
    }
  },

  async dryRun(connection: SyncConnection, tables: TableSchema[]): Promise<{ success: boolean; ddl: string; message: string }> {
    try {
      let ddl = `-- 数据库同步预览\n-- 数据库类型: ${connection.databaseType}\n-- 目标数据库: ${connection.host}:${connection.port}/${connection.databaseName}\n\n`

      for (const table of tables) {
        const tableDDL = this.generateMySQLDDL(table)
        ddl += `-- ==========================================\n-- 表: ${table.name}\n-- ==========================================\n${tableDDL}\n\n`
      }

      return {
        success: true,
        ddl,
        message: `已生成 ${tables.length} 张表的DDL语句`
      }
    } catch (error: any) {
      return {
        success: false,
        ddl: '',
        message: error.message || '生成DDL失败'
      }
    }
  },

  generateMySQLDDL(table: TableSchema): string {
    let ddl = `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n`
    
    const columnDefinitions: string[] = []
    
    for (const column of table.columns) {
      let colDef = `  \`${column.name}\` ${this.mapToMySQLType(column.dataType)}`
      
      if (!column.nullable) {
        colDef += ' NOT NULL'
      }
      
      if (column.autoIncrement) {
        colDef += ' AUTO_INCREMENT'
      }
      
      if (column.defaultValue !== undefined && column.defaultValue !== null) {
        if (column.dataType.toUpperCase() === 'VARCHAR' || 
            column.dataType.toUpperCase() === 'TEXT' || 
            column.dataType.toUpperCase() === 'CHAR') {
          colDef += ` DEFAULT '${column.defaultValue}'`
        } else {
          colDef += ` DEFAULT ${column.defaultValue}`
        }
      }
      
      if (column.comment) {
        colDef += ` COMMENT '${column.comment.replace(/'/g, "\\'")}'`
      }
      
      columnDefinitions.push(colDef)
    }

    const primaryKeys = table.columns.filter(c => c.primaryKey).map(c => `\`${c.name}\``)
    if (primaryKeys.length > 0) {
      columnDefinitions.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`)
    }

    for (const index of table.indexes) {
      if (!index.primary) {
        const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX'
        const columns = index.columns.map(c => `\`${c}\``).join(', ')
        columnDefinitions.push(`  ${indexType} \`${index.name}\` (${columns})`)
      }
    }

    for (const fk of table.foreignKeys) {
      const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ''
      const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ''
      columnDefinitions.push(
        `  CONSTRAINT \`${fk.name}\` FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.referencedTable}\` (\`${fk.referencedColumn}\`)${onDelete}${onUpdate}`
      )
    }

    ddl += columnDefinitions.join(',\n')
    ddl += '\n)'

    if (table.comment) {
      ddl += ` COMMENT='${table.comment.replace(/'/g, "\\'")}'`
    }

    ddl += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'

    return ddl
  },

  mapToMySQLType(dataType: string): string {
    const typeMap: Record<string, string> = {
      'INT': 'INT',
      'BIGINT': 'BIGINT',
      'SMALLINT': 'SMALLINT',
      'TINYINT': 'TINYINT',
      'MEDIUMINT': 'MEDIUMINT',
      'FLOAT': 'FLOAT',
      'DOUBLE': 'DOUBLE',
      'DECIMAL': 'DECIMAL(10,2)',
      'VARCHAR': 'VARCHAR(255)',
      'CHAR': 'CHAR(255)',
      'TEXT': 'TEXT',
      'LONGTEXT': 'LONGTEXT',
      'MEDIUMTEXT': 'MEDIUMTEXT',
      'DATE': 'DATE',
      'DATETIME': 'DATETIME',
      'TIMESTAMP': 'TIMESTAMP',
      'TIME': 'TIME',
      'YEAR': 'YEAR',
      'ENUM': 'ENUM',
      'SET': 'SET',
      'JSON': 'JSON',
      'BINARY': 'BINARY',
      'VARBINARY': 'VARBINARY',
      'BLOB': 'BLOB',
      'LONGBLOB': 'LONGBLOB',
      'MEDIUMBLOB': 'MEDIUMBLOB',
    }

    return typeMap[dataType.toUpperCase()] || 'VARCHAR(255)'
  }
}