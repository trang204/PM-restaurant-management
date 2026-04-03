import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import * as users from '../../controllers/users.controller.js'

const router = Router()

router.get('/me', requireAuth, users.getMe)
router.patch('/me', requireAuth, users.updateMe)

export default router

