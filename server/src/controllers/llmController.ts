import { Request, Response } from 'express'
import { llmConfigService, LLMConfigCreate, LLMConfigUpdate } from '../services/llmConfigService'
import { llmDataMockService, MockDataRequest } from '../services/llmDataMockService'
import { llmService, TableSuggestion, ColumnSuggestion, RelationshipSuggestion } from '../services/llmService'
import { llmConversationService } from '../services/llmConversationService'
import { Table } from '../generators/ddlGenerator'

export const llmController = {
  async getUserConfigs(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const configs = await llmConfigService.getUserConfigs(userId)
      res.json({ success: true, data: configs })
    } catch (error) {
      console.error('获取用户LLM配置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getTeamConfigs(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const configs = await llmConfigService.getTeamConfigs(teamId)
      res.json({ success: true, data: configs })
    } catch (error) {
      console.error('获取团队LLM配置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async createUserConfig(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const config = req.body as LLMConfigCreate & { isDefault?: boolean; provider?: string }

      if (!config.name) {
        res.status(400).json({ success: false, error: '配置名称是必填项' })
        return
      }
      if (!config.apiKey && config.provider !== 'ollama') {
        res.status(400).json({ success: false, error: 'API密钥是必填项' })
        return
      }
      if (!config.apiKey) {
        config.apiKey = 'ollama-local'
      }

      const result = await llmConfigService.createUserConfig(userId, config)
      res.json({ success: true, data: { id: result.id, name: result.name } })
    } catch (error) {
      console.error('创建用户LLM配置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async createTeamConfig(req: Request, res: Response) {
    try {
      const { teamId } = req.params
      const config = req.body as LLMConfigCreate & { isDefault?: boolean; provider?: string }

      if (!config.name) {
        res.status(400).json({ success: false, error: '配置名称是必填项' })
        return
      }
      if (!config.apiKey && config.provider !== 'ollama') {
        res.status(400).json({ success: false, error: 'API密钥是必填项' })
        return
      }
      if (!config.apiKey) {
        config.apiKey = 'ollama-local'
      }

      const result = await llmConfigService.createTeamConfig(teamId, config)
      res.json({ success: true, data: { id: result.id, name: result.name } })
    } catch (error) {
      console.error('创建团队LLM配置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async updateConfig(req: Request, res: Response) {
    try {
      const { configId } = req.params
      const update = req.body as LLMConfigUpdate

      const result = await llmConfigService.updateConfig(configId, update)
      res.json({ success: true, data: { id: result.id, name: result.name } })
    } catch (error) {
      console.error('更新LLM配置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async deleteConfig(req: Request, res: Response) {
    try {
      const { configId } = req.params
      await llmConfigService.deleteConfig(configId)
      res.json({ success: true, message: '配置已删除' })
    } catch (error) {
      console.error('删除LLM配置失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async testConnection(req: Request, res: Response) {
    try {
      const { configId, apiKey, endpoint, model, provider } = req.body

      let testConfig: any = { apiKey, endpoint, model }

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          testConfig = {
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          }
        }
      } else if (provider) {
        testConfig.provider = provider
      }

      const isOllama = (testConfig.provider || provider) === 'ollama'
      if (!testConfig.apiKey && !isOllama) {
        res.json({ success: false, error: '缺少API密钥' })
        return
      }

      const result = await llmService.testConnection(testConfig)
      res.json({
        success: result.success,
        data: result,
        error: result.error
      })
    } catch (error) {
      console.error('测试连接失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateTables(req: Request, res: Response) {
    try {
      const { description, databaseType, configId } = req.body

      if (!description) {
        res.status(400).json({ success: false, error: '描述是必填项' })
        return
      }

      let configured = llmService.isConfigured()

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          llmService.configure({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          })
          configured = llmService.isConfigured()
        }
      }

      if (!configured) {
        res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' })
        return
      }

      const tables = await llmService.generateTables({ description, databaseType })

      res.json({
        success: true,
        data: tables
      })
    } catch (error) {
      console.error('生成表结构失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async analyzeColumns(req: Request, res: Response) {
    try {
      const { tableName, columns, databaseType, configId } = req.body

      if (!tableName || !columns || !Array.isArray(columns)) {
        res.status(400).json({ success: false, error: 'tableName和columns是必填项' })
        return
      }

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          llmService.configure({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          })
        }
      }

      if (!llmService.isConfigured()) {
        res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' })
        return
      }

      const analyzedColumns = await llmService.analyzeColumns({ tableName, columns, databaseType })

      res.json({
        success: true,
        data: analyzedColumns
      })
    } catch (error) {
      console.error('分析字段类型失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async suggestRelationships(req: Request, res: Response) {
    try {
      const { tables, configId } = req.body

      if (!tables || !Array.isArray(tables)) {
        res.status(400).json({ success: false, error: 'tables是必填项' })
        return
      }

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          llmService.configure({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          })
        }
      }

      if (!llmService.isConfigured()) {
        res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' })
        return
      }

      const suggestions = await llmService.suggestRelationships(tables as Table[])

      res.json({
        success: true,
        data: suggestions
      })
    } catch (error) {
      console.error('建议关系失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateMockData(req: Request, res: Response) {
    try {
      const request = req.body as MockDataRequest & { configId?: string }
      const configId = request.configId
      const result = await llmDataMockService.generateMockData(request, configId)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('生成模拟数据失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateBatchMockData(req: Request, res: Response) {
    try {
      const { requests, configId } = req.body as { requests: MockDataRequest[]; configId?: string }
      const results = await llmDataMockService.generateBatchMockData(requests, configId)
      res.json({ success: true, data: results })
    } catch (error) {
      console.error('批量生成模拟数据失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getMockTemplates(req: Request, res: Response) {
    try {
      const templates = await llmDataMockService.getTemplates()
      res.json({ success: true, data: templates })
    } catch (error) {
      console.error('获取模拟数据模板失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async createSnapshot(req: Request, res: Response) {
    try {
      const { projectId, operation, description, data } = req.body
      const snapshot = await llmConfigService.createSnapshot(projectId, operation, description, data)
      res.json({ success: true, data: { id: snapshot.id } })
    } catch (error) {
      console.error('创建快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getLatestSnapshot(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const snapshot = await llmConfigService.getLatestSnapshot(projectId)
      res.json({ success: true, data: snapshot })
    } catch (error) {
      console.error('获取最新快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async logOperation(req: Request, res: Response) {
    try {
      const { userId, projectId, operation, input, output, confirmed, snapshotId } = req.body
      const log = await llmConfigService.logOperation(
        userId,
        projectId,
        operation,
        input,
        output,
        confirmed,
        snapshotId
      )
      res.json({ success: true, data: { id: log.id } })
    } catch (error) {
      console.error('记录操作日志失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async restoreSnapshot(req: Request, res: Response) {
    try {
      const { snapshotId } = req.params
      const { projectId } = req.body
      const result = await llmConfigService.restoreSnapshot(snapshotId, projectId)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('恢复快照失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getSnapshots(req: Request, res: Response) {
    try {
      const { projectId } = req.params
      const snapshots = await llmConfigService.getSnapshotsByProject(projectId)
      res.json({ success: true, data: snapshots })
    } catch (error) {
      console.error('获取快照列表失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async saveConversationMessage(req: Request, res: Response) {
    try {
      const { userId, projectId, role, content, configId } = req.body
      const message = await llmConversationService.saveMessage(userId, projectId, role, content, configId)
      res.json({ success: true, data: { id: message.id } })
    } catch (error) {
      console.error('保存对话消息失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async getConversationHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const { projectId, limit } = req.query
      const history = await llmConversationService.getConversationHistory(
        userId,
        projectId as string | undefined,
        limit ? parseInt(limit as string) : 20
      )
      res.json({ success: true, data: history })
    } catch (error) {
      console.error('获取对话历史失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async clearConversationHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const { projectId } = req.body
      await llmConversationService.clearHistory(userId, projectId)
      res.json({ success: true, message: '对话历史已清空' })
    } catch (error) {
      console.error('清空对话历史失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async writeMockDataToDb(req: Request, res: Response) {
    try {
      const { connection, tableName, data } = req.body
      const result = await llmDataMockService.writeMockDataToDatabase(connection, tableName, data)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('写入数据库失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async testDbPerformance(req: Request, res: Response) {
    try {
      const { connection, options } = req.body
      if (!connection) {
        res.status(400).json({ success: false, error: '缺少连接配置' })
        return
      }
      const { dbPerformanceService } = await import('../services/dbPerformanceService')
      const result = await dbPerformanceService.runFullPerformanceTest(connection, options)
      res.json({ success: true, data: result })
    } catch (error: any) {
      console.error('数据库性能测试失败:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async testDbConnectionSpeed(req: Request, res: Response) {
    try {
      const { connection } = req.body
      if (!connection) {
        res.status(400).json({ success: false, error: '缺少连接配置' })
        return
      }
      const { dbPerformanceService } = await import('../services/dbPerformanceService')
      const result = await dbPerformanceService.testConnectionSpeed(connection)
      res.json({ success: true, data: result })
    } catch (error: any) {
      console.error('数据库连接速度测试失败:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async analyzeProject(req: Request, res: Response) {
    try {
      const { tables, configId } = req.body
      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        res.status(400).json({ success: false, error: 'tables是必填项且不能为空' })
        return
      }

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          llmService.configure({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          })
        }
      }

      if (!llmService.isConfigured()) {
        res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' })
        return
      }

      const result = await llmService.analyzeProject(tables as Table[], configId)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('项目分析失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async analyzeTable(req: Request, res: Response) {
    try {
      const { table, allTables, configId } = req.body
      if (!table) {
        res.status(400).json({ success: false, error: 'table是必填项' })
        return
      }

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          llmService.configure({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          })
        }
      }

      if (!llmService.isConfigured()) {
        res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' })
        return
      }

      const result = await llmService.analyzeTable(table as Table, (allTables || []) as Table[], configId)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('表分析失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async recommendTables(req: Request, res: Response) {
    try {
      const { existingTables, configId } = req.body
      if (!existingTables || !Array.isArray(existingTables)) {
        res.status(400).json({ success: false, error: 'existingTables是必填项' })
        return
      }

      if (configId) {
        const config = await llmConfigService.getDecryptedConfig(configId)
        if (config) {
          llmService.configure({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            model: config.model,
            provider: config.provider
          })
        }
      }

      if (!llmService.isConfigured()) {
        res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' })
        return
      }

      const result = await llmService.recommendTables(existingTables as Table[], configId)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('推荐表失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  // ====== 优化功能 ======

  async optimizeProject(req: Request, res: Response) {
    try {
      const { tables, configId } = req.body
      if (!tables || !Array.isArray(tables) || tables.length === 0) { res.status(400).json({ success: false, error: 'tables是必填项且不能为空' }); return }
      if (configId) { const config = await llmConfigService.getDecryptedConfig(configId); if (config) llmService.configure({ apiKey: config.apiKey, endpoint: config.endpoint, model: config.model, provider: config.provider }) }
      if (!llmService.isConfigured()) { res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' }); return }
      const result = await llmService.optimizeProject(tables as Table[], configId)
      res.json({ success: true, data: result })
    } catch (error) { console.error('项目优化失败:', error); res.status(500).json({ success: false, error: (error as Error).message }) }
  },

  async optimizeTable(req: Request, res: Response) {
    try {
      const { table, allTables, configId } = req.body
      if (!table) { res.status(400).json({ success: false, error: 'table是必填项' }); return }
      if (configId) { const config = await llmConfigService.getDecryptedConfig(configId); if (config) llmService.configure({ apiKey: config.apiKey, endpoint: config.endpoint, model: config.model, provider: config.provider }) }
      if (!llmService.isConfigured()) { res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' }); return }
      const result = await llmService.optimizeTable(table as Table, (allTables || []) as Table[], configId)
      res.json({ success: true, data: result })
    } catch (error) { console.error('表优化失败:', error); res.status(500).json({ success: false, error: (error as Error).message }) }
  },

  async optimizeTableStructure(req: Request, res: Response) {
    try {
      const { table, configId } = req.body
      if (!table) { res.status(400).json({ success: false, error: 'table是必填项' }); return }
      if (configId) { const config = await llmConfigService.getDecryptedConfig(configId); if (config) llmService.configure({ apiKey: config.apiKey, endpoint: config.endpoint, model: config.model, provider: config.provider }) }
      if (!llmService.isConfigured()) { res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' }); return }
      const result = await llmService.optimizeTableStructure(table as Table, configId)
      res.json({ success: true, data: result })
    } catch (error) { console.error('表结构优化失败:', error); res.status(500).json({ success: false, error: (error as Error).message }) }
  },

  async optimizeTableRelationships(req: Request, res: Response) {
    try {
      const { tables, existingRelationships, configId } = req.body
      if (!tables || !Array.isArray(tables)) { res.status(400).json({ success: false, error: 'tables是必填项' }); return }
      if (configId) { const config = await llmConfigService.getDecryptedConfig(configId); if (config) llmService.configure({ apiKey: config.apiKey, endpoint: config.endpoint, model: config.model, provider: config.provider }) }
      if (!llmService.isConfigured()) { res.status(400).json({ success: false, error: 'LLM服务未配置，请先设置API密钥' }); return }
      const result = await llmService.optimizeTableRelationships(tables as Table[], existingRelationships, configId)
      res.json({ success: true, data: result })
    } catch (error) { console.error('关系优化失败:', error); res.status(500).json({ success: false, error: (error as Error).message }) }
  }
}