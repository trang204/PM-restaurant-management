import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import * as orders from '../../controllers/orders.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

router.post('/', orders.createOrder)
router.get('/:id', orders.getOrderDetail)
router.post('/:id/items', orders.addFoodToOrder)
router.patch('/:id/items/:itemId', orders.updateItemQuantity)
router.patch('/:id/status', orders.changeOrderStatus)

export default router

