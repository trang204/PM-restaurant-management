import { forbidden } from '../utils/httpError.js'

/** ADMIN hoặc STAFF (hoặc danh sách role được truyền vào). */
export function requireAnyRole(...roles) {
  return function requireAnyRoleMiddleware(req, res, next) {
    const userRole = req.user?.role
    if (!userRole || !roles.includes(userRole)) {
      return next(forbidden('Không đủ quyền truy cập'))
    }
    return next()
  }
}
