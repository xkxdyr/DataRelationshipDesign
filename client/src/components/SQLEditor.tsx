import React, { useState, useCallback } from 'react'
import { Button, Input, Table, Card, Space, Alert, Tag } from 'antd'
import { PlayCircleOutlined, RestOutlined, DownloadOutlined, CopyOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { message } from 'antd'

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  error?: string
  executionTime?: number
}

interface SQLEditorProps {
  connectionId?: string
  onClose?: () => void
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

const SQLEditor: React.FC<SQLEditorProps> = ({ connectionId, onClose }) => {
  const { tabs, activeTabId, openTab, updateTabContent } = useAppStore()
  const [sql, setSql] = useState(SQL_EDITOR_DEFAULT)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [databases, setDatabases] = useState<string[]>([])
  const [tables, setTables] = useState<string[]>([])
  const [selectedDb, setSelectedDb] = useState<string>('')

  const handleSqlChange = useCallback((value: string) => {
    setSql(value)
    if (activeTabId) {
      updateTabContent(activeTabId, { sqlContent: value, unsaved: true })
    }
  }, [activeTabId, updateTabContent])

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

      if (activeTabId) {
        updateTabContent(activeTabId, { unsaved: false })
      }
    } catch (error) {
      setResult({
        columns: [],
        rows: [],
        error: error instanceof Error ? error.message : '执行失败'
      })
    } finally {
      setIsExecuting(false)
    }
  }, [sql, activeTabId, updateTabContent])

  const handleReset = useCallback(() => {
    setSql(SQL_EDITOR_DEFAULT)
    setResult(null)
    if (activeTabId) {
      updateTabContent(activeTabId, { sqlContent: SQL_EDITOR_DEFAULT, unsaved: false })
    }
  }, [activeTabId, updateTabContent])

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
      .concat(result.rows.map(row => result.columns.map(col => `"${String(row[col] || '')}"`).join(',')))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  }, [result])

  const handleOpenNewTab = useCallback(() => {
    openTab({
      type: 'sql',
      title: 'SQL查询',
      closable: true,
      sqlContent: SQL_EDITOR_DEFAULT
    })
  }, [openTab])

  const handleLoadSchema = useCallback(async () => {
    const mockDbs = ['example_db', 'test_db', 'production']
    const mockTables = ['users', 'orders', 'products', 'categories', 'comments']
    setDatabases(mockDbs)
    setTables(mockTables)
    setSelectedDb('example_db')
    message.success('已加载数据库架构')
  }, [])

  const insertTable = useCallback((tableName: string) => {
    setSql(prev => prev + tableName + ' ')
    if (activeTabId) {
      updateTabContent(activeTabId, { unsaved: true })
    }
  }, [activeTabId, updateTabContent])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <DatabaseOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          <span style={styles.headerTitle}>SQL编辑器</span>
          <Button
            type="text"
            size="small"
            onClick={handleOpenNewTab}
            style={{ marginLeft: 12 }}
          >
            + 新建查询
          </Button>
        </div>
        <Space>
          <Button
            type="text"
            size="small"
            onClick={handleLoadSchema}
            icon={<DatabaseOutlined />}
          >
            加载架构
          </Button>
          {connectionId && (
            <Tag color="blue">已连接</Tag>
          )}
        </Space>
      </div>

      <div style={styles.mainContent}>
        {tables.length > 0 && (
          <div style={styles.schemaPanel}>
            <div style={styles.schemaHeader}>
              <span>数据库: {selectedDb}</span>
            </div>
            <div style={styles.tableList}>
              {tables.map(table => (
                <div
                  key={table}
                  style={styles.tableItem}
                  onClick={() => insertTable(table)}
                >
                  <span>{table}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.editorWrapper}>
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
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#252526',
    borderBottom: '1px solid #3c3c3c',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#d4d4d4',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  schemaPanel: {
    width: 200,
    background: '#252526',
    borderRight: '1px solid #3c3c3c',
    display: 'flex',
    flexDirection: 'column',
  },
  schemaHeader: {
    padding: '8px 12px',
    background: '#3c3c3c',
    fontSize: 12,
    fontWeight: 600,
  },
  tableList: {
    flex: 1,
    overflow: 'auto',
    padding: 4,
  },
  tableItem: {
    padding: '6px 8px',
    cursor: 'pointer',
    borderRadius: 4,
  },
  editorWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: '#252526',
    borderBottom: '1px solid #3c3c3c',
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
    overflow: 'auto',
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

export default SQLEditor
