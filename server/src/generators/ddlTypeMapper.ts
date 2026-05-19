import { Column } from './ddlGenerator'
import { DatabaseType, typeMap } from './typeConverter'

const dbDefaults: Record<DatabaseType, { timestamp: string; quotePrefix: string }> = {
  MYSQL: { timestamp: 'CURRENT_TIMESTAMP', quotePrefix: "'" },
  POSTGRESQL: { timestamp: 'CURRENT_TIMESTAMP', quotePrefix: "'" },
  SQLITE: { timestamp: 'CURRENT_TIMESTAMP', quotePrefix: "'" },
  SQLSERVER: { timestamp: 'GETDATE()', quotePrefix: "N'" },
  ORACLE: { timestamp: 'SYSTIMESTAMP', quotePrefix: "'" }
}

export function escapeString(str: string): string {
  return str.replace(/'/g, "''")
}

export function formatDefaultValue(col: Column, dbType: DatabaseType): string {
  const val = col.defaultValue
  if (!val) return 'NULL'
  if (val === 'NULL') return 'NULL'

  const dt = dbDefaults[dbType]
  if (val === 'CURRENT_TIMESTAMP') return dt.timestamp
  if (!isNaN(Number(val))) return val

  return `${dt.quotePrefix}${escapeString(val)}'`
}

export function mapDataType(col: Column, dbType: DatabaseType): string {
  const logicalType = col.dataType.toUpperCase()
  const baseType = typeMap[logicalType]?.[dbType] || logicalType

  switch (dbType) {
    case 'MYSQL':
      return applyMySQLTypeRules(baseType, col)
    case 'POSTGRESQL':
      return applyPostgreSQLTypeRules(baseType, col)
    case 'SQLITE':
      return applySQLiteTypeRules(baseType, col)
    case 'SQLSERVER':
      return applySQLServerTypeRules(baseType, col)
    case 'ORACLE':
      return applyOracleTypeRules(baseType, col)
    default:
      return baseType
  }
}

function applyMySQLTypeRules(baseType: string, col: Column): string {
  if (baseType === 'VARCHAR' || baseType === 'CHAR') {
    return `${baseType}(${col.length || 255})`
  }
  if (baseType === 'DECIMAL' || baseType === 'NUMERIC') {
    return `${baseType}(${col.precision || 10},${col.scale || 2})`
  }
  return baseType
}

function applyPostgreSQLTypeRules(baseType: string, col: Column): string {
  if (baseType === 'VARCHAR' || baseType === 'CHAR') {
    return `${baseType}(${col.length || 255})`
  }
  if (baseType === 'DECIMAL' || baseType === 'NUMERIC') {
    return `${baseType}(${col.precision || 10},${col.scale || 2})`
  }
  return baseType
}

function applySQLiteTypeRules(baseType: string, _col: Column): string {
  return baseType
}

function applySQLServerTypeRules(baseType: string, col: Column): string {
  if (baseType === 'NVARCHAR' || baseType === 'NCHAR') {
    return `${baseType}(${col.length || 255})`
  }
  if (baseType === 'DECIMAL' || baseType === 'NUMERIC') {
    return `${baseType}(${col.precision || 10},${col.scale || 2})`
  }
  return baseType
}

function applyOracleTypeRules(baseType: string, col: Column): string {
  if (baseType === 'VARCHAR2' || baseType === 'CHAR') {
    return `${baseType}(${col.length || 255})`
  }
  if (baseType === 'NUMBER') {
    return `${baseType}(${col.precision || 10},${col.scale || 2})`
  }
  return baseType
}