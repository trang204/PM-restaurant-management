import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { requireAnyRole } from '../../middleware/requireAnyRole.js'
import { upload } from '../../middleware/upload.js'
import * as settings from '../../controllers/admin/settings.admin.controller.js'
import * as settingsPublic from '../../controllers/settings.public.controller.js'

const router = Router()

router.get('/public', settingsPublic.getPublicSettings)

router.get('/', requireAuth, requireAnyRole('ADMIN', 'STAFF'), settings.getSettings)
router.patch('/', requireAuth, requireRole('ADMIN'), settings.updateSettings)
router.post('/logo', requireAuth, requireRole('ADMIN'), upload.single('logo'), settings.uploadLogo)
router.post('/banners', requireAuth, requireRole('ADMIN'), upload.array('banners', 10), settings.uploadBanners)
router.delete('/banners', requireAuth, requireRole('ADMIN'), settings.removeBanner)

export default router
