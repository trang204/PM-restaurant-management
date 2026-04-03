import { ok, created } from '../../utils/response.js'

export async function list(req, res, next) {
  try {
    return ok(res, [])
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    return created(res, { id: `cat_${Date.now()}`, ...req.body })
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    return ok(res, { id: req.params.id, ...req.body })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    return ok(res, { id: req.params.id, deleted: true })
  } catch (e) {
    return next(e)
  }
}

