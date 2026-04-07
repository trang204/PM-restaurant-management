import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js'
import * as reservations from '../../controllers/reservations.controller.js'

const router = Router()

// Customer
router.get('/', requireAuth, reservations.listMyReservations)
router.post('/', optionalAuth, reservations.createReservation)
router.get('/:id', optionalAuth, reservations.getReservationDetail)
router.post('/:id/cancel', requireAuth, reservations.cancelReservation)

// Hold table 15 minutes (optional flow)
router.post('/:id/hold', reservations.holdTable)

// Payment (online)
router.post('/:id/payments/online-intent', requireAuth, reservations.createOnlinePaymentIntent)
router.post('/:id/payments/online-mark-paid', requireAuth, reservations.markOnlinePaidByCustomer)

export default router

