import { Router } from 'express'
import { llmService, TableSuggestion, ColumnSuggestion, RelationshipSuggestion } from '../generators/llmService'
import { Table } from '../generators/ddlGenerator'

const router = Router()

router.post('/llm/config', (req, res) => {
  try {
    const { apiKey, endpoint, model } = req.body

    if (!apiKey) {
      res.status(400).json({ error: 'API密钥是必填项' })
      return
    }

    llmService.configure({
      apiKey,
      endpoint: endpoint || 'https://api.openai.com/v1',
      model: model || 'gpt-4'
    })

    res.json({
      success: true,
      message: 'LLM配置已更新',
      configured: llmService.isConfigured()
    })
  } catch (error) {
    console.error('配置LLM失败:', error)
    res.status(500).json({ error: '配置LLM失败: ' + (error as Error).message })
  }
})

router.get('/llm/config', (req, res) => {
  const config = llmService.getConfig()
  res.json({
    success: true,
    result: {
      configured: llmService.isConfigured(),
      hasApiKey: !!config.apiKey,
      endpoint: config.endpoint,
      model: config.model
    }
  })
})

router.post('/llm/generate-tables', async (req, res) => {
  try {
    const { description, databaseType } = req.body

    if (!description) {
      res.status(400).json({ error: '描述是必填项' })
      return
    }

    if (!llmService.isConfigured()) {
      res.status(400).json({ error: 'LLM服务未配置，请先设置API密钥' })
      return
    }

    const tables = await llmService.generateTables({ description, databaseType })

    res.json({
      success: true,
      result: tables
    })
  } catch (error) {
    console.error('生成表结构失败:', error)
    res.status(500).json({ error: '生成表结构失败: ' + (error as Error).message })
  }
})

router.post('/llm/analyze-columns', async (req, res) => {
  try {
    const { tableName, columns, databaseType } = req.body

    if (!tableName || !columns || !Array.isArray(columns)) {
      res.status(400).json({ error: 'tableName和columns是必填项' })
      return
    }

    if (!llmService.isConfigured()) {
      res.status(400).json({ error: 'LLM服务未配置，请先设置API密钥' })
      return
    }

    const analyzedColumns = await llmService.analyzeColumns({ tableName, columns, databaseType })

    res.json({
      success: true,
      result: analyzedColumns
    })
  } catch (error) {
    console.error('分析字段类型失败:', error)
    res.status(500).json({ error: '分析字段类型失败: ' + (error as Error).message })
  }
})

router.post('/llm/suggest-relationships', async (req, res) => {
  try {
    const { tables } = req.body

    if (!tables || !Array.isArray(tables)) {
      res.status(400).json({ error: 'tables是必填项' })
      return
    }

    if (!llmService.isConfigured()) {
      res.status(400).json({ error: 'LLM服务未配置，请先设置API密钥' })
      return
    }

    const suggestions = await llmService.suggestRelationships(tables as Table[])

    res.json({
      success: true,
      result: suggestions
    })
  } catch (error) {
    console.error('建议关系失败:', error)
    res.status(500).json({ error: '建议关系失败: ' + (error as Error).message })
  }
})

export default router
