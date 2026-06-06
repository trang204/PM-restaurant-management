import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth.js'
import { upload } from '../../middleware/upload.js'
import * as users from '../../controllers/users.controller.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý thông tin tài khoản người dùng
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Lấy thông tin cá nhân hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin user
 *   patch:
 *     summary: Cập nhật thông tin cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn B
 *               phone:
 *                 type: string
 *                 example: "0987654322"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.get('/me', requireAuth, users.getMe)
router.patch('/me', requireAuth, users.updateMe)

/**
 * @swagger
 * /users/me/password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 */
router.post('/me/password', requireAuth, users.changePassword)

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     summary: Upload ảnh đại diện cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công
 *   delete:
 *     summary: Xóa ảnh đại diện cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.post('/me/avatar', requireAuth, upload.single('avatar'), users.uploadAvatar)
router.delete('/me/avatar', requireAuth, users.deleteAvatar)

export default router


