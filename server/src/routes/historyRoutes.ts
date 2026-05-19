import { Router } from 'express'
import { historyController } from '../controllers/historyController'

const router = Router()

router.post('/', historyController.recordOperation)
router.get('/project/:projectId', historyController.getProjectHistory)
router.get('/project/:projectId/user/:userId', historyController.getUserHistory)
router.get('/project/:projectId/recent', historyController.getRecentActivity)
router.get('/project/:projectId/stats', historyController.getOperationStats)
router.get('/project/:projectId/user/:userId/count', historyController.getUserActivityCount)
router.delete('/project/:projectId', historyController.clearProjectHistory)

// 导出功能
router.get('/export/project/:projectId/:format', historyController.exportProjectHistory)
router.get('/export/project/:projectId/user/:userId/:format', historyController.exportUserHistory)

// 历史提醒
router.get('/project/:projectId/reminder', historyController.getProjectHistoryReminder)
router.get('/user/:userId/reminders', historyController.getUserHistoryReminders)

export default router