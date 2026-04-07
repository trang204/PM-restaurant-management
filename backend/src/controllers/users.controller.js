import { ok } from '../utils/response.js'

export async function getMe(req, res, next) {
  try {
    return ok(res, {
      id: req.user?.sub,
      email: req.user?.email,
      role: req.user?.role,
      fullName: req.user?.fullName,
    })
  } catch (e) {
    return next(e)
  }
}

export async function updateMe(req, res, next) {
  try {
    // Base: chưa nối DB
    return ok(res, { ...req.body, id: req.user?.sub })
  } catch (e) {
    return next(e)
  }
}

