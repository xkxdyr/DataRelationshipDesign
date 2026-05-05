import { Table, Column, Relationship, Index } from '../types'

export interface DDLOptions {
  databaseType: 'MYSQL' | 'POSTGRESQL' | 'SQLITE' | 'SQLSERVER' | 'ORACLE'
  schema?: string
  tablePrefix?: string
  includeComments: boolean
  formatSql: boolean
  uppercaseKeywords: boolean
  includeDropTable: boolean
}

export interface IDDLGenerator {
  generateCreateTable(table: Table, relationships: Relationship[], tableMap: Map<string, Table>, options: DDLOptions): string
  generateDropTable(tableName: string, options: DDLOptions): string
  generateCreateIndex(index: Index, tableName: string, options: DDLOptions): string
  generateCreateRelationship(rel: Relationship, tableMap: Map<string, Table>, options: DDLOptions): string
  generateDropIndex(indexName: string, tableName: string, options: DDLOptions): string
}

export abstract class BaseDDLGenerator implements IDDLGenerator {
  abstract mapDataType(col: Column): string
  abstract escapeIdentifier(identifier: string): string
  abstract escapeString(str: string): string
  abstract formatDefaultValue(col: Column): string

  generateCreateTable(
    table: Table, 
    relationships: Relationship[], 
    tableMap: Map<string, Table>, 
    options: DDLOptions
  ): string {
    throw new Error('Method not implemented.')
  }

  generateDropTable(tableName: string, options: DDLOptions): string {
    throw new Error('Method not implemented.')
  }

  generateCreateIndex(index: Index, tableName: string, options: DDLOptions): string {
    throw new Error('Method not implemented.')
  }

  generateCreateRelationship(
    rel: Relationship, 
    tableMap: Map<string, Table>, 
    options: DDLOptions
  ): string {
    throw new Error('Method not implemented.')
  }

  generateDropIndex(indexName: string, tableName: string, options: DDLOptions): string {
    throw new Error('Method not implemented.')
  }
}
