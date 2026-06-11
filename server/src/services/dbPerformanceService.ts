import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface DbConnectionConfig {
  databaseType: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  sslEnabled?: boolean
}

export interface PerformanceTestResult {
  connectionTest: {
    success: boolean
    connectTimeMs: number
    error?: string
  }
  queryTest?: {
    success: boolean
    queryTimeMs: number
    rowsReturned: number
    error?: string
  }
  writeTest?: {
    success: boolean
    writeTimeMs: number
    rowsWritten: number
    writeSpeedPerSec: number
    error?: string
  }
  overallScore: 'excellent' | 'good' | 'fair' | 'poor'
  summary: string
}

class DbPerformanceService {

  async testConnectionSpeed(connection: DbConnectionConfig): Promise<{ success: boolean; connectTimeMs: number; error?: string }> {
    const startTime = Date.now()
    try {
      const dbType = (connection.databaseType || 'MYSQL').toUpperCase()
      if (dbType === 'SQLITE') {
        const Database = (await import('better-sqlite3')).default
        const db = new Database(connection.databaseName || connection.host)
        db.prepare('SELECT 1').get()
        db.close()
      } else if (dbType === 'MYSQL') {
        const mysql = await import('mysql2/promise')
        const conn = await mysql.createConnection({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.databaseName,
          ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 10000
        })
        await conn.execute('SELECT 1')
        await conn.end()
      } else if (dbType === 'POSTGRESQL') {
        // @ts-ignore
        const pg = await import('pg')
        const client = new pg.Client({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.databaseName,
          ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 10000
        })
        await client.connect()
        await client.query('SELECT 1')
        await client.end()
      } else {
        return { success: false, connectTimeMs: Date.now() - startTime, error: `不支持的数据库类型: ${dbType}` }
      }
      return { success: true, connectTimeMs: Date.now() - startTime }
    } catch (error: any) {
      return { success: false, connectTimeMs: Date.now() - startTime, error: error.message }
    }
  }

  async testQuerySpeed(connection: DbConnectionConfig, tableName?: string): Promise<{ success: boolean; queryTimeMs: number; rowsReturned: number; error?: string }> {
    try {
      const dbType = (connection.databaseType || 'MYSQL').toUpperCase()
      const targetTable = tableName || 'information_schema.tables'

      if (dbType === 'SQLITE') {
        const Database = (await import('better-sqlite3')).default
        const db = new Database(connection.databaseName || connection.host)
        const startTime = Date.now()
        const rows = db.prepare(`SELECT * FROM sqlite_master LIMIT 100`).all()
        const queryTimeMs = Date.now() - startTime
        db.close()
        return { success: true, queryTimeMs, rowsReturned: rows.length }
      } else if (dbType === 'MYSQL') {
        const mysql = await import('mysql2/promise')
        const conn = await mysql.createConnection({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.databaseName,
          ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined
        })
        const startTime = Date.now()
        const [rows] = await conn.execute(`SELECT * FROM information_schema.tables WHERE table_schema = ? LIMIT 100`, [connection.databaseName])
        const queryTimeMs = Date.now() - startTime
        await conn.end()
        return { success: true, queryTimeMs, rowsReturned: (rows as any[]).length }
      } else if (dbType === 'POSTGRESQL') {
        // @ts-ignore
        const pg = await import('pg')
        const client = new pg.Client({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.databaseName,
          ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined
        })
        await client.connect()
        const startTime = Date.now()
        const result = await client.query(`SELECT * FROM information_schema.tables WHERE table_schema = 'public' LIMIT 100`)
        const queryTimeMs = Date.now() - startTime
        await client.end()
        return { success: true, queryTimeMs, rowsReturned: result.rows.length }
      }
      return { success: false, queryTimeMs: 0, rowsReturned: 0, error: `不支持的数据库类型: ${dbType}` }
    } catch (error: any) {
      return { success: false, queryTimeMs: 0, rowsReturned: 0, error: error.message }
    }
  }

  async testWriteSpeed(connection: DbConnectionConfig, tableName: string, testRowCount: number = 100): Promise<{ success: boolean; writeTimeMs: number; rowsWritten: number; writeSpeedPerSec: number; error?: string }> {
    try {
      const dbType = (connection.databaseType || 'MYSQL').toUpperCase()
      const testTable = `__perf_test_${Date.now()}`

      if (dbType === 'SQLITE') {
        const Database = (await import('better-sqlite3')).default
        const db = new Database(connection.databaseName || connection.host)
        db.exec(`CREATE TABLE IF NOT EXISTS ${testTable} (id INTEGER PRIMARY KEY, name TEXT, value REAL, created_at TEXT)`)

        const startTime = Date.now()
        const insertMany = db.transaction(() => {
          const stmt = db.prepare(`INSERT INTO ${testTable} (name, value, created_at) VALUES (?, ?, ?)`)
          for (let i = 0; i < testRowCount; i++) {
            stmt.run(`test_${i}`, Math.random() * 1000, new Date().toISOString())
          }
        })
        insertMany()
        const writeTimeMs = Date.now() - startTime
        const writeSpeedPerSec = writeTimeMs > 0 ? Math.round(testRowCount / (writeTimeMs / 1000)) : 0

        db.exec(`DROP TABLE IF EXISTS ${testTable}`)
        db.close()
        return { success: true, writeTimeMs, rowsWritten: testRowCount, writeSpeedPerSec }
      } else if (dbType === 'MYSQL') {
        const mysql = await import('mysql2/promise')
        const conn = await mysql.createConnection({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.databaseName,
          ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined
        })

        await conn.execute(`CREATE TABLE IF NOT EXISTS ${testTable} (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), value DOUBLE, created_at VARCHAR(50))`)

        const startTime = Date.now()
        for (let i = 0; i < testRowCount; i++) {
          await conn.execute(`INSERT INTO ${testTable} (name, value, created_at) VALUES (?, ?, ?)`, [`test_${i}`, Math.random() * 1000, new Date().toISOString()])
        }
        const writeTimeMs = Date.now() - startTime
        const writeSpeedPerSec = writeTimeMs > 0 ? Math.round(testRowCount / (writeTimeMs / 1000)) : 0

        await conn.execute(`DROP TABLE IF EXISTS ${testTable}`)
        await conn.end()
        return { success: true, writeTimeMs, rowsWritten: testRowCount, writeSpeedPerSec }
      } else if (dbType === 'POSTGRESQL') {
        // @ts-ignore
        const pg = await import('pg')
        const client = new pg.Client({
          host: connection.host,
          port: connection.port,
          user: connection.username,
          password: connection.password,
          database: connection.databaseName,
          ssl: connection.sslEnabled ? { rejectUnauthorized: false } : undefined
        })
        await client.connect()

        await client.query(`CREATE TABLE IF NOT EXISTS ${testTable} (id SERIAL PRIMARY KEY, name VARCHAR(255), value DOUBLE PRECISION, created_at VARCHAR(50))`)

        const startTime = Date.now()
        for (let i = 0; i < testRowCount; i++) {
          await client.query(`INSERT INTO ${testTable} (name, value, created_at) VALUES ($1, $2, $3)`, [`test_${i}`, Math.random() * 1000, new Date().toISOString()])
        }
        const writeTimeMs = Date.now() - startTime
        const writeSpeedPerSec = writeTimeMs > 0 ? Math.round(testRowCount / (writeTimeMs / 1000)) : 0

        await client.query(`DROP TABLE IF EXISTS ${testTable}`)
        await client.end()
        return { success: true, writeTimeMs, rowsWritten: testRowCount, writeSpeedPerSec }
      }
      return { success: false, writeTimeMs: 0, rowsWritten: 0, writeSpeedPerSec: 0, error: `不支持的数据库类型: ${dbType}` }
    } catch (error: any) {
      return { success: false, writeTimeMs: 0, rowsWritten: 0, writeSpeedPerSec: 0, error: error.message }
    }
  }

  async runFullPerformanceTest(connection: DbConnectionConfig, options?: { testWrite?: boolean; testQuery?: boolean; writeRowCount?: number; tableName?: string }): Promise<PerformanceTestResult> {
    const result: PerformanceTestResult = {
      connectionTest: { success: false, connectTimeMs: 0 },
      overallScore: 'poor',
      summary: ''
    }

    // 1. 连接测试
    result.connectionTest = await this.testConnectionSpeed(connection)
    if (!result.connectionTest.success) {
      result.summary = `连接失败: ${result.connectionTest.error}`
      return result
    }

    // 2. 查询测试
    if (options?.testQuery !== false) {
      result.queryTest = await this.testQuerySpeed(connection, options?.tableName)
    }

    // 3. 写入测试
    if (options?.testWrite) {
      result.writeTest = await this.testWriteSpeed(connection, options?.tableName || 'test', options?.writeRowCount || 100)
    }

    // 4. 综合评分
    let score = 100
    if (result.connectionTest.connectTimeMs > 5000) score -= 40
    else if (result.connectionTest.connectTimeMs > 2000) score -= 20
    else if (result.connectionTest.connectTimeMs > 500) score -= 10

    if (result.queryTest) {
      if (!result.queryTest.success) score -= 30
      else if (result.queryTest.queryTimeMs > 3000) score -= 20
      else if (result.queryTest.queryTimeMs > 1000) score -= 10
    }

    if (result.writeTest) {
      if (!result.writeTest.success) score -= 30
      else if (result.writeTest.writeSpeedPerSec < 50) score -= 20
      else if (result.writeTest.writeSpeedPerSec < 200) score -= 10
    }

    result.overallScore = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'

    const parts: string[] = []
    parts.push(`连接: ${result.connectionTest.connectTimeMs}ms`)
    if (result.queryTest) parts.push(`查询: ${result.queryTest.queryTimeMs}ms`)
    if (result.writeTest) parts.push(`写入: ${result.writeTest.writeSpeedPerSec}条/秒`)
    result.summary = parts.join(' | ')

    return result
  }
}

export const dbPerformanceService = new DbPerformanceService()
