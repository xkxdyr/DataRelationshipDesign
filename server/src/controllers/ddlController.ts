import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { MysqlDDLGenerator, Table, Relationship } from '../generators/ddlGenerator'

const prisma = new PrismaClient()

export const ddlController = {
  async generateForProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      
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

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' })
        return
      }

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

      const tableMap = new Map(
        project.tables.map(t => [t.id, t.name])
      )
      
      const columnMap = new Map(
        project.tables.flatMap(t => 
          t.columns.map(c => [c.id, c.name])
        )
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

      const ddl = MysqlDDLGenerator.generateAllTables(tables, relationships)
      
      res.json({
        success: true,
        data: {
          ddl,
          databaseType: project.databaseType,
          tableCount: tables.length,
          relationshipCount: relationships.length
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateForTable(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        include: {
          columns: true,
          indexes: true,
          project: {
            include: {
              tables: {
                include: {
                  columns: true
                }
              },
              relationships: true
            }
          }
        }
      })

      if (!table) {
        res.status(404).json({ success: false, error: 'Table not found' })
        return
      }

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

      const tableMap = new Map(
        table.project.tables.map(t => [t.id, t.name])
      )
      
      const columnMap = new Map(
        table.project.tables.flatMap(t => 
          t.columns.map(c => [c.id, c.name])
        )
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

      const ddl = MysqlDDLGenerator.generateCreateTable(dbTable, relationships)
      
      res.json({
        success: true,
        data: {
          ddl,
          tableName: table.name
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}
