import * as fs from 'fs'
import * as path from 'path'

const LOG_FILE_PATH = path.join(__dirname, '../../../logs/update.log')

export interface LogEntry {
  id: string
  date: string
  type: 'feature' | 'bugfix' | 'security' | 'other'
  version: string
  description: string
  operator: string
}

function parseLogLine(line: string): LogEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const datePattern = /^(\d{4}-\d{2}-\d{2})\s+/
  const dateMatch = trimmed.match(datePattern)
  if (!dateMatch) return null

  const date = dateMatch[1]
  const rest = trimmed.substring(dateMatch[0].length)

  const typePattern = /^\[([^\]]+)\]\s*/
  const typeMatch = rest.match(typePattern)
  let type: LogEntry['type'] = 'other'
  let description = rest

  if (typeMatch) {
    const typeStr = typeMatch[1].toLowerCase().trim()
    if (typeStr === 'feature' || typeStr === 'feat' || typeStr === '功能') type = 'feature'
    else if (typeStr === 'fix' || typeStr === 'bugfix' || typeStr === '修复' || typeStr.includes('fix')) type = 'bugfix'
    else if (typeStr === 'security' || typeStr === '安全') type = 'security'
    else type = 'other'
    description = rest.substring(typeMatch[0].length)
  }

  const operatorPattern = /\s+-\s+(.+)$/
  const operatorMatch = description.match(operatorPattern)
  let operator = '系统'
  if (operatorMatch) {
    operator = operatorMatch[1].trim()
    description = description.substring(0, description.length - operatorMatch[0].length)
  }

  return {
    id: `log_${date}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date,
    type,
    version: 'v1.0.0',
    description: description.trim(),
    operator
  }
}

export const updateLogService = {
  getLogs(): LogEntry[] {
    if (!fs.existsSync(LOG_FILE_PATH)) {
      return []
    }

    const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8')
    const lines = content.split('\n')
    const logs: LogEntry[] = []

    for (const line of lines) {
      const entry = parseLogLine(line)
      if (entry) {
        logs.unshift(entry)
      }
    }

    return logs
  },

  addLog(type: string, description: string, operator?: string) {
    const date = new Date().toISOString().split('T')[0]
    const typeMap: Record<string, string> = {
      feature: '功能',
      bugfix: '修复',
      security: '安全',
      other: '增强'
    }
    const logType = typeMap[type] || '更新'
    const logLine = `${date} [${logType}] ${description} - ${operator || '系统'}\n`

    const logDir = path.dirname(LOG_FILE_PATH)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    fs.appendFileSync(LOG_FILE_PATH, logLine, 'utf-8')
  }
}