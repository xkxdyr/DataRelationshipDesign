import { Request, Response } from 'express'
import { TypeConverter, DatabaseType, databaseTypeLabels } from '../generators/typeConverter'

export const typeConvertController = {
  async convert(req: Request, res: Response) {
    try {
      const { dataType, sourceDb, targetDb } = req.body

      if (!dataType || !sourceDb || !targetDb) {
        res.status(400).json({ error: '缺少必要参数: dataType, sourceDb, targetDb' })
        return
      }

      const sourceDbUpper = sourceDb.toUpperCase() as DatabaseType
      const targetDbUpper = targetDb.toUpperCase() as DatabaseType

      if (!databaseTypeLabels[sourceDbUpper]) {
        res.status(400).json({ error: `不支持的源数据库类型: ${sourceDb}` })
        return
      }

      if (!databaseTypeLabels[targetDbUpper]) {
        res.status(400).json({ error: `不支持的目标数据库类型: ${targetDb}` })
        return
      }

      const convertedType = TypeConverter.convert(dataType, sourceDbUpper, targetDbUpper)

      res.json({
        success: true,
        result: {
          sourceType: dataType,
          targetType: convertedType,
          sourceDb: databaseTypeLabels[sourceDbUpper],
          targetDb: databaseTypeLabels[targetDbUpper]
        }
      })
    } catch (error) {
      console.error('类型转换失败:', error)
      res.status(500).json({ error: '类型转换失败: ' + (error as Error).message })
    }
  },

  async convertTable(req: Request, res: Response) {
    try {
      const { table, sourceDb, targetDb } = req.body

      if (!table || !table.columns || !sourceDb || !targetDb) {
        res.status(400).json({ error: '缺少必要参数: table, sourceDb, targetDb' })
        return
      }

      const sourceDbUpper = sourceDb.toUpperCase() as DatabaseType
      const targetDbUpper = targetDb.toUpperCase() as DatabaseType

      if (!databaseTypeLabels[sourceDbUpper]) {
        res.status(400).json({ error: `不支持的源数据库类型: ${sourceDb}` })
        return
      }

      if (!databaseTypeLabels[targetDbUpper]) {
        res.status(400).json({ error: `不支持的目标数据库类型: ${targetDb}` })
        return
      }

      const convertedColumns = table.columns.map((col: any) => ({
        ...col,
        originalDataType: col.dataType,
        dataType: TypeConverter.convert(col.dataType, sourceDbUpper, targetDbUpper)
      }))

      res.json({
        success: true,
        result: {
          tableName: table.name,
          sourceDb: databaseTypeLabels[sourceDbUpper],
          targetDb: databaseTypeLabels[targetDbUpper],
          originalColumns: table.columns,
          convertedColumns: convertedColumns
        }
      })
    } catch (error) {
      console.error('表类型转换失败:', error)
      res.status(500).json({ error: '表类型转换失败: ' + (error as Error).message })
    }
  },

  async getMappings(req: Request, res: Response) {
    try {
      const { sourceDb, targetDb } = req.query

      if (!sourceDb || !targetDb) {
        res.status(400).json({ error: '缺少必要参数: sourceDb, targetDb' })
        return
      }

      const sourceDbUpper = (sourceDb as string).toUpperCase() as DatabaseType
      const targetDbUpper = (targetDb as string).toUpperCase() as DatabaseType

      if (!databaseTypeLabels[sourceDbUpper]) {
        res.status(400).json({ error: `不支持的源数据库类型: ${sourceDb}` })
        return
      }

      if (!databaseTypeLabels[targetDbUpper]) {
        res.status(400).json({ error: `不支持的目标数据库类型: ${targetDb}` })
        return
      }

      const mappings = TypeConverter.getTypeMappingTable(sourceDbUpper, targetDbUpper)

      res.json({
        success: true,
        result: {
          sourceDb: databaseTypeLabels[sourceDbUpper],
          targetDb: databaseTypeLabels[targetDbUpper],
          mappings: mappings
        }
      })
    } catch (error) {
      console.error('获取类型映射表失败:', error)
      res.status(500).json({ error: '获取类型映射表失败: ' + (error as Error).message })
    }
  },

  async getDatabaseTypes(req: Request, res: Response) {
    res.json({
      success: true,
      result: Object.entries(databaseTypeLabels).map(([value, label]) => ({
        value,
        label
      }))
    })
  }
}