export type DatabaseType = 'MYSQL' | 'POSTGRESQL' | 'SQLITE' | 'SQLSERVER' | 'ORACLE'

export interface TypeMapping {
  [key: string]: {
    [dbType in DatabaseType]?: string
  }
}

const typeMap: TypeMapping = {
  'INT': {
    MYSQL: 'INT',
    POSTGRESQL: 'INTEGER',
    SQLITE: 'INTEGER',
    SQLSERVER: 'INT',
    ORACLE: 'NUMBER(10)'
  },
  'BIGINT': {
    MYSQL: 'BIGINT',
    POSTGRESQL: 'BIGINT',
    SQLITE: 'INTEGER',
    SQLSERVER: 'BIGINT',
    ORACLE: 'NUMBER(19)'
  },
  'SMALLINT': {
    MYSQL: 'SMALLINT',
    POSTGRESQL: 'SMALLINT',
    SQLITE: 'INTEGER',
    SQLSERVER: 'SMALLINT',
    ORACLE: 'NUMBER(5)'
  },
  'TINYINT': {
    MYSQL: 'TINYINT',
    POSTGRESQL: 'SMALLINT',
    SQLITE: 'INTEGER',
    SQLSERVER: 'TINYINT',
    ORACLE: 'NUMBER(3)'
  },
  'VARCHAR': {
    MYSQL: 'VARCHAR',
    POSTGRESQL: 'VARCHAR',
    SQLITE: 'TEXT',
    SQLSERVER: 'NVARCHAR',
    ORACLE: 'VARCHAR2'
  },
  'CHAR': {
    MYSQL: 'CHAR',
    POSTGRESQL: 'CHAR',
    SQLITE: 'TEXT',
    SQLSERVER: 'NCHAR',
    ORACLE: 'CHAR'
  },
  'TEXT': {
    MYSQL: 'TEXT',
    POSTGRESQL: 'TEXT',
    SQLITE: 'TEXT',
    SQLSERVER: 'TEXT',
    ORACLE: 'CLOB'
  },
  'MEDIUMTEXT': {
    MYSQL: 'MEDIUMTEXT',
    POSTGRESQL: 'TEXT',
    SQLITE: 'TEXT',
    SQLSERVER: 'TEXT',
    ORACLE: 'CLOB'
  },
  'LONGTEXT': {
    MYSQL: 'LONGTEXT',
    POSTGRESQL: 'TEXT',
    SQLITE: 'TEXT',
    SQLSERVER: 'TEXT',
    ORACLE: 'CLOB'
  },
  'DATE': {
    MYSQL: 'DATE',
    POSTGRESQL: 'DATE',
    SQLITE: 'TEXT',
    SQLSERVER: 'DATE',
    ORACLE: 'DATE'
  },
  'DATETIME': {
    MYSQL: 'DATETIME',
    POSTGRESQL: 'TIMESTAMP',
    SQLITE: 'TEXT',
    SQLSERVER: 'DATETIME2',
    ORACLE: 'DATE'
  },
  'TIMESTAMP': {
    MYSQL: 'TIMESTAMP',
    POSTGRESQL: 'TIMESTAMP',
    SQLITE: 'TEXT',
    SQLSERVER: 'DATETIME2',
    ORACLE: 'TIMESTAMP'
  },
  'TIME': {
    MYSQL: 'TIME',
    POSTGRESQL: 'TIME',
    SQLITE: 'TEXT',
    SQLSERVER: 'TIME',
    ORACLE: 'INTERVAL DAY TO SECOND'
  },
  'DECIMAL': {
    MYSQL: 'DECIMAL',
    POSTGRESQL: 'DECIMAL',
    SQLITE: 'REAL',
    SQLSERVER: 'DECIMAL',
    ORACLE: 'NUMBER'
  },
  'NUMERIC': {
    MYSQL: 'NUMERIC',
    POSTGRESQL: 'NUMERIC',
    SQLITE: 'REAL',
    SQLSERVER: 'NUMERIC',
    ORACLE: 'NUMBER'
  },
  'FLOAT': {
    MYSQL: 'FLOAT',
    POSTGRESQL: 'REAL',
    SQLITE: 'REAL',
    SQLSERVER: 'FLOAT',
    ORACLE: 'FLOAT'
  },
  'DOUBLE': {
    MYSQL: 'DOUBLE',
    POSTGRESQL: 'DOUBLE PRECISION',
    SQLITE: 'REAL',
    SQLSERVER: 'FLOAT',
    ORACLE: 'FLOAT'
  },
  'BOOLEAN': {
    MYSQL: 'TINYINT(1)',
    POSTGRESQL: 'BOOLEAN',
    SQLITE: 'INTEGER',
    SQLSERVER: 'BIT',
    ORACLE: 'NUMBER(1)'
  },
  'BOOL': {
    MYSQL: 'TINYINT(1)',
    POSTGRESQL: 'BOOLEAN',
    SQLITE: 'INTEGER',
    SQLSERVER: 'BIT',
    ORACLE: 'NUMBER(1)'
  },
  'BLOB': {
    MYSQL: 'BLOB',
    POSTGRESQL: 'BYTEA',
    SQLITE: 'BLOB',
    SQLSERVER: 'VARBINARY(MAX)',
    ORACLE: 'BLOB'
  },
  'JSON': {
    MYSQL: 'JSON',
    POSTGRESQL: 'JSONB',
    SQLITE: 'TEXT',
    SQLSERVER: 'NVARCHAR(MAX)',
    ORACLE: 'CLOB'
  },
  'UUID': {
    MYSQL: 'CHAR(36)',
    POSTGRESQL: 'UUID',
    SQLITE: 'TEXT',
    SQLSERVER: 'UNIQUEIDENTIFIER',
    ORACLE: 'RAW(16)'
  },
  'SERIAL': {
    MYSQL: 'INT AUTO_INCREMENT',
    POSTGRESQL: 'SERIAL',
    SQLITE: 'INTEGER',
    SQLSERVER: 'INT IDENTITY(1,1)',
    ORACLE: 'NUMBER(10)'
  }
}

export class TypeConverter {
  static convert(dataType: string, sourceDb: DatabaseType, targetDb: DatabaseType): string {
    if (sourceDb === targetDb) {
      return dataType
    }

    const upperType = dataType.toUpperCase()
    const baseTypeMatch = upperType.match(/^(\w+)/)
    const baseType = baseTypeMatch ? baseTypeMatch[1] : upperType

    const lengthMatch = dataType.match(/\((\d+)(?:,(\d+))?\)/)
    const length = lengthMatch ? lengthMatch[1] : null
    const scale = lengthMatch && lengthMatch[2] ? lengthMatch[2] : null

    if (typeMap[baseType] && typeMap[baseType][targetDb]) {
      let result = typeMap[baseType][targetDb]!

      if (length && (result.includes('VARCHAR') || result.includes('CHAR') || result.includes('NVARCHAR'))) {
        if (targetDb === 'SQLITE') {
          result = 'TEXT'
        } else if (targetDb === 'ORACLE' && baseType === 'VARCHAR') {
          result = 'VARCHAR2'
        } else {
          result = `${result}(${length})`
        }
      }

      if (scale && (result.includes('DECIMAL') || result.includes('NUMERIC') || result === 'NUMBER')) {
        result = targetDb === 'ORACLE' ? `NUMBER(${length},${scale})` : `${result}(${length},${scale})`
      } else if (length && (result === 'DECIMAL' || result === 'NUMERIC' || result === 'NUMBER')) {
        result = targetDb === 'ORACLE' ? `NUMBER(${length})` : `${result}(${length})`
      }

      if (dataType.toUpperCase().includes('AUTO_INCREMENT')) {
        result = this.addAutoIncrement(result, targetDb)
      }

      if (dataType.toUpperCase().includes('UNSIGNED')) {
        result = this.handleUnsigned(result, targetDb)
      }

      return result
    }

    return this.getDefaultMapping(dataType, targetDb, length, scale)
  }

  private static addAutoIncrement(dataType: string, targetDb: DatabaseType): string {
    switch (targetDb) {
      case 'MYSQL':
        return dataType.includes('INT') ? dataType.replace('INT', 'INT AUTO_INCREMENT') : dataType
      case 'POSTGRESQL':
        return dataType.replace(/INT.*/, 'SERIAL')
      case 'SQLITE':
        return 'INTEGER'
      case 'SQLSERVER':
        return dataType.includes('INT') ? 'INT IDENTITY(1,1)' : dataType
      case 'ORACLE':
        return 'NUMBER(10)'
      default:
        return dataType
    }
  }

  private static handleUnsigned(dataType: string, targetDb: DatabaseType): string {
    switch (targetDb) {
      case 'MYSQL':
        return dataType
      case 'POSTGRESQL':
        return dataType
      case 'SQLITE':
        return dataType
      case 'SQLSERVER':
        return dataType
      case 'ORACLE':
        return dataType
      default:
        return dataType
    }
  }

  private static getDefaultMapping(dataType: string, targetDb: DatabaseType, length?: string | null, scale?: string | null): string {
    const upperType = dataType.toUpperCase()

    if (upperType.includes('VARCHAR') || upperType.includes('CHAR')) {
      const len = length || '255'
      switch (targetDb) {
        case 'MYSQL': return `VARCHAR(${len})`
        case 'POSTGRESQL': return `VARCHAR(${len})`
        case 'SQLITE': return 'TEXT'
        case 'SQLSERVER': return `NVARCHAR(${len})`
        case 'ORACLE': return `VARCHAR2(${len})`
      }
    }

    if (upperType.includes('INT')) {
      switch (targetDb) {
        case 'MYSQL': return 'INT'
        case 'POSTGRESQL': return 'INTEGER'
        case 'SQLITE': return 'INTEGER'
        case 'SQLSERVER': return 'INT'
        case 'ORACLE': return 'NUMBER(10)'
      }
    }

    if (upperType.includes('DECIMAL') || upperType.includes('NUMERIC')) {
      const len = length || '10'
      const scl = scale || '2'
      switch (targetDb) {
        case 'MYSQL': return `DECIMAL(${len},${scl})`
        case 'POSTGRESQL': return `DECIMAL(${len},${scl})`
        case 'SQLITE': return 'REAL'
        case 'SQLSERVER': return `DECIMAL(${len},${scl})`
        case 'ORACLE': return `NUMBER(${len},${scl})`
      }
    }

    if (upperType.includes('TEXT') || upperType.includes('CLOB')) {
      switch (targetDb) {
        case 'MYSQL': return 'TEXT'
        case 'POSTGRESQL': return 'TEXT'
        case 'SQLITE': return 'TEXT'
        case 'SQLSERVER': return 'TEXT'
        case 'ORACLE': return 'CLOB'
      }
    }

    switch (targetDb) {
      case 'MYSQL': return 'VARCHAR(255)'
      case 'POSTGRESQL': return 'VARCHAR(255)'
      case 'SQLITE': return 'TEXT'
      case 'SQLSERVER': return 'NVARCHAR(255)'
      case 'ORACLE': return 'VARCHAR2(255)'
    }
  }

  static getTypeMappingTable(sourceDb: DatabaseType, targetDb: DatabaseType): Array<{ source: string; target: string }> {
    const mappings: Array<{ source: string; target: string }> = []

    Object.keys(typeMap).forEach(type => {
      const sourceType = typeMap[type][sourceDb] || type
      const targetType = typeMap[type][targetDb] || this.getDefaultMapping(type, targetDb, null, null)
      mappings.push({ source: sourceType, target: targetType })
    })

    return mappings
  }
}

export const databaseTypeLabels: Record<DatabaseType, string> = {
  MYSQL: 'MySQL',
  POSTGRESQL: 'PostgreSQL',
  SQLITE: 'SQLite',
  SQLSERVER: 'SQL Server',
  ORACLE: 'Oracle'
}
