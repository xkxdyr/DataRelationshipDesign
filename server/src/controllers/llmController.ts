import { Request, Response } from 'express'
import { llmConfigService, LLMConfigCreate, LLMConfigUpdate } from '../services/llmConfigService'
import { llmDataMockService, MockDataRequest } from '../services/llmDataMockService'
import { llmService, TableSuggestion, ColumnSuggestion, RelationshipSuggestion } from '../services/llmService'
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
      const request = req.body as MockDataRequest
      const result = llmDataMockService.generateMockData(request)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('生成模拟数据失败:', error)
      res.status(500).json({ success: false, error: (error as Error).message })
    }
  },

  async generateBatchMockData(req: Request, res: Response) {
    try {
      const requests = req.body as MockDataRequest[]
      const results = await llmDataMockService.generateBatchMockData(requests)
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
  }
}