import { Router } from 'express'
import * as tableSession from '../../controllers/tableSession.controller.js'

const router = Router()

router.patch('/:token/items/:itemId', tableSession.updateItem)
router.delete('/:token/items/:itemId', tableSession.removeItem)
router.post('/:token/items', tableSession.addItem)
router.get('/:token', tableSession.getSessionContext)

export default router
