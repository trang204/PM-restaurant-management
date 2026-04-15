import { Router } from 'express'
import * as tables from '../../controllers/tables.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { requireAnyRole } from '../../middleware/requireAnyRole.js'
import { upload } from '../../middleware/upload.js'

const router = Router()

// Public (for floorplan display on booking screen)
router.get('/', tables.listTables)
router.get('/:id', tables.getTable)

// Admin
router.post('/', requireAuth, requireRole('ADMIN'), tables.createTable)
router.post('/:id/image', requireAuth, requireRole('ADMIN'), upload.single('image'), tables.uploadImage)
router.patch('/:id', requireAuth, requireAnyRole('ADMIN', 'STAFF'), tables.updateTable)
router.delete('/:id', requireAuth, requireRole('ADMIN'), tables.deleteTable)

export default router

