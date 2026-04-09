import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { upload } from '../../middleware/upload.js'
import * as users from '../../controllers/users.controller.js'

const router = Router()

router.get('/me', requireAuth, users.getMe)
router.patch('/me', requireAuth, users.updateMe)
router.post('/me/avatar', requireAuth, upload.single('avatar'), users.uploadAvatar)
router.delete('/me/avatar', requireAuth, users.deleteAvatar)

export default router

