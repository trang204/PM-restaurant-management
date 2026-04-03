import { ok, created } from '../../utils/response.js'
import { badRequest } from '../../utils/httpError.js'

export async function list(req, res, next) {
  try {
    return ok(res, [])
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    return created(res, { id: `u_${Date.now()}`, ...req.body })
  } catch (e) {
    return next(e)
  }
}

export async function updateRole(req, res, next) {
  try {
    const { role } = req.body || {}
    if (!role) throw badRequest('role là bắt buộc')
    return ok(res, { id: req.params.id, role })
  } catch (e) {
    return next(e)
  }
}

