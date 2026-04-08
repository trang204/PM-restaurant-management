import { Router } from 'express'

import authRoutes from './modules/auth.routes.js'
import userRoutes from './modules/users.routes.js'
import menuRoutes from './modules/menu.routes.js'
import tableRoutes from './modules/tables.routes.js'
import reservationRoutes from './modules/reservations.routes.js'
import adminRoutes from './modules/admin.routes.js'
import orderRoutes from './modules/orders.routes.js'
import paymentRoutes from './modules/payments.routes.js'
import settingsRoutes from './modules/settings.routes.js'
import tableSessionRoutes from './modules/tableSession.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/menu', menuRoutes)
router.use('/tables', tableRoutes)
router.use('/reservations', reservationRoutes)
router.use('/admin', adminRoutes)
router.use('/orders', orderRoutes)
router.use('/payments', paymentRoutes)
router.use('/settings', settingsRoutes)
router.use('/table-session', tableSessionRoutes)

export default router

