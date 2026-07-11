import { Router } from 'express'
import { llmController } from '../controllers/llmController'

const router = Router()

router.get('/configs/user/:userId', llmController.getUserConfigs)
router.get('/configs/team/:teamId', llmController.getTeamConfigs)
router.post('/configs/user/:userId', llmController.createUserConfig)
router.post('/configs/team/:teamId', llmController.createTeamConfig)
router.put('/configs/:configId', llmController.updateConfig)
router.delete('/configs/:configId', llmController.deleteConfig)

router.post('/test-connection', llmController.testConnection)
router.post('/generate-tables', llmController.generateTables)
router.post('/analyze-columns', llmController.analyzeColumns)
router.post('/suggest-relationships', llmController.suggestRelationships)

router.post('/mock-data', llmController.generateMockData)
router.post('/mock-data/batch', llmController.generateBatchMockData)
router.post('/mock-data/write-to-db', llmController.writeMockDataToDb)
router.get('/mock-templates', llmController.getMockTemplates)

router.post('/snapshot', llmController.createSnapshot)
router.get('/snapshot/:projectId/latest', llmController.getLatestSnapshot)
router.get('/snapshot/:projectId/list', llmController.getSnapshots)
router.post('/snapshot/:snapshotId/restore', llmController.restoreSnapshot)

router.post('/log-operation', llmController.logOperation)

router.post('/conversation', llmController.saveConversationMessage)
router.get('/conversation/:userId', llmController.getConversationHistory)
router.delete('/conversation/:userId', llmController.clearConversationHistory)

router.post('/db-performance', llmController.testDbPerformance)
router.post('/db-connection-speed', llmController.testDbConnectionSpeed)

router.post('/analyze-project', llmController.analyzeProject)
router.post('/analyze-table', llmController.analyzeTable)
router.post('/recommend-tables', llmController.recommendTables)

// ====== 优化功能 ======
router.post('/optimize-project', llmController.optimizeProject)
router.post('/optimize-table', llmController.optimizeTable)
router.post('/optimize-table-structure', llmController.optimizeTableStructure)
router.post('/optimize-relationships', llmController.optimizeTableRelationships)

export default router