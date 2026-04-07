import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'

import * as adminReservations from '../../controllers/admin/reservations.admin.controller.js'
import * as adminMenu from '../../controllers/admin/menu.admin.controller.js'
import * as adminCategories from '../../controllers/admin/categories.admin.controller.js'
import * as adminUsers from '../../controllers/admin/users.admin.controller.js'
import * as adminReports from '../../controllers/admin/reports.admin.controller.js'
import * as adminDashboard from '../../controllers/admin/dashboard.admin.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

// Dashboard
router.get('/dashboard', adminDashboard.stats)

// Reservations management
router.get('/reservations', adminReservations.list)
router.get('/reservations/:id', adminReservations.detail)
router.post('/reservations/:id/assign-table', adminReservations.assignTable)
router.post('/reservations/:id/confirm', adminReservations.confirm)
router.post('/reservations/:id/check-in', adminReservations.checkIn)
router.post('/reservations/:id/cashier-pay', adminReservations.cashierPay)
router.post('/reservations/:id/confirm-online-payment', adminReservations.confirmOnlinePayment)
router.post('/reservations/:id/cancel', adminReservations.cancelReservation)

// Menu items
router.get('/menu-items', adminMenu.list)
router.post('/menu-items', adminMenu.create)
router.patch('/menu-items/:id', adminMenu.update)
router.delete('/menu-items/:id', adminMenu.remove)
router.post('/menu-items/:id/toggle-active', adminMenu.toggleActive)

// Categories
router.get('/categories', adminCategories.list)
router.post('/categories', adminCategories.create)
router.patch('/categories/:id', adminCategories.update)
router.delete('/categories/:id', adminCategories.remove)

// Users
router.get('/users', adminUsers.list)
router.post('/users', adminUsers.create)
router.patch('/users/:id/role', adminUsers.updateRole)
router.delete('/users/:id', adminUsers.remove)

// Reports
router.get('/reports/revenue', adminReports.revenue)

export default router

