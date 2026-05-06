import { Router } from 'express'
import { teamController } from '../controllers/teamController'

const router = Router()

router.post('/', teamController.createTeam)
router.get('/', teamController.getAllTeams)
router.get('/user/:userId', teamController.getTeamsByUserId)
router.get('/:teamId', teamController.getTeamById)
router.put('/:teamId', teamController.updateTeam)
router.delete('/:teamId', teamController.deleteTeam)
router.post('/:teamId/members', teamController.addMember)
router.delete('/:teamId/members/:userId', teamController.removeMember)
router.put('/:teamId/members/:userId/role', teamController.updateMemberRole)
router.get('/:teamId/members/:userId/is-member', teamController.isMember)
router.get('/:teamId/members/:userId/is-admin', teamController.isAdmin)

export default router