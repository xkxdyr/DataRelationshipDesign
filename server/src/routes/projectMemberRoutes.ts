import { Router } from 'express'
import { projectMemberController } from '../controllers/projectMemberController'
import { inviteController } from '../controllers/inviteController'

const router = Router()

router.get('/users/projects', projectMemberController.getUserProjects)
router.get('/projects/:projectId/members', projectMemberController.getProjectMembers)
router.post('/projects/:projectId/members', projectMemberController.addMember)
router.delete('/projects/:projectId/members/:userId', projectMemberController.removeMember)
router.put('/projects/:projectId/members/:userId/role', projectMemberController.updateMemberRole)
router.get('/projects/:projectId/permission', projectMemberController.checkPermission)

router.post('/projects/:projectId/invites', inviteController.createInvite)
router.get('/projects/:projectId/invites', inviteController.getInvites)
router.delete('/projects/:projectId/invites/:inviteCode', inviteController.revokeInvite)
router.post('/projects/invites/validate', inviteController.validateInvite)
router.post('/projects/invites/join', inviteController.joinProject)

export default router