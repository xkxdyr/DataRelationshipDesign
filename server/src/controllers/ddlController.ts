import { Request, Response } from 'express'
import { MultiDDLGenerator, DatabaseType, databaseTypeLabels } from '../generators/multiDdlGenerator'
import { ddlService } from '../services/ddlService'

const multiDDLGenerator = new MultiDDLGenerator()

export const ddlController = {
  async generateForProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const dbType = (req.query.type as DatabaseType) || 'MYSQL'

      const projectData = await ddlService.getProjectForDDL(projectId)

      if (!projectData) {
        res.status(404).json({ success: false, error: 'Project not found' })
        return
      }

      multiDDLGenerator.setDatabaseType(dbType)

      const ddl = multiDDLGenerator.generateAllTables(projectData.tables, projectData.relationships)

      res.json({
        success: true,
        data: {
          ddl,
          databaseType: databaseTypeLabels[dbType],
          tableCount: projectData.tableCount,
          relationshipCount: projectData.relationshipCount
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateForTable(req: Request, res: Response) {
    try {
      const { tableId } = req.params
      const dbType = (req.query.type as DatabaseType) || 'MYSQL'

      const tableData = await ddlService.getTableForDDL(tableId)

      if (!tableData) {
        res.status(404).json({ success: false, error: 'Table not found' })
        return
      }

      multiDDLGenerator.setDatabaseType(dbType)

      const ddl = multiDDLGenerator.generateCreateTable(tableData.table, tableData.relationships)

      res.json({
        success: true,
        data: {
          ddl,
          tableName: tableData.tableName,
          databaseType: databaseTypeLabels[dbType]
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getSupportedDatabases(req: Request, res: Response) {
    const databases = Object.entries(databaseTypeLabels).map(([value, label]) => ({
      value,
      label
    }))

    res.json({
      success: true,
      data: databases
    })
  }
}