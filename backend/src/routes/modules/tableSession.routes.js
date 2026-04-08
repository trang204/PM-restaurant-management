import { Router } from 'express'
import * as tableSession from '../../controllers/tableSession.controller.js'

const router = Router()

router.get('/:token', tableSession.getSessionContext)
router.post('/:token/items', tableSession.addItem)

export default router
