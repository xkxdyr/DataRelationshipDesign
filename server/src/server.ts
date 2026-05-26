import express from 'express'
import cors from 'cors'
import http from 'http'
import projectRoutes from './routes/projectRoutes'
import tableRoutes from './routes/tableRoutes'
import columnRoutes from './routes/columnRoutes'
import relationshipRoutes from './routes/relationshipRoutes'
import indexRoutes from './routes/indexRoutes'
import versionRoutes from './routes/versionRoutes'
import ddlRoutes from './routes/ddlRoutes'
import typeConvertRoutes from './routes/typeConvertRoutes'
import llmRoutes from './routes/llmRoutes'
import connectionRoutes from './routes/connectionRoutes'
import reverseEngineeringRoutes from './routes/reverseEngineeringRoutes'
import databaseSyncRoutes from './routes/databaseSyncRoutes'
import teamRoutes from './routes/teamRoutes'
import userRoutes from './routes/userRoutes'
import snapshotRoutes from './routes/snapshotRoutes'
import historyRoutes from './routes/historyRoutes'
import projectMemberRoutes from './routes/projectMemberRoutes'
import sessionRoutes from './routes/sessionRoutes'
import updateLogRoutes from './routes/updateLogRoutes'
import commentRoutes from './routes/commentRoutes'
import sqliteReaderRoutes from './routes/sqliteReaderRoutes'
import incrementalDdlRoutes from './routes/incrementalDdlRoutes'
import branchRoutes from './routes/branchRoutes'
import gitConfigRoutes from './routes/gitConfigRoutes'
import { userController } from './controllers/userController'
import { projectMemberController } from './controllers/projectMemberController'
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth'
import { CollabWebSocketServer } from './ws/server'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '数据库可视化设计工具后端运行正常' })
})

// 公开路由 - 无需认证（必须在需要认证的路由前面）
app.use('/api/ddl', ddlRoutes)
app.use('/api/ddl/incremental', incrementalDdlRoutes)
app.use('/api/type-convert', typeConvertRoutes)
app.use('/api/llm', llmRoutes)
app.use('/api/update-logs', updateLogRoutes)

// 用户路由 - 登录注册无需认证，其他需要
app.post('/api/users/register', userController.register)
app.post('/api/users/login', userController.login)
app.get('/api/users/search', userController.searchUsers)
app.get('/api/users/me', authMiddleware, userController.getCurrentUser)
// 必须在 /users/:userId 之前定义 /users/projects，否则会被当作 userId 处理
app.get('/api/users/projects', authMiddleware, projectMemberController.getUserProjects)
app.get('/api/users/:userId', authMiddleware, userController.getUserById)
app.get('/api/users/username/:username', authMiddleware, userController.getUserByUsername)

// 需要认证的路由 - 项目、表、列、关系、索引、版本等
app.use('/api/projects', authMiddleware, projectRoutes)
app.use('/api', authMiddleware, tableRoutes)
app.use('/api', authMiddleware, columnRoutes)
app.use('/api', authMiddleware, relationshipRoutes)
app.use('/api', authMiddleware, indexRoutes)
app.use('/api', authMiddleware, versionRoutes)
app.use('/api/connections', authMiddleware, connectionRoutes)
app.use('/api/reverse-engineering', authMiddleware, reverseEngineeringRoutes)
app.use('/api/database-sync', authMiddleware, databaseSyncRoutes)
app.use('/api/teams', authMiddleware, teamRoutes)
app.use('/api/snapshots', authMiddleware, snapshotRoutes)
app.use('/api/history', authMiddleware, historyRoutes)
app.use('/api', authMiddleware, projectMemberRoutes)
app.use('/api', authMiddleware, sessionRoutes)

// 分支管理路由
app.use('/api', authMiddleware, branchRoutes)

// Git 配置路由
app.use('/api', authMiddleware, gitConfigRoutes)

// 评论路由
app.use('/api', authMiddleware, commentRoutes)

// SQLite 本地数据库读取路由
app.use('/api/sqlite', authMiddleware, sqliteReaderRoutes)

// 404处理器 - 捕获所有未匹配的路由
app.use((req, res) => {
  console.warn(`404 - 未找到路由: ${req.method} ${req.path}`)
  res.status(404).json({ 
    success: false, 
    error: `路由未找到: ${req.method} ${req.path}` 
  })
})

const server = http.createServer(app)

// 初始化协作 WebSocket 服务
new CollabWebSocketServer(server)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT} (可通过 IP 访问)`)
  console.log(`🔌 WebSocket 协作服务已启动: ws://0.0.0.0:${PORT}/ws/collab`)
})
