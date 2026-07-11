import { Column, Table } from '../generators/ddlGenerator'

export interface LLMConfig {
  apiKey: string
  endpoint: string
  model: string
  provider?: string
}

export interface TableSuggestion {
  tableName: string
  tableComment?: string
  columns: ColumnSuggestion[]
}

export interface ColumnSuggestion {
  name: string
  dataType: string
  length?: number
  precision?: number
  scale?: number
  nullable: boolean
  defaultValue?: string
  primaryKey: boolean
  unique: boolean
  comment?: string
}

export interface RelationshipSuggestion {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  relationshipType: string
  reason: string
}

export interface GenerateTableRequest {
  description: string
  databaseType?: string
}

export interface AnalyzeColumnsRequest {
  tableName: string
  columns: Array<{
    name: string
    description: string
  }>
  databaseType?: string
}

export interface ConnectionTestResult {
  success: boolean
  model?: string
  error?: string
  security: {
    isHttps: boolean
    isLocalhost: boolean
    endpointSecure: boolean
    apiKeyMasked: string
    apiKeyStrength: 'none' | 'weak' | 'good' | 'strong'
    warnings: string[]
    score: 'safe' | 'warning' | 'unsafe'
    summary: string
  }
  availability: {
    tested: boolean
    responseTimeMs: number
    modelConfirmed: boolean
    modelReported: string
    capable: boolean
    details: string
  }
}

// ====== 优化结果接口 ======
export interface OptimizeProjectResult {
  summary: string
  optimizations: Array<{ area: string; issue: string; suggestion: string; priority: 'high' | 'medium' | 'low' }>
  estimatedImpact: string
}

export interface OptimizeTableResult {
  tableName: string
  summary: string
  fieldOptimizations: Array<{ field: string; currentIssue: string; suggestedChange: string; reason: string }>
  indexSuggestions: Array<{ columns: string; type: string; reason: string }>
  constraintChanges: Array<{ type: string; detail: string; reason: string }>
  overallScore: { before: number; after: number }
}

export interface OptimizeStructureResult {
  tableName: string
  columnChanges: Array<{ columnName: string; currentType: string; suggestedType: string; currentLength: string | null; suggestedLength: string | null; reason: string; impact: string }>
  namingIssues: Array<{ currentName: string; suggestedName: string; reason: string }>
  missingConstraints: Array<{ column: string; constraint: string; reason: string }>
}

export interface OptimizeRelationshipsResult {
  summary: string
  relationshipOptimizations: Array<{ fromTable: string; toTable: string; fromColumn: string; toColumn: string; currentIssue: string; suggestedAction: string; actionType: string; reason: string }>
  namingStandard: string[]
  cascadeRecommendations: Array<{ relationship: string; recommendation: string }>
  redundancyWarnings: Array<{ description: string; suggestion: string }>
}

const defaultConfig: LLMConfig = {
  apiKey: '',
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4'
}

function assessApiKeyStrength(apiKey: string, isOllama: boolean): ConnectionTestResult['security']['apiKeyStrength'] {
  if (!apiKey || isOllama) return 'none'
  if (apiKey.length >= 40) return 'strong'
  if (apiKey.length >= 30) return 'good'
  return 'weak'
}

function maskApiKey(apiKey: string): string {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length)
  return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4)
}

function buildSecurityResult(endpoint: string, apiKey: string, isOllama: boolean, warnings: string[]): ConnectionTestResult['security'] {
  const isLocalhost = /localhost|127\.0\.0\.1|::1|0\.0\.0\.0/.test(endpoint)
  const isHttps = endpoint.startsWith('https://')
  const endpointSecure = isHttps || (isLocalhost && !isHttps)
  const apiKeyMasked = isOllama ? '无需密钥' : maskApiKey(apiKey)
  const apiKeyStrength = assessApiKeyStrength(apiKey, isOllama)

  let score: ConnectionTestResult['security']['score']
  if (!endpointSecure && !isLocalhost) {
    score = 'unsafe'
  } else if (warnings.length > 0) {
    score = 'warning'
  } else {
    score = 'safe'
  }

  const parts: string[] = []
  if (isHttps) parts.push('HTTPS 加密')
  else if (isLocalhost) parts.push('本地连接')
  else parts.push('HTTP 明文')

  if (isOllama) parts.push('Ollama 本地模型')
  else if (apiKey) parts.push(`密钥强度: ${apiKeyStrength}`)
  else parts.push('未配置密钥')

  if (warnings.length > 0) parts.push(`${warnings.length}个安全警告`)

  return {
    isHttps,
    isLocalhost,
    endpointSecure,
    apiKeyMasked,
    apiKeyStrength,
    warnings,
    score,
    summary: parts.join(' | ')
  }
}

function buildAvailabilityResult(): ConnectionTestResult['availability'] {
  return {
    tested: false,
    responseTimeMs: 0,
    modelConfirmed: false,
    modelReported: '',
    capable: false,
    details: '未进行可用性测试'
  }
}

class LLMService {
  private config: LLMConfig = { ...defaultConfig }

  configure(config: Partial<LLMConfig>) {
    this.config = { ...this.config, ...config }
  }

  getConfig(): LLMConfig {
    return { ...this.config }
  }

  isConfigured(): boolean {
    const isOllama = this.config.provider === 'ollama'
    return !!this.config.endpoint && (isOllama || !!this.config.apiKey)
  }

  async testConnection(config?: Partial<LLMConfig>): Promise<ConnectionTestResult> {
    const testConfig = config ? { ...this.config, ...config } : this.config
    const isOllama = testConfig.provider === 'ollama'

    const endpoint = testConfig.endpoint || ''
    const isLocalhost = /localhost|127\.0\.0\.1|::1|0\.0\.0\.0/.test(endpoint)
    const isHttps = endpoint.startsWith('https://')
    const isStandardPort = /:\d+/.test(new URL(endpoint.replace(/\/$/, '')).hostname + (new URL(endpoint.replace(/\/$/, '')).port || ''))
    let endpointUrl: URL
    try {
      endpointUrl = new URL(endpoint.replace(/\/$/, ''))
    } catch {
      return {
        success: false,
        error: '端点格式无效',
        security: buildSecurityResult(endpoint, testConfig.apiKey || '', isOllama, []),
        availability: buildAvailabilityResult()
      }
    }

    const port = endpointUrl.port
    const hasNonStandardPort = port !== '' && port !== '443' && port !== '80'

    const securityWarnings: string[] = []
    if (!isHttps && !isLocalhost) {
      securityWarnings.push('端点使用 HTTP 明文传输，API 密钥可能被中间人截获')
    }
    if (!isHttps && isLocalhost) {
      securityWarnings.push('本地 HTTP 连接，数据不出本机，但仍建议生产环境使用 HTTPS')
    }
    if (hasNonStandardPort && !isLocalhost) {
      securityWarnings.push(`端点使用非标准端口 ${port}，请确认这是预期的服务端口`)
    }

    const apiKey = testConfig.apiKey || ''
    const apiKeyStrength = assessApiKeyStrength(apiKey, isOllama)

    if (apiKey && !isOllama) {
      if (apiKey.length < 20) {
        securityWarnings.push('API 密钥长度过短，可能不是有效的密钥')
      }
    }

    const security = buildSecurityResult(endpoint, apiKey, isOllama, securityWarnings)

    if (!testConfig.endpoint) {
      return {
        success: false,
        error: '端点未配置',
        security,
        availability: buildAvailabilityResult()
      }
    }
    if (!testConfig.apiKey && !isOllama) {
      return {
        success: false,
        error: 'API密钥未配置',
        security,
        availability: buildAvailabilityResult()
      }
    }

    const startTime = Date.now()
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (testConfig.apiKey && !isOllama) {
        headers['Authorization'] = `Bearer ${testConfig.apiKey}`
      }

      const response = await fetch(`${testConfig.endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: testConfig.model,
          messages: [
            {
              role: 'user',
              content: 'Reply with exactly: OK'
            }
          ],
          max_tokens: 10,
          temperature: 0
        })
      })

      const responseTimeMs = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
        const errMsg = errorData.error?.message || response.statusText
        if (response.status === 401 || response.status === 403) {
          securityWarnings.push('API 密钥认证失败，请检查密钥是否正确')
        }
        return {
          success: false,
          error: `连接失败: ${response.status} - ${errMsg}`,
          security: buildSecurityResult(endpoint, apiKey, isOllama, securityWarnings),
          availability: {
            tested: true,
            responseTimeMs,
            modelConfirmed: false,
            modelReported: '',
            capable: false,
            details: `服务器返回状态码 ${response.status}${errMsg ? `: ${errMsg}` : ''}`
          }
        }
      }

      const data = await response.json() as any
      const content = data?.choices?.[0]?.message?.content || ''
      const modelReported = data?.model || testConfig.model || ''
      const capable = content.length > 0 && responseTimeMs < 30000
      const modelConfirmed = !!data?.model

      return {
        success: true,
        model: modelReported,
        security,
        availability: {
          tested: true,
          responseTimeMs,
          modelConfirmed,
          modelReported,
          capable,
          details: capable
            ? `模型响应正常，耗时 ${responseTimeMs}ms`
            : `模型响应异常：${content ? '内容为空' : `响应超时(${responseTimeMs}ms)`}`
        }
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime
      const errMsg = (error as Error).message
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ENOTFOUND')) {
        securityWarnings.push('无法连接到目标服务器，请检查端点地址和网络')
      }
      return {
        success: false,
        error: `连接测试失败: ${errMsg}`,
        security: buildSecurityResult(endpoint, apiKey, isOllama, securityWarnings),
        availability: {
          tested: true,
          responseTimeMs,
          modelConfirmed: false,
          modelReported: '',
          capable: false,
          details: errMsg
        }
      }
    }
  }

  async generateTables(request: GenerateTableRequest, conversationHistory?: Array<{ role: string; content: string }>): Promise<TableSuggestion[]> {
    if (!this.isConfigured()) {
      throw new Error('LLM服务未配置，请先设置API密钥和端点')
    }

    const prompt = this.buildTableGenerationPrompt(request)

    try {
      const response = await this.callLLM(prompt, undefined, conversationHistory)
      return this.parseTableSuggestions(response)
    } catch (error) {
      console.error('LLM生成表结构失败:', error)
      throw error
    }
  }

  async analyzeColumns(request: AnalyzeColumnsRequest): Promise<ColumnSuggestion[]> {
    if (!this.isConfigured()) {
      throw new Error('LLM服务未配置，请先设置API密钥和端点')
    }

    const prompt = this.buildColumnAnalysisPrompt(request)

    try {
      const response = await this.callLLM(prompt)
      return this.parseColumnSuggestions(response)
    } catch (error) {
      console.error('LLM分析字段失败:', error)
      throw error
    }
  }

  async suggestRelationships(tables: Table[]): Promise<RelationshipSuggestion[]> {
    if (!this.isConfigured()) {
      throw new Error('LLM服务未配置，请先设置API密钥和端点')
    }

    const prompt = this.buildRelationshipSuggestionPrompt(tables)

    try {
      const response = await this.callLLM(prompt)
      return this.parseRelationshipSuggestions(response)
    } catch (error) {
      console.error('LLM建议关系失败:', error)
      throw error
    }
  }

  private buildTableGenerationPrompt(request: GenerateTableRequest): string {
    const dbNote = request.databaseType
      ? `目标数据库类型: ${request.databaseType}。请使用适合该数据库的数据类型。`
      : '请使用通用的数据类型。'

    return `你是一个专业的数据库设计师。请根据以下描述生成表结构。

描述: ${request.description}
${dbNote}

请生成符合以下JSON格式的表结构数组:
{
  "tables": [
    {
      "tableName": "表名(使用PascalCase)",
      "tableComment": "表的中文注释",
      "columns": [
        {
          "name": "字段名(使用camelCase)",
          "dataType": "数据类型(如VARCHAR, INT, DATETIME等)",
          "length": 字段长度(数字),
          "nullable": 是否可空(true/false),
          "primaryKey": 是否为主键(true/false),
          "unique": 是否唯一(true/false),
          "defaultValue": 默认值(可选),
          "comment": "字段注释"
        }
      ]
    }
  ]
}

请确保:
1. 每个表有合理的字段组合
2. 主键字段使用适当的类型(如INT自增或UUID)
3. 外键字段与主表主键类型匹配
4. 只返回JSON，不要有其他文字`
  }

  private buildColumnAnalysisPrompt(request: AnalyzeColumnsRequest): string {
    const dbNote = request.databaseType
      ? `目标数据库类型: ${request.databaseType}。请使用适合该数据库的数据类型。`
      : '请使用通用的数据类型。'

    return `你是一个专业的数据库设计师。请为以下字段推荐合适的数据类型。

表名: ${request.tableName}
字段描述:
${request.columns.map(c => `- ${c.name}: ${c.description}`).join('\n')}
${dbNote}

请生成符合以下JSON格式的字段建议:
{
  "columns": [
    {
      "name": "字段名",
      "dataType": "推荐的数据类型",
      "length": 长度(数字，可选),
      "precision": 精度(数字，可选),
      "scale": 小数位(数字，可选),
      "nullable": 是否可空(true/false),
      "primaryKey": 是否主键(true/false),
      "unique": 是否唯一(true/false),
      "defaultValue": 默认值(可选),
      "comment": "字段注释"
    }
  ]
}

请确保:
1. 根据字段含义选择最合适的数据类型
2. 字符串字段使用VARCHAR并设置合理长度
3. 数字字段根据范围选择INT/BIGINT/DECIMAL
4. 日期字段根据精度选择DATE/DATETIME/TIMESTAMP
5. 只返回JSON，不要有其他文字`
  }

  private buildRelationshipSuggestionPrompt(tables: Table[]): string {
    const tableInfos = tables.map(t => ({
      name: t.name,
      comment: t.comment || '',
      columns: t.columns.map(c => ({
        name: c.name,
        type: c.dataType,
        isPK: c.primaryKey,
        comment: c.comment || ''
      }))
    }))

    return `你是一个专业的数据库设计师。请分析以下表结构，推荐可能的外键关系。

表结构:
${JSON.stringify(tableInfos, null, 2)}

请生成符合以下JSON格式的关系建议:
{
  "relationships": [
    {
      "sourceTable": "源表名",
      "sourceColumn": "源字段名",
      "targetTable": "目标表名",
      "targetColumn": "目标字段名",
      "relationshipType": "关系类型(ONE_TO_ONE/ONE_TO_MANY)",
      "reason": "建立关系的理由"
    }
  ]
}

请确保:
1. 外键字段类型必须与主表主键类型匹配
2. 只推荐有意义的关系，不要过度关联
3. 考虑业务逻辑上的包含关系
4. 只返回JSON，不要有其他文字`
  }

  async callLLMWithConfig(configId: string, prompt: string, systemPrompt?: string): Promise<string> {
    const { llmConfigService } = await import('./llmConfigService')
    const config = await llmConfigService.getDecryptedConfig(configId)
    if (!config) throw new Error('配置不存在')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (config.apiKey && config.provider !== 'ollama') {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`LLM API调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content || ''
  }

  private async callLLM(prompt: string, systemPrompt?: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.config.apiKey && this.config.provider !== 'ollama') {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const messages: Array<{ role: string; content: string }> = []

    // 添加系统提示
    const sysPrompt = systemPrompt || '你是一个专业的数据库设计师助手，擅长根据需求设计高效的数据库表结构。'
    messages.push({ role: 'system', content: sysPrompt })

    // 添加对话历史
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory)
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: prompt
    })

    const response = await fetch(`${this.config.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`LLM API调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content || ''
  }

  private parseTableSuggestions(response: string): TableSuggestion[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法解析LLM返回的内容')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (parsed.tables && Array.isArray(parsed.tables)) {
        return parsed.tables.map((t: any) => ({
          tableName: t.tableName || t.name,
          tableComment: t.tableComment || t.comment,
          columns: (t.columns || []).map((c: any) => ({
            name: c.name,
            dataType: c.dataType || c.type,
            length: c.length ? parseInt(c.length) : undefined,
            precision: c.precision ? parseInt(c.precision) : undefined,
            scale: c.scale ? parseInt(c.scale) : undefined,
            nullable: c.nullable !== false,
            defaultValue: c.defaultValue,
            primaryKey: c.primaryKey === true,
            unique: c.unique === true,
            comment: c.comment
          }))
        }))
      }

      return []
    } catch (error) {
      console.error('解析表结构建议失败:', error)
      throw new Error('解析LLM返回内容失败: ' + (error as Error).message)
    }
  }

  private parseColumnSuggestions(response: string): ColumnSuggestion[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法解析LLM返回的内容')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (parsed.columns && Array.isArray(parsed.columns)) {
        return parsed.columns.map((c: any) => ({
          name: c.name,
          dataType: c.dataType || c.type,
          length: c.length ? parseInt(c.length) : undefined,
          precision: c.precision ? parseInt(c.precision) : undefined,
          scale: c.scale ? parseInt(c.scale) : undefined,
          nullable: c.nullable !== false,
          primaryKey: c.primaryKey === true,
          unique: c.unique === true,
          defaultValue: c.defaultValue,
          comment: c.comment
        }))
      }

      return []
    } catch (error) {
      console.error('解析字段建议失败:', error)
      throw new Error('解析LLM返回内容失败: ' + (error as Error).message)
    }
  }

  async analyzeProject(tables: Table[], configId?: string): Promise<{
    summary: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    normalizationScore: number
    coverageScore: number
  }> {
    const prompt = this.buildProjectAnalysisPrompt(tables)
    const response = configId
      ? await this.callLLMWithConfig(configId, prompt)
      : await this.callLLM(prompt)
    return this.parseProjectAnalysis(response)
  }

  async analyzeTable(table: Table, allTables: Table[], configId?: string): Promise<{
    summary: string
    columnAnalysis: Array<{ name: string; assessment: string; suggestion?: string }>
    indexSuggestions: string[]
    relationshipSuggestions: string[]
    designScore: number
  }> {
    const prompt = this.buildTableAnalysisPrompt(table, allTables)
    const response = configId
      ? await this.callLLMWithConfig(configId, prompt)
      : await this.callLLM(prompt)
    return this.parseTableAnalysis(response)
  }

  async recommendTables(existingTables: Table[], configId?: string): Promise<TableSuggestion[]> {
    const prompt = this.buildTableRecommendationPrompt(existingTables)
    const response = configId
      ? await this.callLLMWithConfig(configId, prompt)
      : await this.callLLM(prompt)
    return this.parseTableSuggestions(response)
  }

  private buildProjectAnalysisPrompt(tables: Table[], projectContext?: string): string {
    const tableInfos = tables.map(t => ({
      name: t.name,
      comment: t.comment || '',
      columns: t.columns.map(c => ({
        name: c.name,
        type: c.dataType,
        isPK: c.primaryKey,
        nullable: c.nullable,
        comment: c.comment || ''
      }))
    }))

    // 提取项目上下文（前端可能附加在数组上）
    const ctx = projectContext || (tables as any)._projectContext || ''
    const contextSection = ctx ? `\n\n【项目背景信息】\n${ctx}\n\n请结合以上项目背景进行分析评估。` : ''

    return `你是一个资深的数据库架构师。请分析以下项目的数据库设计，给出专业的评估和建议。
${contextSection}
项目表结构:
${JSON.stringify(tableInfos, null, 2)}

请生成符合以下JSON格式的分析结果:
{
  "summary": "项目整体概述（100字以内）",
  "strengths": ["设计优点1", "设计优点2", ...],
  "weaknesses": ["设计不足1", "设计不足2", ...],
  "suggestions": ["改进建议1", "改进建议2", ...],
  "normalizationScore": 范式评分(0-100),
  "coverageScore": 业务覆盖度评分(0-100)
}

请确保:
1. strengths至少列出2条优点
2. weaknesses如实指出设计问题
3. suggestions给出具体可操作的改进方案
4. normalizationScore评估是否满足第三范式
5. coverageScore评估表结构是否覆盖常见业务场景
6. 只返回JSON，不要有其他文字`
  }

  private buildTableAnalysisPrompt(table: Table, allTables: Table[]): string {
    const tableInfo = {
      name: table.name,
      comment: table.comment || '',
      columns: table.columns.map(c => ({
        name: c.name,
        type: c.dataType,
        isPK: c.primaryKey,
        nullable: c.nullable,
        unique: c.unique,
        comment: c.comment || ''
      }))
    }
    const relatedTables = allTables
      .filter(t => t.name !== table.name)
      .map(t => ({ name: t.name, comment: t.comment || '' }))

    return `你是一个资深的数据库架构师。请深入分析以下表的设计质量。

当前表:
${JSON.stringify(tableInfo, null, 2)}

项目中的其他表:
${JSON.stringify(relatedTables, null, 2)}

请生成符合以下JSON格式的分析结果:
{
  "summary": "表设计概述（50字以内）",
  "columnAnalysis": [
    {
      "name": "字段名",
      "assessment": "字段评估",
      "suggestion": "改进建议（可选，无建议则省略）"
    }
  ],
  "indexSuggestions": ["索引建议1", "索引建议2"],
  "relationshipSuggestions": ["关系建议1", "关系建议2"],
  "designScore": 设计评分(0-100)
}

请确保:
1. 对每个字段给出评估
2. 索引建议基于查询场景
3. 关系建议考虑与其他表的关联
4. designScore综合评估字段类型、命名、约束等
5. 只返回JSON，不要有其他文字`
  }

  private buildTableRecommendationPrompt(existingTables: Table[]): string {
    const tableInfos = existingTables.map(t => ({
      name: t.name,
      comment: t.comment || '',
      columns: t.columns.map(c => ({
        name: c.name,
        type: c.dataType,
        isPK: c.primaryKey,
        comment: c.comment || ''
      }))
    }))

    // 提取项目上下文
    const ctx = (existingTables as any)._projectContext || ''
    const contextSection = ctx ? `\n\n【项目背景信息】\n${ctx}\n\n请结合以上项目背景推荐与业务相关的新表。` : ''

    return `你是一个专业的数据库设计师。根据以下已有的表结构，推荐可能还需要的新表。
${contextSection}
已有表结构:
${JSON.stringify(tableInfos, null, 2)}

请推荐3-5个与现有表互补的新表，生成符合以下JSON格式的表结构:
{
  "tables": [
    {
      "tableName": "表名(使用PascalCase)",
      "tableComment": "表的中文注释",
      "columns": [
        {
          "name": "字段名(使用camelCase)",
          "dataType": "数据类型",
          "length": 字段长度(数字，可选),
          "nullable": 是否可空(true/false),
          "primaryKey": 是否为主键(true/false),
          "unique": 是否唯一(true/false),
          "defaultValue": 默认值(可选),
          "comment": "字段注释"
        }
      ]
    }
  ]
}

请确保:
1. 推荐的表与现有业务相关且互补
2. 考虑常见业务场景如日志、配置、分类、统计等
3. 每个表有合理的字段和主键
4. 只返回JSON，不要有其他文字`
  }

  private parseProjectAnalysis(response: string): {
    summary: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    normalizationScore: number
    coverageScore: number
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('无法解析LLM返回的内容')
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || '',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
        normalizationScore: typeof parsed.normalizationScore === 'number' ? parsed.normalizationScore : 0,
        coverageScore: typeof parsed.coverageScore === 'number' ? parsed.coverageScore : 0
      }
    } catch (error) {
      console.error('解析项目分析结果失败:', error)
      throw new Error('解析LLM返回内容失败: ' + (error as Error).message)
    }
  }

  private parseTableAnalysis(response: string): {
    summary: string
    columnAnalysis: Array<{ name: string; assessment: string; suggestion?: string }>
    indexSuggestions: string[]
    relationshipSuggestions: string[]
    designScore: number
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('无法解析LLM返回的内容')
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || '',
        columnAnalysis: (parsed.columnAnalysis || []).map((c: any) => ({
          name: c.name || '',
          assessment: c.assessment || '',
          suggestion: c.suggestion
        })),
        indexSuggestions: parsed.indexSuggestions || [],
        relationshipSuggestions: parsed.relationshipSuggestions || [],
        designScore: typeof parsed.designScore === 'number' ? parsed.designScore : 0
      }
    } catch (error) {
      console.error('解析表分析结果失败:', error)
      throw new Error('解析LLM返回内容失败: ' + (error as Error).message)
    }
  }

  private parseRelationshipSuggestions(response: string): RelationshipSuggestion[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法解析LLM返回的内容')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (parsed.relationships && Array.isArray(parsed.relationships)) {
        return parsed.relationships.map((r: any) => ({
          sourceTable: r.sourceTable || r.sourceTableName,
          sourceColumn: r.sourceColumn || r.sourceColumnName,
          targetTable: r.targetTable || r.targetTableName,
          targetColumn: r.targetColumn || r.targetColumnName,
          relationshipType: r.relationshipType || 'ONE_TO_MANY',
          reason: r.reason || ''
        }))
      }

      return []
    } catch (error) {
      console.error('解析关系建议失败:', error)
      throw new Error('解析LLM返回内容失败: ' + (error as Error).message)
    }
  }

  // ====== 优化功能 ======

  /** 优化项目整体：基于分析结果给出可执行的优化方案 */
  async optimizeProject(tables: Table[], configId?: string): Promise<OptimizeProjectResult> {
    const prompt = this.buildOptimizeProjectPrompt(tables)
    const response = configId ? await this.callLLMWithConfig(configId, prompt) : await this.callLLM(prompt)
    return this.parseOptimizationResult(response)
  }

  /** 优化单个表：字段/索引/约束的优化建议 */
  async optimizeTable(table: Table, allTables: Table[], configId?: string): Promise<OptimizeTableResult> {
    const prompt = this.buildOptimizeTablePrompt(table, allTables)
    const response = configId ? await this.callLLMWithConfig(configId, prompt) : await this.callLLM(prompt)
    return this.parseTableOptimizationResult(response)
  }

  /** 优化表结构：细粒度字段类型/长度/命名规范 */
  async optimizeTableStructure(table: Table, configId?: string): Promise<OptimizeStructureResult> {
    const prompt = this.buildOptimizeTableStructurePrompt(table)
    const response = configId ? await this.callLLMWithConfig(configId, prompt) : await this.callLLM(prompt)
    return this.parseTableStructureOptimizationResult(response)
  }

  /** 优化表关系：外键/关联策略/命名规范 */
  async optimizeTableRelationships(tables: Table[], existingRelationships?: any[], configId?: string): Promise<OptimizeRelationshipsResult> {
    const prompt = this.buildOptimizeRelationshipsPrompt(tables, existingRelationships || [])
    const response = configId ? await this.callLLMWithConfig(configId, prompt) : await this.callLLM(prompt)
    return this.parseRelationshipsOptimizationResult(response)
  }

  // ====== Prompt构建方法 ======

  private buildOptimizeProjectPrompt(tables: Table[]): string {
    const tableInfos = tables.map(t => ({
      name: t.name,
      comment: t.comment || '',
      columnCount: t.columns?.length || 0,
      hasPrimaryKey: t.columns?.some(c => c.primaryKey) || false,
      indexes: (t.indexes || []).map(i => i.name),
      relationships: []
    }))
    const ctx = (tables as any)._projectContext || ''
    return `你是一个数据库架构优化专家。请对以下项目进行全面优化分析，给出具体、可执行的优化方案。

${ctx ? `【项目背景】\n${ctx}\n\n` : ''}【当前表结构概览】
${JSON.stringify(tableInfos, null, 2)}

【详细表结构】
${JSON.stringify(tables.map(t => ({ name: t.name, comment: t.comment || '', columns: t.columns.map(c => ({ name: c.name, type: c.dataType, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, comment: c.comment || '' })) })), null, 2)}

【输出要求 - 必须严格按JSON格式返回】
{
  "summary": "总体优化概述（1-2句话）",
  "optimizations": [
    { "area": "范式设计|索引策略|命名规范|数据类型|冗余消除|性能优化", "issue": "当前问题描述", "suggestion": "具体优化建议", "priority": "high|medium|low" }
  ],
  "estimatedImpact": "预期效果描述"
}

请给出至少5条有价值的优化建议，涵盖不同维度。只返回JSON。`
  }

  private buildOptimizeTablePrompt(table: Table, allTables: Table[]): string {
    const tableInfo = { name: table.name, comment: table.comment || '', columns: table.columns.map(c => ({ name: c.name, type: c.dataType, length: c.length, isPK: c.primaryKey, nullable: c.nullable, unique: c.unique, defaultValue: c.defaultValue, comment: c.comment || '', autoIncrement: c.autoIncrement || false })) }
    const relatedTables = allTables.filter(t => t.name !== table.name).map(t => ({ name: t.name, comment: t.comment || '', columns: t.columns.map(c => ({ name: c.name, type: c.dataType, isPK: c.primaryKey })) }))
    return `你是一个数据库表结构优化专家。请对以下表进行深度优化分析，给出具体的、可直接执行的优化方案。

【目标表】
${JSON.stringify(tableInfo, null, 2)}

【项目中其他相关表】
${JSON.stringify(relatedTables, null, 2)}

【输出要求 - 必须严格按JSON格式返回】
{
  "tableName": "${table.name}",
  "summary": "优化总结（1-2句）",
  "fieldOptimizations": [
    { "field": "字段名", "currentIssue": "当前问题", "suggestedChange": "建议改为", "reason": "原因" }
  ],
  "indexSuggestions": [
    { "columns": "列名或列名列表", "type": "INDEX|UNIQUE|FULLTEXT", "reason": "原因" }
  ],
  "constraintChanges": [
    { "type": "NOT NULL|CHECK|DEFAULT|FOREIGN_KEY", "detail": "具体内容", "reason": "原因" }
  ],
  "overallScore": { "before": 0-100, "after": 0-100 }
}

请至少给出3条字段优化、1条索引建议、1条约束变更。评分要合理反映优化前后差距。只返回JSON。`
  }

  private buildOptimizeTableStructurePrompt(table: Table): string {
    const colDetails = table.columns.map(c => ({
      name: c.name, dataType: c.dataType, length: c.length, precision: c.precision,
      scale: c.scale, primaryKey: c.primaryKey, nullable: c.nullable, unique: c.unique,
      defaultValue: c.defaultValue, autoIncrement: c.autoIncrement || false, comment: c.comment || ''
    }))
    return `你是一个数据库字段级优化专家。请对以下表的每个字段进行细粒度审查，检查数据类型选择、长度定义、命名规范等。

【目标表: ${table.name}】${table.comment ? ` (${table.comment})` : ''}
【字段详情】
${JSON.stringify(colDetails, null, 2)}

【输出要求 - 必须严格按JSON格式返回】
{
  "tableName": "${table.name}",
  "columnChanges": [
    { "columnName": "字段名", "currentType": "当前类型", "suggestedType": "建议类型", "currentLength": "当前长度", "suggestedLength": "建议长度", "reason": "原因", "impact": "performance|storage|consistency|usability" }
  ],
  "namingIssues": [
    { "currentName": "当前名称", "suggestedName": "建议名称", "reason": "原因" }
  ],
  "missingConstraints": [
    { "column": "列名", "constraint": "缺少的约束类型", "reason": "原因" }
  ]
}

重点检查：
1. VARCHAR长度是否过大或过小（如VARCHAR(255)是否需要）
2. INT vs BIGINT vs SMALLINT 选择是否合适
3. DECIMAL精度是否匹配业务需求
4. 字段命名是否符合规范（如is_前缀布尔、_at后缀时间）
5. 是否缺少必要的NOT NULL/CHECK/DEFAULT约束
6. 是否有不必要的AUTO_INCREMENT

对每个需要修改的字段给出明确理由。只返回JSON。`
  }

  private buildOptimizeRelationshipsPrompt(tables: Table[], existingRelationships: any[]): string {
    const tablePKs = tables.map(t => ({ name: t.name, pkColumns: t.columns.filter(c => c.primaryKey).map(c => ({ name: c.name, type: c.dataType })), otherColumns: t.columns.filter(c => !c.primaryKey && !c.name.toLowerCase().includes('id')).map(c => ({ name: c.name, type: c.dataType, comment: c.comment || '' })) }))
    return `你是一个数据库关系设计专家。请分析以下项目的表间关系，给出优化方案。

【所有表及其主键和外键候选列】
${JSON.stringify(tablePKs, null, 2)}
${existingRelationships.length > 0 ? `\n【现有关系】\n${JSON.stringify(existingRelationships, null, 2)}` : ''}

【输出要求 - 必须严格按JSON格式返回】
{
  "summary": "关系优化总结",
  "relationshipOptimizations": [
    { "fromTable": "", "toTable": "", "fromColumn": "", "toColumn": "", "currentIssue": "", "suggestedAction": "", "actionType": "add|modify|remove|rename", "reason": "" }
  ],
  "namingStandard": ["外键命名规范建议1", "建议2"],
  "cascadeRecommendations": [{ "relationship": "哪个关系", "recommendation": "CASCADE/SET NULL/RESTRICT 建议" }],
  "redundancyWarnings": [{ "description": "冗余描述", "suggestion": "优化建议" }]
}

重点检查：
1. 缺少的外键关系（如user_id字段但无外键）
2. 外键命名是否符合规范（如fk_表名_列名）
3. 级联删除策略是否合理
4. 数据冗余（如重复存储的名称/状态）
5. 多对多关系是否有中间表
6. 自引用关系处理

至少给出3条关系优化建议。只返回JSON。`
  }

  // ====== 解析方法 ======

  private parseOptimizationResult(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('未找到JSON')
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('解析优化结果失败:', error)
      return { summary: response.slice(0, 200), optimizations: [], estimatedImpact: '解析失败' }
    }
  }

  private parseTableOptimizationResult(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('未找到JSON')
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('解析表优化结果失败:', error)
      return { tableName: 'unknown', summary: response.slice(0, 200), fieldOptimizations: [], indexSuggestions: [], constraintChanges: [], overallScore: { before: 50, after: 50 } }
    }
  }

  private parseTableStructureOptimizationResult(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('未找到JSON')
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('解析表结构优化结果失败:', error)
      return { tableName: 'unknown', columnChanges: [], namingIssues: [], missingConstraints: [] }
    }
  }

  private parseRelationshipsOptimizationResult(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('未找到JSON')
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('解析关系优化结果失败:', error)
      return { summary: response.slice(0, 200), relationshipOptimizations: [], namingStandard: [], cascadeRecommendations: [], redundancyWarnings: [] }
    }
  }
}

export const llmService = new LLMService()