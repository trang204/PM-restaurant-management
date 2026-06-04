import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query, withTransaction } from '../config/db.js'

const ALLOWED_STATUS = new Set(['PENDING', 'SERVING', 'DONE'])

export async function createOrder(req, res, next) {
  try {
    const { booking_id } = req.body || {}
    const bookingId = Number(booking_id)
    if (!Number.isFinite(bookingId)) throw badRequest('booking_id không hợp lệ')

    const b = await query('SELECT id FROM bookings WHERE id = $1', [bookingId])
    if (!b.rows.length) throw notFound('Không tìm thấy booking')

    const r = await query(
      `INSERT INTO orders (booking_id, status) VALUES ($1, 'PENDING') RETURNING *`,
      [bookingId],
    )
    return created(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function addFoodToOrder(req, res, next) {
  try {
    const orderId = Number(req.params.id)
    if (!Number.isFinite(orderId)) throw badRequest('id không hợp lệ')

    const { food_id, quantity } = req.body || {}
    const foodId = Number(food_id)
    const qty = Number(quantity)
    if (!Number.isFinite(foodId)) throw badRequest('food_id không hợp lệ')
    if (!Number.isFinite(qty) || qty <= 0) throw badRequest('quantity không hợp lệ')

    const orderRes = await query('SELECT id FROM orders WHERE id = $1', [orderId])
    if (!orderRes.rows.length) throw notFound('Không tìm thấy order')

    const foodRes = await query('SELECT id, price FROM foods WHERE id = $1', [foodId])
    if (!foodRes.rows.length) throw notFound('Không tìm thấy món')

    const price = foodRes.rows[0].price

    const r = await withTransaction(async (client) => {
      const existing = await client.query(
        'SELECT id, quantity FROM order_items WHERE order_id = $1 AND food_id = $2',
        [orderId, foodId],
      )

      let orderItem
      if (existing.rows.length) {
        const updRes = await client.query(
          `
          UPDATE order_items
          SET quantity = quantity + $1
          WHERE id = $2
          RETURNING *
        `,
          [qty, existing.rows[0].id],
        )
        orderItem = updRes.rows[0]
      } else {
        const insRes = await client.query(
          `
          INSERT INTO order_items (order_id, food_id, quantity, price)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
          [orderId, foodId, qty, price],
        )
        orderItem = insRes.rows[0]
      }

      return orderItem
    })

    return created(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function updateItemQuantity(req, res, next) {
  try {
    const orderId = Number(req.params.id)
    const itemId = Number(req.params.itemId)
    if (!Number.isFinite(orderId) || !Number.isFinite(itemId)) throw badRequest('id không hợp lệ')

    const { quantity } = req.body || {}
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) throw badRequest('quantity không hợp lệ')

    const r = await withTransaction(async (client) => {
      const existingRes = await client.query(
        'SELECT food_id, quantity FROM order_items WHERE id = $1 AND order_id = $2',
        [itemId, orderId]
      )
      if (!existingRes.rows.length) throw notFound('Không tìm thấy order item')

      const oldQty = existingRes.rows[0].quantity
      const diff = qty - oldQty
      const foodId = existingRes.rows[0].food_id

      const updRes = await client.query(
        `
        UPDATE order_items
        SET quantity = $1
        WHERE id = $2 AND order_id = $3
        RETURNING *
      `,
        [qty, itemId, orderId],
      )

      return updRes.rows[0]
    })
    
    return ok(res, r)
  } catch (e) {
    return next(e)
  }
}

export async function getOrderDetail(req, res, next) {
  try {
    const orderId = Number(req.params.id)
    if (!Number.isFinite(orderId)) throw badRequest('id không hợp lệ')

    const orderRes = await query(
      `
      SELECT o.*, b.booking_date, b.booking_time, b.status AS booking_status
      FROM orders o
      LEFT JOIN bookings b ON b.id = o.booking_id
      WHERE o.id = $1
    `,
      [orderId],
    )
    if (!orderRes.rows.length) throw notFound('Không tìm thấy order')

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

    return ok(res, { order: orderRes.rows[0], items: itemsRes.rows })
  } catch (e) {
    return next(e)
  }
}

export async function changeOrderStatus(req, res, next) {
  try {
    const orderId = Number(req.params.id)
    if (!Number.isFinite(orderId)) throw badRequest('id không hợp lệ')

    const { status } = req.body || {}
    const st = String(status || '').toUpperCase()
    if (!ALLOWED_STATUS.has(st)) throw badRequest('status không hợp lệ')

    const r = await query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [st, orderId])
    if (!r.rows.length) throw notFound('Không tìm thấy order')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

