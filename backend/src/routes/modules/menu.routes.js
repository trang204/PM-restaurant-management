import { Router } from 'express'
import * as menu from '../../controllers/menu.controller.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Menu
 *   description: Quản lý thực đơn nhà hàng (Public)
 */

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: Lấy danh sách toàn bộ món ăn trong thực đơn công khai
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Danh sách món ăn
 */
router.get('/', menu.listMenuItems)

/**
 * @swagger
 * /menu/categories:
 *   get:
 *     summary: Lấy danh sách phân loại món ăn công khai
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Danh sách phân loại
 */
router.get('/categories', menu.listCategories)

/**
 * @swagger
 * /menu/{id}:
 *   get:
 *     summary: Xem thông tin chi tiết một món ăn
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết món ăn
 */
router.get('/:id', menu.getMenuItem)

export default router


