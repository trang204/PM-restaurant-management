import jwt from 'jsonwebtoken'
import { unauthorized } from '../utils/httpError.js'
import { query } from '../config/db.js'

/** Gắn req.user nếu có Bearer hợp lệ; không thì bỏ qua. */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return next()
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')

    const r = await query('SELECT status FROM users WHERE id = $1', [payload.sub])
    if (r.rows.length && String(r.rows[0].status || 'ACTIVE').toUpperCase() === 'LOCKED') {
      return next()
    }

    req.user = payload
    return next()
  } catch {
    return next()
  }
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null

    if (!token) throw unauthorized('Missing bearer token')

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')

    const r = await query('SELECT status FROM users WHERE id = $1', [payload.sub])
    if (!r.rows.length) throw unauthorized('User not found')
    if (String(r.rows[0].status || 'ACTIVE').toUpperCase() === 'LOCKED') {
      throw unauthorized('Tài khoản bị khóa')
    }

    req.user = payload
    return next()
  } catch (e) {
    if (e.status) return next(e)
    return next(unauthorized('Invalid or expired token'))
  }
}

