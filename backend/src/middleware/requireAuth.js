import jwt from 'jsonwebtoken'
import { unauthorized } from '../utils/httpError.js'

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null

    if (!token) throw unauthorized('Missing bearer token')

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = payload
    return next()
  } catch (e) {
    return next(unauthorized('Invalid or expired token'))
  }
}

