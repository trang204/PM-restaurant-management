import { Router } from 'express'

import authRoutes from './modules/auth.routes.js'
import userRoutes from './modules/users.routes.js'
import menuRoutes from './modules/menu.routes.js'
import tableRoutes from './modules/tables.routes.js'
import reservationRoutes from './modules/reservations.routes.js'
import adminRoutes from './modules/admin.routes.js'
import orderRoutes from './modules/orders.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/menu', menuRoutes)
router.use('/tables', tableRoutes)
router.use('/reservations', reservationRoutes)
router.use('/admin', adminRoutes)
router.use('/orders', orderRoutes)

export default router

