import express from 'express'
import cors from 'cors'
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

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '数据库可视化设计工具后端运行正常' })
})

app.use('/api/projects', projectRoutes)
app.use('/api', tableRoutes)
app.use('/api', columnRoutes)
app.use('/api', relationshipRoutes)
app.use('/api', indexRoutes)
app.use('/api', versionRoutes)
app.use('/api', ddlRoutes)
app.use('/api', typeConvertRoutes)
app.use('/api', llmRoutes)
app.use('/api/connections', connectionRoutes)
app.use('/api/reverse-engineering', reverseEngineeringRoutes)
app.use('/api/database-sync', databaseSyncRoutes)
app.use('/api/teams', teamRoutes)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT} (可通过 IP 访问)`)
})
