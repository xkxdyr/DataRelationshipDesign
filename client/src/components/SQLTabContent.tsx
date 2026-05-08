import React, { useState, useCallback } from 'react'
import { Button, Input, Table, Card, Space, Alert } from 'antd'
import { PlayCircleOutlined, RestOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { message } from 'antd'

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  error?: string
  executionTime?: number
}

const SQL_EDITOR_DEFAULT = `-- 在此输入 SQL 查询语句
-- 示例: SELECT * FROM your_table LIMIT 100;

SELECT * FROM 
`

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING',
  'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
  'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'DEFAULT', 'NULL', 'NOT NULL', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'CASCADE', 'RESTRICT',
  'TRUNCATE', 'RENAME', 'VIEW', 'INDEX', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'CASE',
  'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'DISTINCT', 'EXISTS', 'COUNT',
  'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CASE', 'WHEN', 'THEN', 'ELSE'
]

const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING', 'UPPER', 'LOWER',
  'TRIM', 'LENGTH', 'ROUND', 'FLOOR', 'CEIL', 'NOW', 'CURDATE', 'CURTIME', 'DATEDIFF',
  'TIMESTAMPDIFF', 'IFNULL', 'COALESCE', 'NULLIF', 'CAST', 'CONVERT'
]

const highlightSQL = (sql: string): string => {
  let highlighted = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  SQL_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi')
    highlighted = highlighted.replace(regex, '<span class="sql-keyword">$1</span>')
  })

  SQL_FUNCTIONS.forEach(func => {
    const regex = new RegExp(`\\b(${func})\\s*\\(`, 'gi')
    highlighted = highlighted.replace(regex, '<span class="sql-function">$1</span>(')
  })

  highlighted = highlighted.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>')
  highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>')
  highlighted = highlighted.replace(/--(.*)/g, '<span class="sql-comment">--$1</span>')

  return highlighted
}

const SQLTabContent: React.FC<{ tabId: string; content?: string }> = ({ tabId, content }) => {
  const { updateTabContent } = useAppStore()
  const [sql, setSql] = useState(content || SQL_EDITOR_DEFAULT)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSqlChange = useCallback((value: string) => {
    setSql(value)
    updateTabContent(tabId, { sqlContent: value, unsaved: true })
  }, [tabId, updateTabContent])

  const handleExecute = useCallback(async () => {
    if (!sql.trim()) {
      message.warning('请输入SQL语句')
      return
    }

    setIsExecuting(true)
    setResult(null)

    try {
      const startTime = Date.now()
      
      const mockRows = Array.from({ length: Math.floor(Math.random() * 50) + 10 }, (_, i) => ({
        id: i + 1,
        name: `记录${i + 1}`,
        status: Math.random() > 0.5 ? 'active' : 'inactive',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 1000)
      }))

      const executionTime = Date.now() - startTime

      setResult({
        columns: ['id', 'name', 'status', 'createdAt', 'count'],
        rows: mockRows,
        executionTime
      })

      updateTabContent(tabId, { unsaved: false })
    } catch (error) {
      setResult({
        columns: [],
        rows: [],
        error: error instanceof Error ? error.message : '执行失败'
      })
    } finally {
      setIsExecuting(false)
    }
  }, [sql, tabId, updateTabContent])

  const handleReset = useCallback(() => {
    setSql(SQL_EDITOR_DEFAULT)
    setResult(null)
    updateTabContent(tabId, { sqlContent: SQL_EDITOR_DEFAULT, unsaved: false })
  }, [tabId, updateTabContent])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    message.success('已复制到剪贴板')
  }, [sql])

  const handleExport = useCallback(() => {
    if (!result || result.rows.length === 0) {
      message.warning('没有数据可导出')
      return
    }

    const csv = [result.columns.join(',')]
      .concat(result.rows.map(row => result.columns.map(col => `"${row[col]}"`).join(',')))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  }, [result])

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleExecute}
            loading={isExecuting}
            disabled={isExecuting}
          >
            执行
          </Button>
          <Button icon={<RestOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<CopyOutlined />} onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </Button>
          {result && result.rows.length > 0 && (
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出CSV
            </Button>
          )}
        </Space>
        <div style={styles.statusBar}>
          <span style={styles.lineInfo}>
            {sql.split('\n').length} 行
          </span>
        </div>
      </div>

      <div style={styles.editorContainer}>
        <textarea
          value={sql}
          onChange={(e) => handleSqlChange(e.target.value)}
          style={styles.textarea}
          spellCheck={false}
          placeholder="输入SQL查询语句..."
        />
        <div style={styles.highlightOverlay} dangerouslySetInnerHTML={{ __html: highlightSQL(sql) + '\n' }} />
      </div>

      {result && (
        <div style={styles.resultContainer}>
          {result.error ? (
            <Alert
              message="执行错误"
              description={result.error}
              type="error"
              style={{ marginBottom: 16 }}
            />
          ) : (
            <>
              <div style={styles.resultHeader}>
                <span style={styles.resultTitle}>查询结果</span>
                <span style={styles.resultStats}>
                  {result.rows.length} 行记录 · {result.executionTime}ms
                </span>
              </div>
              <Card style={styles.resultCard}>
                <Table
                  dataSource={result.rows}
                  columns={result.columns.map(col => ({
                    title: col,
                    dataIndex: col,
                    key: col,
                    ellipsis: true,
                  }))}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条记录`
                  }}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1e1e1e',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#252526',
    borderBottom: '1px solid #3c3c3c',
    flexShrink: 0,
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  lineInfo: {
    color: '#858585',
    fontSize: 12,
  },
  editorContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 200,
  },
  textarea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    padding: '12px',
    background: 'transparent',
    color: 'transparent',
    caretColor: '#d4d4d4',
    border: 'none',
    outline: 'none',
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    fontSize: 14,
    lineHeight: 1.5,
    resize: 'none',
    whiteSpace: 'pre',
    overflowWrap: 'normal',
    overflowX: 'auto',
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: '12px',
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: 'pre',
    overflowWrap: 'normal',
    overflowX: 'auto',
    pointerEvents: 'none',
    color: '#d4d4d4',
    wordBreak: 'break-all',
  },
  resultContainer: {
    padding: 16,
    borderTop: '1px solid #3c3c3c',
    backgroundColor: '#1e1e1e',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    color: '#d4d4d4',
    fontSize: 14,
    fontWeight: 600,
  },
  resultStats: {
    color: '#858585',
    fontSize: 12,
  },
  resultCard: {
    backgroundColor: '#252526',
    border: 'none',
  },
}

export default SQLTabContent
