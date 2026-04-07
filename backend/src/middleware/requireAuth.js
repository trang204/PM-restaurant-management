import jwt from 'jsonwebtoken'
import { unauthorized } from '../utils/httpError.js'

/** Gắn req.user nếu có Bearer hợp lệ; không thì bỏ qua. */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return next()
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = payload
    return next()
  } catch {
    return next()
  }
}

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

