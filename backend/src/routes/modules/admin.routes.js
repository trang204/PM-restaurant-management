import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { requireAnyRole } from '../../middleware/requireAnyRole.js'

import * as adminReservations from '../../controllers/admin/reservations.admin.controller.js'
import * as adminMenu from '../../controllers/admin/menu.admin.controller.js'
import * as adminCategories from '../../controllers/admin/categories.admin.controller.js'
import * as adminUsers from '../../controllers/admin/users.admin.controller.js'
import * as adminReports from '../../controllers/admin/reports.admin.controller.js'
import * as adminDashboard from '../../controllers/admin/dashboard.admin.controller.js'

const router = Router()

const staff = [requireAuth, requireAnyRole('ADMIN', 'STAFF')]
const adminOnly = [requireAuth, requireRole('ADMIN')]

router.get('/dashboard', ...staff, adminDashboard.stats)

router.get('/reservations', ...staff, adminReservations.list)
router.get('/reservations/:id', ...staff, adminReservations.detail)
router.post('/reservations/:id/assign-table', ...staff, adminReservations.assignTable)
router.post('/reservations/:id/confirm', ...staff, adminReservations.confirm)
router.post('/reservations/:id/check-in', ...staff, adminReservations.checkIn)
router.post('/reservations/:id/cashier-pay', ...staff, adminReservations.cashierPay)
router.post('/reservations/:id/confirm-online-payment', ...staff, adminReservations.confirmOnlinePayment)
router.post('/reservations/:id/cancel', ...staff, adminReservations.cancelReservation)

router.get('/menu-items', ...staff, adminMenu.list)
router.post('/menu-items', ...adminOnly, adminMenu.create)
router.patch('/menu-items/:id', ...adminOnly, adminMenu.update)
router.delete('/menu-items/:id', ...adminOnly, adminMenu.remove)
router.post('/menu-items/:id/toggle-active', ...adminOnly, adminMenu.toggleActive)

router.get('/categories', ...staff, adminCategories.list)
router.post('/categories', ...adminOnly, adminCategories.create)
router.patch('/categories/:id', ...adminOnly, adminCategories.update)
router.delete('/categories/:id', ...adminOnly, adminCategories.remove)

router.get('/users', ...adminOnly, adminUsers.list)
router.post('/users', ...adminOnly, adminUsers.create)
router.patch('/users/:id/role', ...adminOnly, adminUsers.updateRole)
router.delete('/users/:id', ...adminOnly, adminUsers.remove)

router.get('/reports/revenue', ...staff, adminReports.revenue)

export default router
