import { Router } from 'express'
import * as zones from '../../controllers/zones.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'

const router = Router()

router.get('/', zones.listZones)                                          // public: booking page cần
router.post('/', requireAuth, requireRole('ADMIN'), zones.createZone)
router.delete('/:id', requireAuth, requireRole('ADMIN'), zones.deleteZone)

export default router
