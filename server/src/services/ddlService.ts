import { PrismaClient } from '@prisma/client'
import { Table, Relationship } from '../generators/ddlGenerator'

const prisma = new PrismaClient()

export const ddlService = {
  async getProjectForDDL(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tables: {
          include: {
            columns: true,
            indexes: true
          }
        },
        relationships: true
      }
    })

    if (!project) return null

    const tables: Table[] = project.tables.map(t => ({
      name: t.name,
      comment: t.comment || undefined,
      columns: t.columns.map(c => ({
        name: c.name,
        dataType: c.dataType,
        length: c.length || undefined,
        precision: c.precision || undefined,
        scale: c.scale || undefined,
        nullable: c.nullable,
        defaultValue: c.defaultValue || undefined,
        autoIncrement: c.autoIncrement,
        primaryKey: c.primaryKey,
        unique: c.unique,
        comment: c.comment || undefined
      })),
      indexes: t.indexes
    }))

    const tableMap = new Map(project.tables.map(t => [t.id, t.name]))
    const columnMap = new Map(
      project.tables.flatMap(t => t.columns.map(c => [c.id, c.name]))
    )

    const relationships: Relationship[] = project.relationships.map(rel => ({
      sourceTableName: tableMap.get(rel.sourceTableId) || '',
      sourceColumnName: columnMap.get(rel.sourceColumnId) || '',
      targetTableName: tableMap.get(rel.targetTableId) || '',
      targetColumnName: columnMap.get(rel.targetColumnId) || '',
      relationshipType: rel.relationshipType,
      onUpdate: rel.onUpdate,
      onDelete: rel.onDelete,
      name: rel.name || undefined
    }))

    return { tables, relationships, tableCount: tables.length, relationshipCount: relationships.length }
  },

  async getTableForDDL(tableId: string) {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        columns: true,
        indexes: true,
        project: {
          include: {
            tables: {
              include: { columns: true }
            },
            relationships: true
          }
        }
      }
    })

    if (!table) return null

    const dbTable: Table = {
      name: table.name,
      comment: table.comment || undefined,
      columns: table.columns.map(c => ({
        name: c.name,
        dataType: c.dataType,
        length: c.length || undefined,
        precision: c.precision || undefined,
        scale: c.scale || undefined,
        nullable: c.nullable,
        defaultValue: c.defaultValue || undefined,
        autoIncrement: c.autoIncrement,
        primaryKey: c.primaryKey,
        unique: c.unique,
        comment: c.comment || undefined
      })),
      indexes: table.indexes
    }

    const tableMap = new Map(table.project.tables.map(t => [t.id, t.name]))
    const columnMap = new Map(
      table.project.tables.flatMap(t => t.columns.map(c => [c.id, c.name]))
    )

    const relationships: Relationship[] = table.project.relationships
      .filter(r => r.sourceTableId === table.id)
      .map(rel => ({
        sourceTableName: tableMap.get(rel.sourceTableId) || '',
        sourceColumnName: columnMap.get(rel.sourceColumnId) || '',
        targetTableName: tableMap.get(rel.targetTableId) || '',
        targetColumnName: columnMap.get(rel.targetColumnId) || '',
        relationshipType: rel.relationshipType,
        onUpdate: rel.onUpdate,
        onDelete: rel.onDelete,
        name: rel.name || undefined
      }))

    return { table: dbTable, relationships, tableName: table.name }
  }
}