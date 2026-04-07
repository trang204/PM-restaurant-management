import { ok, created } from '../utils/response.js'
import { badRequest, notFound, unauthorized } from '../utils/httpError.js'
import { reservations } from '../data/reservations.store.js'

export async function createReservation(req, res, next) {
  try {
    const { fullName, phone, date, time, guestCount, preorderItems } = req.body || {}
    if (!fullName || !phone || !date || !time || !guestCount) {
      throw badRequest('Thiếu thông tin đặt bàn')
    }

    const r = {
      id: `r_${Date.now()}`,
      customerId: req.user?.sub ?? null,
      fullName,
      phone,
      date,
      time,
      guestCount: Number(guestCount),
      status: 'PENDING',
      assignedTableId: null,
      preorderItems: Array.isArray(preorderItems) ? preorderItems : [],
      holdExpiresAt: null,
      createdAt: new Date().toISOString(),
    }
    reservations.unshift(r)
    return created(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function listMyReservations(req, res, next) {
  try {
    const list = reservations.filter((r) => r.customerId === req.user?.sub)
    return ok(res, list)
  } catch (e) {
    return next(e)
  }
}

export async function getReservationDetail(req, res, next) {
  try {
    const r = reservations.find((x) => String(x.id) === String(req.params.id))
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.customerId) {
      if (!req.user || r.customerId !== req.user.sub) throw unauthorized('Vui lòng đăng nhập đúng tài khoản đặt bàn')
    }
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const r = reservations.find((x) => x.id === req.params.id)
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.customerId !== req.user?.sub) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.status !== 'PENDING') throw badRequest('Chỉ được hủy khi đơn đang chờ xác nhận')
    r.status = 'CANCELLED'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function holdTable(req, res, next) {
  try {
    const r = reservations.find((x) => x.id === req.params.id)
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    const { tableId } = req.body || {}
    if (!tableId) throw badRequest('tableId là bắt buộc')
    if (r.status !== 'PENDING') throw badRequest('Chỉ giữ bàn khi đơn đang chờ xác nhận')

    r.assignedTableId = tableId
    r.holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function createOnlinePaymentIntent(req, res, next) {
  try {
    const r = reservations.find((x) => x.id === req.params.id)
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.customerId !== req.user?.sub) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.status !== 'CONFIRMED') throw badRequest('Đơn phải ở trạng thái CONFIRMED để thanh toán online')

    return ok(res, {
      reservationId: r.id,
      amount: 0,
      qrContent: 'BANK|ACCOUNT|AMOUNT|CONTENT',
    })
  } catch (e) {
    return next(e)
  }
}

export async function markOnlinePaidByCustomer(req, res, next) {
  try {
    const r = reservations.find((x) => x.id === req.params.id)
    if (!r) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.customerId !== req.user?.sub) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.status !== 'CONFIRMED') throw badRequest('Đơn phải ở trạng thái CONFIRMED')

    r.status = 'PAYMENT_PENDING'
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

