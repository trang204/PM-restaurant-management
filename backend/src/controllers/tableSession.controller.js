import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'
import {
  getOrCreateOrderForSession,
  loadActiveSessionByToken,
  publicOrderUrl,
} from '../services/tableSession.service.js'

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
