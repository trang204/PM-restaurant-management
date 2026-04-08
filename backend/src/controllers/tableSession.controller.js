import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'
import {
  getOrCreateOrderForSession,
  loadActiveSessionByToken,
  publicOrderUrl,
} from '../services/tableSession.service.js'

export async function getMyActiveSession(req, res, next) {
  try {
    const userId = Number(req.user?.sub)
    if (!Number.isFinite(userId)) throw badRequest('Thiếu thông tin người dùng')

    const r = await query(
      `
      SELECT
        ts.qr_token,
        ts.table_id,
        t.name AS table_name,
        b.id AS booking_id,
        b.status AS booking_status
      FROM table_sessions ts
      JOIN bookings b ON b.id = ts.booking_id
      JOIN tables t ON t.id = ts.table_id
      WHERE ts.status = 'ACTIVE'
        AND b.user_id = $1
        AND b.status IN ('CONFIRMED', 'CHECKED_IN')
      ORDER BY ts.id DESC
      LIMIT 1
    `,
      [userId],
    )
    if (!r.rows.length) return ok(res, null)
    const row = r.rows[0]
    return ok(res, {
      bookingId: String(row.booking_id),
      bookingStatus: row.booking_status,
      tableId: Number(row.table_id),
      tableName: row.table_name,
      tableOrderToken: row.qr_token,
      tableOrderUrl: publicOrderUrl(row.qr_token),
    })
  } catch (e) {
    return next(e)
  }
}

export async function getSessionContext(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw badRequest('Thiếu mã')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const orderId = orderRow.id

    const itemsRes = await query(
      `
      SELECT oi.*, f.name AS food_name
      FROM order_items oi
      LEFT JOIN foods f ON f.id = oi.food_id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `,
      [orderId],
    )

    const menuRes = await query(
      `
      SELECT
        f.id,
        f.name,
        f.price,
        f.description,
        f.image_url,
        f.category_id,
        c.name AS category_name
      FROM foods f
      LEFT JOIN categories c ON c.id = f.category_id
      WHERE COALESCE(f.status, 'AVAILABLE') = 'AVAILABLE'
      ORDER BY c.name, f.name
    `,
    )

    const settingsRes = await query(
      `SELECT restaurant_name, logo_url, address, phone FROM settings ORDER BY id LIMIT 1`,
    )
    const st = settingsRes.rows[0] || {}

    return ok(res, {
      tableName: row.table_name,
      bookingId: row.booking_id,
      order: { id: orderId, status: orderRow.status },
      items: itemsRes.rows,
      menu: menuRes.rows,
      restaurant: {
        name: st.restaurant_name,
        logoUrl: st.logo_url,
        address: st.address,
        phone: st.phone,
      },
      orderUrl: publicOrderUrl(token),
    })
  } catch (e) {
    return next(e)
  }
}

export async function addItem(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    const { food_id, quantity } = req.body || {}
    const foodId = Number(food_id)
    const qty = Number(quantity)
    if (!token) throw badRequest('Thiếu mã')
    if (!Number.isFinite(foodId)) throw badRequest('food_id không hợp lệ')
    if (!Number.isFinite(qty) || qty <= 0) throw badRequest('quantity không hợp lệ')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const orderId = orderRow.id
    const st = String(orderRow.status || '').toUpperCase()
    if (!['PENDING', 'SERVING'].includes(st)) throw badRequest('Đơn không thể thêm món ở trạng thái này')

    const foodRes = await query(
      `SELECT id, price FROM foods WHERE id = $1 AND COALESCE(status, 'AVAILABLE') = 'AVAILABLE'`,
      [foodId],
    )
    if (!foodRes.rows.length) throw notFound('Không tìm thấy món')

    const price = foodRes.rows[0].price

    const existing = await query(
      'SELECT id, quantity FROM order_items WHERE order_id = $1 AND food_id = $2',
      [orderId, foodId],
    )
    if (existing.rows.length) {
      const r2 = await query(
        `UPDATE order_items SET quantity = quantity + $1 WHERE id = $2 RETURNING *`,
        [qty, existing.rows[0].id],
      )
      return ok(res, r2.rows[0])
    }

    const r3 = await query(
      `
      INSERT INTO order_items (order_id, food_id, quantity, price)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [orderId, foodId, qty, price],
    )
    return created(res, r3.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function updateItem(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    const itemId = Number(req.params.itemId)
    const { quantity } = req.body || {}
    const qty = Number(quantity)
    if (!token) throw badRequest('Thiếu mã')
    if (!Number.isFinite(itemId)) throw badRequest('itemId không hợp lệ')
    if (!Number.isFinite(qty) || qty < 1) throw badRequest('quantity phải >= 1')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const st = String(orderRow.status || '').toUpperCase()
    if (!['PENDING', 'SERVING'].includes(st)) throw badRequest('Đơn không thể sửa ở trạng thái này')

    const sessionId = row.session_id
    const r = await query(
      `
      UPDATE order_items oi
      SET quantity = $1
      FROM orders o
      WHERE oi.id = $2 AND oi.order_id = o.id AND o.table_session_id = $3
      RETURNING oi.*
    `,
      [qty, itemId, sessionId],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy món trong đơn')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function removeItem(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    const itemId = Number(req.params.itemId)
    if (!token) throw badRequest('Thiếu mã')
    if (!Number.isFinite(itemId)) throw badRequest('itemId không hợp lệ')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const st = String(orderRow.status || '').toUpperCase()
    if (!['PENDING', 'SERVING'].includes(st)) throw badRequest('Đơn không thể sửa ở trạng thái này')

    const sessionId = row.session_id
    const r = await query(
      `
      DELETE FROM order_items oi
      USING orders o
      WHERE oi.id = $1 AND oi.order_id = o.id AND o.table_session_id = $2
      RETURNING oi.id
    `,
      [itemId, sessionId],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy món trong đơn')
    return ok(res, { removedId: r.rows[0].id })
  } catch (e) {
    return next(e)
  }
}

async function computeOrderTotal(orderId) {
  const r = await query(
    `SELECT COALESCE(SUM(price * quantity), 0)::numeric AS total FROM order_items WHERE order_id = $1`,
    [orderId],
  )
  return Number(r.rows[0]?.total || 0)
}

export async function submitOrder(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw badRequest('Thiếu mã')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const orderId = orderRow.id

    const total = await computeOrderTotal(orderId)
    if (!Number.isFinite(total) || total <= 0) throw badRequest('Chưa có món trong đơn')

    // Đánh dấu đã gửi bếp/phục vụ (giữ PENDING/SERVING để vẫn có thể thêm món nếu cần)
    const updated = await query(
      `UPDATE orders SET status = 'SERVING' WHERE id = $1 AND status IN ('PENDING', 'SERVING') RETURNING id, status`,
      [orderId],
    )
    if (!updated.rows.length) throw badRequest('Đơn không thể xác nhận ở trạng thái này')

    return ok(res, { orderId, status: updated.rows[0].status, total })
  } catch (e) {
    return next(e)
  }
}

export async function getPayment(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw badRequest('Thiếu mã')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const orderId = orderRow.id

    const pay = await query(`SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1`, [orderId])
    const total = await computeOrderTotal(orderId)
    return ok(res, { orderId, total, payment: pay.rows[0] || null })
  } catch (e) {
    return next(e)
  }
}

export async function createPayment(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    const { method } = req.body || {}
    const m = String(method || '').trim()
    if (!token) throw badRequest('Thiếu mã')
    if (!['cash', 'bank_transfer'].includes(m)) throw badRequest('method không hợp lệ (cash|bank_transfer)')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    const orderRow = await getOrCreateOrderForSession(row)
    const orderId = orderRow.id

    const total = await computeOrderTotal(orderId)
    if (!Number.isFinite(total) || total <= 0) throw badRequest('Chưa có món trong đơn')

    // nếu đã có payment PAID thì không tạo thêm
    const existingPaid = await query(
      `SELECT id FROM payments WHERE order_id = $1 AND status = 'PAID' ORDER BY id DESC LIMIT 1`,
      [orderId],
    )
    if (existingPaid.rows.length) throw badRequest('Đơn đã thanh toán')

    const ins = await query(
      `INSERT INTO payments (order_id, amount, method, status) VALUES ($1, $2, $3, 'UNPAID') RETURNING *`,
      [orderId, total, m],
    )

    // QR content cơ bản (có thể nâng cấp VietQR bằng settings sau)
    const qrContent = m === 'bank_transfer' ? `PAY|ORDER:${orderId}|AMOUNT:${total}` : null
    return created(res, { orderId, total, payment: ins.rows[0], qrContent })
  } catch (e) {
    return next(e)
  }
}
