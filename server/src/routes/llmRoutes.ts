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
router.get('/mock-templates', llmController.getMockTemplates)

router.post('/snapshot', llmController.createSnapshot)
router.get('/snapshot/:projectId/latest', llmController.getLatestSnapshot)

router.post('/log-operation', llmController.logOperation)

export default router