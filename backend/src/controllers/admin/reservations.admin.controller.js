import { ok } from '../../utils/response.js'
import { badRequest } from '../../utils/httpError.js'

// Base: không DB, nên chỉ trả mẫu.
export async function list(req, res, next) {
  try {
    return ok(res, [])
  } catch (e) {
    return next(e)
  }
}

export async function detail(req, res, next) {
  try {
    return ok(res, { id: req.params.id })
  } catch (e) {
    return next(e)
  }
}

export async function assignTable(req, res, next) {
  try {
    const { tableId } = req.body || {}
    if (!tableId) throw badRequest('tableId là bắt buộc')
    return ok(res, { reservationId: req.params.id, tableId })
  } catch (e) {
    return next(e)
  }
}

export async function confirm(req, res, next) {
  try {
    return ok(res, { reservationId: req.params.id, status: 'CONFIRMED' })
  } catch (e) {
    return next(e)
  }
}

export async function checkIn(req, res, next) {
  try {
    return ok(res, { reservationId: req.params.id, status: 'CHECKED_IN' })
  } catch (e) {
    return next(e)
  }
}

export async function confirmOnlinePayment(req, res, next) {
  try {
    return ok(res, { reservationId: req.params.id, status: 'PAID' })
  } catch (e) {
    return next(e)
  }
}

export async function cashierPay(req, res, next) {
  try {
    return ok(res, { reservationId: req.params.id, status: 'COMPLETED' })
  } catch (e) {
    return next(e)
  }
}

