import { Router } from 'express'
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js'
import * as reservations from '../../controllers/reservations.controller.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Đặt bàn phía khách hàng
 */

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Lấy danh sách lịch sử đặt bàn của tôi
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đặt bàn
 *   post:
 *     summary: Tạo đơn đặt bàn mới
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingDate
 *               - bookingTime
 *               - guests
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 example: "2026-06-10"
 *               bookingTime:
 *                 type: string
 *                 example: "19:00"
 *               guests:
 *                 type: integer
 *                 example: 2
 *               note:
 *                 type: string
 *               guestName:
 *                 type: string
 *               guestPhone:
 *                 type: string
 *               tableIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               orderItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     food_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Tạo đặt bàn thành công
 */
router.get('/', requireAuth, reservations.listMyReservations)
router.post('/', optionalAuth, reservations.createReservation)

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Xem thông tin chi tiết đơn đặt bàn
 *     tags: [Reservations]
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
router.get('/:id', optionalAuth, reservations.getReservationDetail)

/**
 * @swagger
 * /reservations/{id}/cancel:
 *   post:
 *     summary: Hủy đơn đặt bàn
 *     tags: [Reservations]
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
 *         description: Hủy đặt bàn thành công
 */
router.post('/:id/cancel', requireAuth, reservations.cancelReservation)

/**
 * @swagger
 * /reservations/{id}/hold:
 *   post:
 *     summary: Giữ chỗ bàn tạm thời trong 15 phút
 *     tags: [Reservations]
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
 *               - tableIds
 *             properties:
 *               tableIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Giữ bàn thành công
 */
router.post('/:id/hold', reservations.holdTable)

/**
 * @swagger
 * /reservations/{id}/payments/online-intent:
 *   post:
 *     summary: Tạo cổng thanh toán trực tuyến
 *     tags: [Reservations]
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
 *         description: Trả về thông tin thanh toán trực tuyến
 */
router.post('/:id/payments/online-intent', requireAuth, reservations.createOnlinePaymentIntent)

/**
 * @swagger
 * /reservations/{id}/payments/online-mark-paid:
 *   post:
 *     summary: Khách hàng đánh dấu đã thanh toán trực tuyến
 *     tags: [Reservations]
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
 *         description: Cập nhật trạng thái thanh toán thành công
 */
router.post('/:id/payments/online-mark-paid', requireAuth, reservations.markOnlinePaidByCustomer)

export default router


