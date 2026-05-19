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

  async generateTables(request: GenerateTableRequest): Promise<TableSuggestion[]> {
    if (!this.isConfigured()) {
      throw new Error('LLM服务未配置，请先设置API密钥和端点')
    }

    const prompt = this.buildTableGenerationPrompt(request)

    try {
      const response = await this.callLLM(prompt)
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

  private async callLLM(prompt: string): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (this.config.apiKey && this.config.provider !== 'ollama') {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(`${this.config.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的数据库设计师助手，擅长根据需求设计高效的数据库表结构。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
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
}

export const llmService = new LLMService()