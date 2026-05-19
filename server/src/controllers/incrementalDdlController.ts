import { Request, Response } from 'express'
import { Table } from '../generators/ddlGenerator'
import { generateIncrementalDDL, getProjectTables, getVersionTables, getVersionProjectId } from '../services/incrementalDdlService'
import { DatabaseType, databaseTypeLabels } from '../generators/multiDdlGenerator'

export const incrementalDdlController = {
  async generateFromVersions(req: Request, res: Response) {
    try {
      const { versionId1, versionId2 } = req.params
      const dbType = (req.query.type as DatabaseType) || 'MYSQL'

      const oldTables = await getVersionTables(versionId1)
      if (!oldTables) {
        res.status(404).json({ success: false, error: `版本 ${versionId1} 不存在或数据为空` })
        return
      }

      const newTables = versionId2 === 'current'
        ? await (async () => {
            const projectId = await getVersionProjectId(versionId1)
            if (!projectId) return null
            return getProjectTables(projectId)
          })()
        : await getVersionTables(versionId2)

      if (!newTables) {
        res.status(404).json({ success: false, error: `目标版本 ${versionId2} 不存在或数据为空` })
        return
      }

      const results = generateIncrementalDDL(oldTables, newTables, dbType)

      const allStatements = results.flatMap(r => r.statements)
      const totalChanges = results.reduce((sum, r) =>
        sum + r.columnDiffs.length + r.indexDiffs.length, 0)

      res.json({
        success: true,
        data: {
          results,
          ddl: allStatements.join('\n\n'),
          databaseType: dbType,
          databaseTypeLabel: databaseTypeLabels[dbType],
          tableCount: results.length,
          totalChanges
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateFromTables(req: Request, res: Response) {
    try {
      const { oldTables, newTables, dbType } = req.body as {
        oldTables: Table[]
        newTables: Table[]
        dbType: DatabaseType
      }

      if (!oldTables || !newTables) {
        res.status(400).json({ success: false, error: '请提供 oldTables 和 newTables 参数' })
        return
      }

      const results = generateIncrementalDDL(oldTables, newTables, dbType || 'MYSQL')

      const allStatements = results.flatMap(r => r.statements)
      const totalChanges = results.reduce((sum, r) =>
        sum + r.columnDiffs.length + r.indexDiffs.length, 0)

      res.json({
        success: true,
        data: {
          results,
          ddl: allStatements.join('\n\n'),
          databaseType: dbType || 'MYSQL',
          databaseTypeLabel: databaseTypeLabels[dbType || 'MYSQL'],
          tableCount: results.length,
          totalChanges
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateFromCurrentVsVersion(req: Request, res: Response) {
    try {
      const { projectId, versionId } = req.params
      const dbType = (req.query.type as DatabaseType) || 'MYSQL'

      const oldTables = await getVersionTables(versionId)
      if (!oldTables) {
        res.status(404).json({ success: false, error: `版本 ${versionId} 不存在` })
        return
      }

      const newTables = await getProjectTables(projectId)
      if (!newTables) {
        res.status(404).json({ success: false, error: `项目 ${projectId} 不存在` })
        return
      }

      const results = generateIncrementalDDL(oldTables, newTables, dbType)

      const allStatements = results.flatMap(r => r.statements)
      const totalChanges = results.reduce((sum, r) =>
        sum + r.columnDiffs.length + r.indexDiffs.length, 0)

      res.json({
        success: true,
        data: {
          results,
          ddl: allStatements.join('\n\n'),
          databaseType: dbType,
          databaseTypeLabel: databaseTypeLabels[dbType],
          tableCount: results.length,
          totalChanges
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateFromProjectVersions(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const { versionId1, versionId2 } = req.body as { versionId1: string; versionId2: string }
      const dbType = (req.query.type as DatabaseType) || 'MYSQL'

      const oldTables = await getVersionTables(versionId1)
      if (!oldTables) {
        res.status(404).json({ success: false, error: `版本 ${versionId1} 不存在` })
        return
      }

      const newTables = versionId2 === 'current'
        ? await getProjectTables(projectId)
        : await getVersionTables(versionId2)

      if (!newTables) {
        res.status(404).json({ success: false, error: `目标版本 ${versionId2} 不存在` })
        return
      }

      const results = generateIncrementalDDL(oldTables, newTables, dbType)

      const allStatements = results.flatMap(r => r.statements)
      const totalChanges = results.reduce((sum, r) =>
        sum + r.columnDiffs.length + r.indexDiffs.length, 0)

      res.json({
        success: true,
        data: {
          results,
          ddl: allStatements.join('\n\n'),
          databaseType: dbType,
          databaseTypeLabel: databaseTypeLabels[dbType],
          tableCount: results.length,
          totalChanges
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  }
}