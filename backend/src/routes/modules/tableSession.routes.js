import { Router } from 'express'
import * as tableSession from '../../controllers/tableSession.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'

const router = Router()

router.get('/me', requireAuth, tableSession.getMyActiveSession)
router.post('/:token/submit', tableSession.submitOrder)
router.get('/:token/payment', tableSession.getPayment)
router.post('/:token/payment', tableSession.createPayment)
router.patch('/:token/items/:itemId', tableSession.updateItem)
router.delete('/:token/items/:itemId', tableSession.removeItem)
router.post('/:token/items', tableSession.addItem)
router.get('/:token', tableSession.getSessionContext)

export default router
