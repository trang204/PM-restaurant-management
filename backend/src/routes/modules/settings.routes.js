import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { requireRole } from '../../middleware/requireRole.js'
import { requireAnyRole } from '../../middleware/requireAnyRole.js'
import { upload } from '../../middleware/upload.js'
import * as settings from '../../controllers/admin/settings.admin.controller.js'
import * as settingsPublic from '../../controllers/settings.public.controller.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Quản lý cấu hình toàn hệ thống nhà hàng
 */

/**
 * @swagger
 * /settings/public:
 *   get:
 *     summary: Lấy cấu hình hệ thống công khai (Tên nhà hàng, Logo, Banner, SĐT, Địa chỉ...)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Thông tin cấu hình công khai
 */
router.get('/public', settingsPublic.getPublicSettings)

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Xem toàn bộ cấu hình hệ thống (Admin/Staff)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin chi tiết cấu hình hệ thống
 *   patch:
 *     summary: Cập nhật cấu hình hệ thống (Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurant_name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật cấu hình thành công
 */
router.get('/', requireAuth, requireAnyRole('ADMIN', 'STAFF'), settings.getSettings)
router.patch('/', requireAuth, requireRole('ADMIN'), settings.updateSettings)

/**
 * @swagger
 * /settings/logo:
 *   post:
 *     summary: Cập nhật ảnh logo nhà hàng (Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload logo thành công
 */
router.post('/logo', requireAuth, requireRole('ADMIN'), upload.single('logo'), settings.uploadLogo)

/**
 * @swagger
 * /settings/banners:
 *   post:
 *     summary: Thêm ảnh banner quảng cáo (Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               banners:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Upload danh sách banner thành công
 *   delete:
 *     summary: Xóa một ảnh banner quảng cáo (Admin)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: Đường dẫn tương đối của banner cần xóa
 *     responses:
 *       200:
 *         description: Xóa banner thành công
 */
router.post('/banners', requireAuth, requireRole('ADMIN'), upload.array('banners', 10), settings.uploadBanners)
router.delete('/banners', requireAuth, requireRole('ADMIN'), settings.removeBanner)

export default router

