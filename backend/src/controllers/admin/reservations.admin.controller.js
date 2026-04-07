import { ok } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { reservations } from '../../data/reservations.store.js'

export async function list(req, res, next) {
  try {
    return ok(res, [...reservations])
  } catch (e) {
    return next(e)
  }
}

export async function detail(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    if (['COMPLETED', 'CANCELLED'].includes(r.status)) {
      throw badRequest('Không thể hủy đơn ở trạng thái này')
    }
    r.status = 'CANCELLED'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function assignTable(req, res, next) {
  try {
    const { tableId } = req.body || {}
    if (!tableId) throw badRequest('tableId là bắt buộc')
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    r.assignedTableId = tableId
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function confirm(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    r.status = 'CONFIRMED'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function checkIn(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    r.status = 'CHECKED_IN'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function confirmOnlinePayment(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    r.status = 'PAID'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function cashierPay(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    r.status = 'COMPLETED'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}
