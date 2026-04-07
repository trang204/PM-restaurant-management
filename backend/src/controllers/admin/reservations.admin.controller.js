import { ok } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

export async function list(req, res, next) {
  try {
    const r = await query(
      `
      SELECT
        b.*,
        u.name AS user_name,
        u.email AS user_email,
        COALESCE(array_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '{}') AS tables
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN booking_tables bt ON bt.booking_id = b.id
      LEFT JOIN tables t ON t.id = bt.table_id
      GROUP BY b.id, u.name, u.email
      ORDER BY b.created_at DESC
    `,
    )
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function detail(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      `
      SELECT
        b.*,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        COALESCE(array_agg(bt.table_id) FILTER (WHERE bt.table_id IS NOT NULL), '{}') AS table_ids
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN booking_tables bt ON bt.booking_id = b.id
      WHERE b.id = $1
      GROUP BY b.id, u.name, u.email, u.phone
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function assignTable(req, res, next) {
  try {
    const { tableId } = req.body || {}
    if (!tableId) throw badRequest('tableId là bắt buộc')

    const bookingId = Number(req.params.id)
    const tId = Number(tableId)
    if (!Number.isFinite(bookingId) || !Number.isFinite(tId)) throw badRequest('id không hợp lệ')

    const cur = await query('SELECT id, booking_date, booking_time, status FROM bookings WHERE id = $1', [bookingId])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    // Prevent double booking
    const conflicts = await query(
      `
      SELECT 1
      FROM booking_tables bt
      JOIN bookings b ON b.id = bt.booking_id
      WHERE b.booking_date = $1
        AND b.booking_time = $2
        AND b.status IN ('PENDING', 'CONFIRMED')
        AND bt.table_id = $3
        AND b.id <> $4
      LIMIT 1
    `,
      [cur.rows[0].booking_date, cur.rows[0].booking_time, tId, bookingId],
    )
    if (conflicts.rows.length) throw badRequest('Bàn đã được đặt trong khung giờ này')

    await query('BEGIN')
    await query('DELETE FROM booking_tables WHERE booking_id = $1', [bookingId])
    await query('INSERT INTO booking_tables (booking_id, table_id) VALUES ($1, $2)', [bookingId, tId])
    await query('COMMIT')

    return ok(res, { reservationId: bookingId, tableId: tId })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    return next(e)
  }
}

export async function confirm(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1 RETURNING *`, [id])
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    return ok(res, { reservationId: id, status: r.rows[0].status })
  } catch (e) {
    return next(e)
  }
}

export async function checkIn(req, res, next) {
  try {
    // Schema không có CHECKED_IN, mình dùng OCCUPIED cho bàn được gán (nếu có)
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const bt = await query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [id])
    if (bt.rows.length) {
      await query(`UPDATE tables SET status = 'OCCUPIED' WHERE id = $1`, [bt.rows[0].table_id])
    }
    const r = await query(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1 RETURNING *`, [id])
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    return ok(res, { reservationId: id, status: 'CHECKED_IN' })
  } catch (e) {
    return next(e)
  }
}

export async function confirmOnlinePayment(req, res, next) {
  try {
    const bookingId = Number(req.params.id)
    if (!Number.isFinite(bookingId)) throw badRequest('id không hợp lệ')

    await query('BEGIN')

    // Ensure order exists
    let order = await query('SELECT * FROM orders WHERE booking_id = $1 ORDER BY id DESC LIMIT 1', [bookingId])
    if (!order.rows.length) {
      order = await query('INSERT INTO orders (booking_id, status) VALUES ($1, $2) RETURNING *', [bookingId, 'DONE'])
    }
    const orderId = order.rows[0].id

    // Ensure payment exists
    let pay = await query('SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [orderId])
    if (!pay.rows.length) {
      pay = await query(
        `INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [orderId, 0, 'bank_transfer', 'PAID'],
      )
    } else {
      pay = await query(
        `UPDATE payments SET status = 'PAID', method = COALESCE(method, 'bank_transfer'), paid_at = COALESCE(paid_at, NOW()) WHERE id = $1 RETURNING *`,
        [pay.rows[0].id],
      )
    }

    const b = await query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = $1 RETURNING *`, [bookingId])
    if (!b.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    await query('COMMIT')

    return ok(res, { reservationId: bookingId, status: 'PAID', paymentId: pay.rows[0].id })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    return next(e)
  }
}

export async function cashierPay(req, res, next) {
  try {
    const bookingId = Number(req.params.id)
    if (!Number.isFinite(bookingId)) throw badRequest('id không hợp lệ')

    await query('BEGIN')

    // Ensure order exists
    let order = await query('SELECT * FROM orders WHERE booking_id = $1 ORDER BY id DESC LIMIT 1', [bookingId])
    if (!order.rows.length) {
      order = await query('INSERT INTO orders (booking_id, status) VALUES ($1, $2) RETURNING *', [bookingId, 'DONE'])
    } else {
      order = await query(`UPDATE orders SET status = 'DONE' WHERE id = $1 RETURNING *`, [order.rows[0].id])
    }
    const orderId = order.rows[0].id

    // Create payment as cash and mark paid
    const pay = await query(
      `INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [orderId, 0, 'cash', 'PAID'],
    )

    const b = await query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = $1 RETURNING *`, [bookingId])
    if (!b.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    // Release table if any
    const bt = await query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [bookingId])
    if (bt.rows.length) {
      await query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [bt.rows[0].table_id])
    }

    await query('COMMIT')

    return ok(res, { reservationId: bookingId, status: 'COMPLETED', paymentId: pay.rows[0].id })
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
    return next(e)
  }
}

