import { Router } from 'express'
import * as menu from '../../controllers/menu.controller.js'

const router = Router()

// Public: guest can view menu
router.get('/', menu.listMenuItems)
router.get('/categories', menu.listCategories)
router.get('/:id', menu.getMenuItem)

export default router

