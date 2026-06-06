import { Router } from 'express'
import * as zones from '../../controllers/zones.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Zones
 *   description: Quản lý khu vực bàn ăn
 */

/**
 * @swagger
 * /zones:
 *   get:
 *     summary: Lấy danh sách tất cả các khu vực
 *     tags: [Zones]
 *     responses:
 *       200:
 *         description: Danh sách khu vực
 *   post:
 *     summary: Tạo khu vực mới (Admin)
 *     tags: [Zones]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Khu Vực A
 *     responses:
 *       200:
 *         description: Tạo khu vực thành công
 */
router.get('/', zones.listZones)                                          // public: booking page cần
router.post('/', requireAuth, requireRole('ADMIN'), zones.createZone)

/**
 * @swagger
 * /zones/{id}:
 *   delete:
 *     summary: Xóa khu vực theo ID (Admin)
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa khu vực thành công
 */
router.delete('/:id', requireAuth, requireRole('ADMIN'), zones.deleteZone)

export default router

