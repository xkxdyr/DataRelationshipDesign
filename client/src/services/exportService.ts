import { Project, Table, Relationship, Version } from '../types'
import { DDLGeneratorFactory } from '../ddl/DDLGeneratorFactory'
import { DDLOptions } from '../ddl/types'

export interface ExportData {
  version: string
  exportedAt: string
  project: {
    id: string
    name: string
    description?: string
    databaseType: string
    status: string
    version: number
    createdAt: string
    updatedAt: string
    createdBy: string
  }
  tables: {
    id: string
    name: string
    comment?: string
    positionX: number
    positionY: number
    columns: {
      id: string
      name: string
      dataType: string
      length?: number
      precision?: number
      scale?: number
      nullable: boolean
      defaultValue?: string
      autoIncrement: boolean
      primaryKey: boolean
      unique: boolean
      comment?: string
      order: number
    }[]
    indexes: {
      id: string
      name: string
      columns: string[]
      unique: boolean
      type: string
    }[]
  }[]
  relationships: {
    id: string
    name?: string
    sourceTableId: string
    sourceColumnId: string
    targetTableId: string
    targetColumnId: string
    relationshipType: string
    onUpdate: string
    onDelete: string
  }[]
  versions: {
    id: string
    version: number
    name: string
    comment?: string
    data: string
    createdAt: string
  }[]
}

export const exportService = {
  exportToJSON(
    project: Project,
    tables: Table[],
    relationships: Relationship[],
    versions: Version[]
  ): ExportData {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        databaseType: project.databaseType,
        status: project.status,
        version: project.version,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        createdBy: project.createdBy
      },
      tables: tables.map(table => ({
        id: table.id,
        name: table.name,
        comment: table.comment,
        positionX: table.positionX,
        positionY: table.positionY,
        columns: (table.columns || []).map(col => ({
          id: col.id,
          name: col.name,
          dataType: col.dataType,
          length: col.length,
          precision: col.precision,
          scale: col.scale,
          nullable: col.nullable,
          defaultValue: col.defaultValue,
          autoIncrement: col.autoIncrement,
          primaryKey: col.primaryKey,
          unique: col.unique,
          comment: col.comment,
          order: col.order
        })),
        indexes: (table.indexes || []).map(idx => ({
          id: idx.id,
          name: idx.name,
          columns: idx.columns,
          unique: idx.unique,
          type: idx.type
        }))
      })),
      relationships: relationships.map(rel => ({
        id: rel.id,
        name: rel.name,
        sourceTableId: rel.sourceTableId,
        sourceColumnId: rel.sourceColumnId,
        targetTableId: rel.targetTableId,
        targetColumnId: rel.targetColumnId,
        relationshipType: rel.relationshipType,
        onUpdate: rel.onUpdate,
        onDelete: rel.onDelete
      })),
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        name: v.name,
        comment: v.comment,
        data: v.data,
        createdAt: v.createdAt
      }))
    }
  },

  exportToSQL(
    project: Project,
    tables: Table[],
    relationships: Relationship[],
    options?: Partial<DDLOptions>
  ): string {
    return DDLGeneratorFactory.generateCompleteSQL(project, tables, relationships, options)
  },

  downloadJSON(data: ExportData, filename: string): void {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  downloadSQL(sql: string, filename: string): void {
    const blob = new Blob([sql], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export default exportService