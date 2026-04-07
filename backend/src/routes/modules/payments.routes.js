import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import * as payments from '../../controllers/payments.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

router.post('/', payments.createPayment)
router.patch('/:id/status', payments.updatePaymentStatus)
router.get('/order/:orderId', payments.getPaymentByOrder)

export default router

