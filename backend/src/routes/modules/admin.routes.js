import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { requireAnyRole } from '../../middleware/requireAnyRole.js'
import { upload } from '../../middleware/upload.js'

import * as adminReservations from '../../controllers/admin/reservations.admin.controller.js'
import * as adminMenu from '../../controllers/admin/menu.admin.controller.js'
import * as adminCategories from '../../controllers/admin/categories.admin.controller.js'
import * as adminUsers from '../../controllers/admin/users.admin.controller.js'
import * as adminReports from '../../controllers/admin/reports.admin.controller.js'
import * as adminDashboard from '../../controllers/admin/dashboard.admin.controller.js'
import * as adminSettings from '../../controllers/admin/settings.admin.controller.js'
import * as adminTables from '../../controllers/admin/tables.admin.controller.js'
import * as adminKitchen from '../../controllers/admin/kitchen.admin.controller.js'
import * as adminNotifications from '../../controllers/admin/notifications.admin.controller.js'
import * as adminIngredients from '../../controllers/admin/ingredients.admin.controller.js'

const router = Router()

const staff = [requireAuth, requireAnyRole('ADMIN', 'STAFF')]
const adminOnly = [requireAuth, requireRole('ADMIN')]

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Các API quản trị dành cho Admin và Staff
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Lấy dữ liệu thống kê tổng quan cho màn hình Dashboard (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê thành công
 */
router.get('/dashboard', ...staff, adminDashboard.stats)

/**
 * @swagger
 * /admin/reservations:
 *   get:
 *     summary: Danh sách đặt bàn (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đặt bàn
 */
router.get('/reservations', ...staff, adminReservations.list)

/**
 * @swagger
 * /admin/reservations/walk-in:
 *   post:
 *     summary: Tạo đơn đặt bàn trực tiếp tại quán (Walk-in)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *               - guestCount
 *             properties:
 *               tableId:
 *                 type: integer
 *               guestCount:
 *                 type: integer
 *               guestName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tạo thành công
 */
router.post('/reservations/walk-in', ...staff, adminReservations.walkIn)

/**
 * @swagger
 * /admin/reservations/{id}:
 *   get:
 *     summary: Chi tiết đơn đặt bàn
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết đơn đặt bàn
 */
router.get('/reservations/:id', ...staff, adminReservations.detail)
router.get('/reservations/:id/order-total', ...staff, adminReservations.getOrderTotal)
router.get('/reservations/:id/order-items', ...staff, adminReservations.getOrderItems)
router.get('/reservations/:id/order-qr', ...staff, adminReservations.getOrderQr)

/**
 * @swagger
 * /admin/reservations/{id}/assign-table:
 *   post:
 *     summary: Gán bàn ăn cho đơn đặt bàn
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *             properties:
 *               tableId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Gán bàn thành công
 */
router.post('/reservations/:id/assign-table', ...staff, adminReservations.assignTable)

/**
 * @swagger
 * /admin/reservations/{id}/transfer-table:
 *   post:
 *     summary: Chuyển bàn ăn cho khách hàng
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromTableId
 *               - toTableId
 *             properties:
 *               fromTableId:
 *                 type: integer
 *               toTableId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Chuyển bàn thành công
 */
router.post('/reservations/:id/transfer-table', ...staff, adminReservations.transferTable)
router.post('/reservations/:id/confirm', ...staff, adminReservations.confirm)
router.post('/reservations/:id/check-in', ...staff, adminReservations.checkIn)

/**
 * @swagger
 * /admin/reservations/{id}/cashier-pay:
 *   post:
 *     summary: Thu ngân thanh toán hóa đơn
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 example: CASH
 *               tax:
 *                 type: number
 *               discount:
 *                 type: number
 *               surcharge:
 *                 type: number
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thanh toán thành công
 */
router.post('/reservations/:id/cashier-pay', ...staff, adminReservations.cashierPay)
router.post('/reservations/:id/release-guest', ...staff, adminReservations.releaseGuest)
router.post('/reservations/:id/confirm-online-payment', ...staff, adminReservations.confirmOnlinePayment)
router.post('/reservations/:id/cancel', ...staff, adminReservations.cancelReservation)

/**
 * @swagger
 * /admin/menu-items:
 *   get:
 *     summary: Danh sách món ăn quản trị
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách món ăn
 *   post:
 *     summary: Tạo món ăn mới (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category_id
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category_id:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tạo món thành công
 */
router.get('/menu-items', ...staff, adminMenu.list)
router.post('/menu-items', ...adminOnly, adminMenu.create)

/**
 * @swagger
 * /admin/menu-items/{id}/image:
 *   post:
 *     summary: Tải ảnh món ăn lên (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload ảnh món ăn thành công
 */
router.post('/menu-items/:id/image', ...adminOnly, upload.single('image'), adminMenu.uploadImage)
router.patch('/menu-items/:id', ...adminOnly, adminMenu.update)
router.delete('/menu-items/:id', ...adminOnly, adminMenu.remove)
router.post('/menu-items/:id/toggle-active', ...staff, adminMenu.toggleActive)

// Categories
router.get('/categories', ...staff, adminCategories.list)
router.post('/categories', ...adminOnly, adminCategories.create)
router.patch('/categories/:id', ...adminOnly, adminCategories.update)
router.delete('/categories/:id', ...adminOnly, adminCategories.remove)

// Ingredients
router.get('/ingredients/units', ...staff, adminIngredients.listUnits)
router.post('/ingredients/units', ...adminOnly, adminIngredients.createUnit)
router.delete('/ingredients/units/:id', ...adminOnly, adminIngredients.removeUnit)
router.get('/ingredients/imports/recent', ...staff, adminIngredients.recentImports)
router.get('/ingredients', ...staff, adminIngredients.list)
router.post('/ingredients', ...adminOnly, adminIngredients.create)
router.patch('/ingredients/:id', ...adminOnly, adminIngredients.update)
router.delete('/ingredients/:id', ...adminOnly, adminIngredients.remove)
router.post('/ingredients/:id/import', ...adminOnly, adminIngredients.importStock)
router.get('/ingredients/:id/imports', ...staff, adminIngredients.history)

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Danh sách người dùng hệ thống (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách user
 *   post:
 *     summary: Tạo tài khoản người dùng mới (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role_id
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tạo user thành công
 */
router.get('/users', ...adminOnly, adminUsers.list)
router.post('/users', ...adminOnly, adminUsers.create)
router.patch('/users/:id', ...adminOnly, adminUsers.update)
router.post('/users/:id/avatar', ...adminOnly, upload.single('avatar'), adminUsers.uploadAvatar)
router.delete('/users/:id', ...adminOnly, adminUsers.remove)

/**
 * @swagger
 * /admin/reports/revenue:
 *   get:
 *     summary: Báo cáo doanh thu (Admin/Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Báo cáo doanh thu
 */
router.get('/reports/revenue/by-table', ...staff, adminReports.revenueByTable)
router.get('/reports/revenue/invoices', ...staff, adminReports.revenueInvoices)
router.get('/reports/revenue', ...staff, adminReports.revenue)

router.post('/tables/:id/close', ...staff, adminTables.closeTable)
router.post('/tables/:id/reopen', ...staff, adminTables.reopenTable)

/**
 * @swagger
 * /admin/tables/layout/bulk:
 *   patch:
 *     summary: Cập nhật vị trí nhiều bàn cùng lúc
 *     tags: [Admin, Table]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               layout:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     pos_x:
 *                       type: number
 *                     pos_y:
 *                       type: number
 *     responses:
 *       200:
 *         description: Cập nhật sơ đồ bàn thành công
 */
router.patch('/tables/layout/bulk', ...staff, adminTables.bulkUpdateLayout)

/**
 * @swagger
 * /admin/kitchen/orders:
 *   get:
 *     summary: Lấy danh sách các đơn gọi món của bếp (Staff)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn gọi món
 */
router.get('/kitchen/orders', ...staff, adminKitchen.listTableOrders)
router.get('/kitchen/orders/:orderId', ...staff, adminKitchen.getOrderDetail)
router.patch('/kitchen/order-items/:itemId/ack', ...staff, adminKitchen.acknowledgeItem)
router.patch('/kitchen/order-items/:itemId/serve', ...staff, adminKitchen.serveItem)
router.post('/kitchen/orders/:orderId/ack-all', ...staff, adminKitchen.acknowledgeAllPending)
router.post('/kitchen/orders/:orderId/confirm-payment', ...staff, adminKitchen.confirmTablePayment)

// Notifications
router.get('/notifications', ...staff, adminNotifications.listMine)
router.patch('/notifications/:id/read', ...staff, adminNotifications.markRead)
router.post('/notifications/read-all', ...staff, adminNotifications.markAllRead)

// Settings
router.get('/settings', ...staff, adminSettings.getSettings)
router.patch('/settings', ...adminOnly, adminSettings.updateSettings)

// Uploads Manager (Hidden /backend page support)
router.get('/uploads-manager', ...staff, adminSettings.getUploadsManager)
router.post('/uploads-manager/sync-file', ...staff, adminSettings.syncFile)

export default router

