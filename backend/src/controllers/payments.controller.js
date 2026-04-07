import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

const ALLOWED_STATUS = new Set(['UNPAID', 'PAID'])
const ALLOWED_METHOD = new Set(['cash', 'bank_transfer'])

export async function createPayment(req, res, next) {
  try {
    const { order_id, amount, method } = req.body || {}
    const orderId = Number(order_id)
    if (!Number.isFinite(orderId)) throw badRequest('order_id không hợp lệ')

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 0) throw badRequest('amount không hợp lệ')

    const m = String(method || '').trim()
    if (!ALLOWED_METHOD.has(m)) throw badRequest('method không hợp lệ (cash|bank_transfer)')

    const orderRes = await query('SELECT id FROM orders WHERE id = $1', [orderId])
    if (!orderRes.rows.length) throw notFound('Không tìm thấy order')

    const r = await query(
      `
      INSERT INTO payments (order_id, amount, method, status)
      VALUES ($1, $2, $3, 'UNPAID')
      RETURNING *
    `,
      [orderId, amt, m],
    )
    return created(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function updatePaymentStatus(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const { status } = req.body || {}
    const st = String(status || '').toUpperCase()
    if (!ALLOWED_STATUS.has(st)) throw badRequest('status không hợp lệ (UNPAID|PAID)')

    const r = await query(
      `
      UPDATE payments
      SET
        status = $1,
        paid_at = CASE WHEN $1 = 'PAID' THEN NOW() ELSE paid_at END
      WHERE id = $2
      RETURNING *
    `,
      [st, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy payment')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function getPaymentByOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId)
    if (!Number.isFinite(orderId)) throw badRequest('orderId không hợp lệ')

    const r = await query('SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC', [orderId])
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

