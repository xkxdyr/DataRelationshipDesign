import { Router } from 'express'
import { sessionController } from '../controllers/sessionController'

const router = Router()

router.get('/sessions/active', sessionController.getActiveSessions)
router.get('/sessions/all', sessionController.getAllSessions)
router.get('/sessions/settings', sessionController.getSessionSettings)
router.put('/sessions/settings', sessionController.updateSessionSettings)
router.delete('/sessions/:sessionId', sessionController.invalidateSession)
router.post('/sessions/invalidate-other', sessionController.invalidateOtherSessions)
router.post('/sessions/invalidate-all', sessionController.invalidateAllSessions)

export default router