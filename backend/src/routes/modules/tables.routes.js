import { Router } from 'express'
import * as tables from '../../controllers/tables.controller.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { requireAnyRole } from '../../middleware/requireAnyRole.js'
import { upload } from '../../middleware/upload.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Tables
 *   description: Quản lý bàn ăn
 */

/**
 * @swagger
 * /tables:
 *   get:
 *     summary: Lấy danh sách tất cả các bàn ăn (Public)
 *     tags: [Tables]
 *     responses:
 *       200:
 *         description: Danh sách bàn ăn
 *   post:
 *     summary: Tạo bàn mới (Admin)
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - capacity
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 example: Bàn số 1
 *               capacity:
 *                 type: integer
 *                 example: 4
 *               zone:
 *                 type: string
 *                 example: Khu Vực A
 *               status:
 *                 type: string
 *                 example: AVAILABLE
 *     responses:
 *       200:
 *         description: Tạo bàn thành công
 */
router.get('/', tables.listTables)
router.post('/', requireAuth, requireRole('ADMIN'), tables.createTable)

/**
 * @swagger
 * /tables/{id}:
 *   get:
 *     summary: Lấy thông tin bàn chi tiết (Public)
 *     tags: [Tables]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thông tin bàn ăn
 *   patch:
 *     summary: Cập nhật thông tin bàn ăn (Admin/Staff)
 *     tags: [Tables]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               zone:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật bàn ăn thành công
 *   delete:
 *     summary: Xóa bàn ăn (Admin)
 *     tags: [Tables]
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
 *         description: Xóa bàn thành công
 */
router.get('/:id', tables.getTable)
router.patch('/:id', requireAuth, requireAnyRole('ADMIN', 'STAFF'), tables.updateTable)
router.delete('/:id', requireAuth, requireRole('ADMIN'), tables.deleteTable)

/**
 * @swagger
 * /tables/{id}/image:
 *   post:
 *     summary: Tải ảnh bàn ăn lên (Admin)
 *     tags: [Tables]
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
 *         description: Upload ảnh thành công
 */
router.post('/:id/image', requireAuth, requireRole('ADMIN'), upload.single('image'), tables.uploadImage)

export default router


