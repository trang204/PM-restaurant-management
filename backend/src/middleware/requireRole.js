import { forbidden } from '../utils/httpError.js'

export function requireRole(role) {
  return function requireRoleMiddleware(req, res, next) {
    const userRole = req.user?.role
    if (userRole !== role) return next(forbidden('Insufficient role'))
    return next()
  }
}

