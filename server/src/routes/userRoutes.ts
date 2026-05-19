import express from 'express'
import { userController } from '../controllers/userController'

const router = express.Router()

router.post('/register', userController.register)
router.post('/login', userController.login)
router.get('/me', userController.getCurrentUser)
router.get('/:userId', userController.getUserById)
router.get('/username/:username', userController.getUserByUsername)
router.get('/search', userController.searchUsers)
router.get('/projects', userController.getUserProjects)

export default router
