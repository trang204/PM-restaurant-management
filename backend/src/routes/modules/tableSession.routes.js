import { Router } from 'express'
import * as tableSession from '../../controllers/tableSession.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: TableSession
 *   description: Quản lý phiên gọi món ăn tại bàn (Quét QR)
 */

/**
 * @swagger
 * /table-session/me:
 *   get:
 *     summary: Lấy thông tin phiên hoạt động hiện tại của tôi (Nếu có)
 *     tags: [TableSession]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về phiên hoạt động của tôi
 */
router.get('/me', requireAuth, tableSession.getMyActiveSession)

/**
 * @swagger
 * /table-session/{token}:
 *   get:
 *     summary: Lấy thông tin chi tiết phiên gọi món bằng Token QR bàn
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết phiên
 */
router.get('/:token', tableSession.getSessionContext)

/**
 * @swagger
 * /table-session/{token}/items:
 *   post:
 *     summary: Thêm món ăn vào giỏ hàng của phiên gọi món
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
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
 *               - food_id
 *               - quantity
 *             properties:
 *               food_id:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Thêm món thành công
 */
router.post('/:token/items', tableSession.addItem)

/**
 * @swagger
 * /table-session/{token}/items/{itemId}:
 *   patch:
 *     summary: Cập nhật số lượng món ăn trong giỏ hàng phiên
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa món ăn khỏi giỏ hàng phiên
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa món thành công
 */
router.patch('/:token/items/:itemId', tableSession.updateItem)
router.delete('/:token/items/:itemId', tableSession.removeItem)

/**
 * @swagger
 * /table-session/{token}/submit:
 *   post:
 *     summary: Gửi đơn gọi món đến nhà bếp
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gửi món thành công
 */
router.post('/:token/submit', tableSession.submitOrder)

/**
 * @swagger
 * /table-session/{token}/payment:
 *   get:
 *     summary: Lấy thông tin thanh toán của phiên hiện tại
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin thanh toán
 *   post:
 *     summary: Yêu cầu thanh toán
 *     tags: [TableSession]
 *     parameters:
 *       - in: path
 *         name: token
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
 *     responses:
 *       200:
 *         description: Gửi yêu cầu thanh toán thành công
 */
router.get('/:token/payment', tableSession.getPayment)
router.post('/:token/payment', tableSession.createPayment)

export default router

