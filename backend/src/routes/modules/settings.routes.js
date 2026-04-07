import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { upload } from '../../middleware/upload.js'
import * as settings from '../../controllers/admin/settings.admin.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

router.get('/', settings.getSettings)
router.patch('/', settings.updateSettings)
router.post('/logo', upload.single('logo'), settings.uploadLogo)

export default router

