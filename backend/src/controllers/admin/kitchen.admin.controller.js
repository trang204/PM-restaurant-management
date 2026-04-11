import { ok } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query, withTransaction } from '../../config/db.js'

/** Danh sách đơn gọi món tại bàn (phiên ACTIVE). */
export async function listTableOrders(req, res, next) {
  try {
    const r = await query(
      `
      SELECT
        o.id AS order_id,
        o.status AS order_status,
        o.created_at AS order_created_at,
        ts.id AS session_id,
        ts.qr_token,
        t.id AS table_id,
        t.name AS table_name,
        b.id AS booking_id,
        COUNT(oi.id)::int AS line_count,
        COUNT(oi.id) FILTER (
          WHERE COALESCE(oi.kitchen_status, 'PENDING') <> 'ACKNOWLEDGED'
        )::int AS pending_kitchen,
        EXISTS (
          SELECT 1 FROM payments p
          WHERE p.order_id = o.id AND COALESCE(p.status, '') = 'UNPAID'
        ) AS has_unpaid_payment
      FROM orders o
      INNER JOIN table_sessions ts ON ts.id = o.table_session_id AND ts.status = 'ACTIVE'
      INNER JOIN tables t ON t.id = ts.table_id
      INNER JOIN bookings b ON b.id = o.booking_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = 'SERVING'
      GROUP BY o.id, o.status, o.created_at, ts.id, ts.qr_token, t.id, t.name, b.id
      HAVING COUNT(oi.id) > 0
      ORDER BY o.id DESC
    `,
    )
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function getOrderDetail(req, res, next) {
  try {
    const orderId = Number(req.params.orderId)
    if (!Number.isFinite(orderId)) throw badRequest('orderId không hợp lệ')

    const head = await query(
      `
      SELECT
        o.id AS order_id,
        o.status AS order_status,
        o.created_at AS order_created_at,
        ts.id AS session_id,
        ts.qr_token,
        t.id AS table_id,
        t.name AS table_name,
        b.id AS booking_id
      FROM orders o
      INNER JOIN table_sessions ts ON ts.id = o.table_session_id AND ts.status = 'ACTIVE'
      INNER JOIN tables t ON t.id = ts.table_id
      INNER JOIN bookings b ON b.id = o.booking_id
      WHERE o.id = $1
      LIMIT 1
    `,
      [orderId],
    )
    if (!head.rows.length) throw notFound('Không tìm thấy đơn hoặc phiên đã đóng')

    const items = await query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.food_id,
        oi.quantity,
        oi.price,
        oi.kitchen_status,
        oi.kitchen_ack_at,
        f.name AS food_name
      FROM order_items oi
      LEFT JOIN foods f ON f.id = oi.food_id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `,
      [orderId],
    )

    const pay = await query(
      `SELECT id, order_id, amount, method, status, paid_at FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [orderId],
    )

    return ok(res, {
      ...head.rows[0],
      items: items.rows,
      payment: pay.rows[0] || null,
    })
  } catch (e) {
    return next(e)
  }
}

export async function acknowledgeItem(req, res, next) {
  try {
    const itemId = Number(req.params.itemId)
    if (!Number.isFinite(itemId)) throw badRequest('itemId không hợp lệ')

    const r = await query(
      `
      UPDATE order_items oi
      SET kitchen_status = 'ACKNOWLEDGED', kitchen_ack_at = NOW()
      FROM orders o
      INNER JOIN table_sessions ts ON ts.id = o.table_session_id AND ts.status = 'ACTIVE'
      WHERE oi.id = $1 AND oi.order_id = o.id
      RETURNING oi.id, oi.order_id, oi.kitchen_status, oi.kitchen_ack_at
    `,
      [itemId],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy dòng món hoặc đơn không còn hiệu lực')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function acknowledgeAllPending(req, res, next) {
  try {
    const orderId = Number(req.params.orderId)
    if (!Number.isFinite(orderId)) throw badRequest('orderId không hợp lệ')

    await query(
      `
      UPDATE order_items oi
      SET kitchen_status = 'ACKNOWLEDGED', kitchen_ack_at = NOW()
      FROM orders o
      INNER JOIN table_sessions ts ON ts.id = o.table_session_id AND ts.status = 'ACTIVE'
      WHERE oi.order_id = o.id
        AND o.id = $1
        AND COALESCE(oi.kitchen_status, 'PENDING') <> 'ACKNOWLEDGED'
    `,
      [orderId],
    )
    return ok(res, { ok: true })
  } catch (e) {
    return next(e)
  }
}

/**
 * Nhân viên xác nhận đã thu tiền (UNPAID mới nhất), sau đó hoàn tất đặt bàn:
 * đơn DONE, booking COMPLETED, đóng phiên QR, trả bàn về AVAILABLE.
 */
export async function confirmTablePayment(req, res, next) {
  try {
    const orderId = Number(req.params.orderId)
    if (!Number.isFinite(orderId)) throw badRequest('orderId không hợp lệ')

    const pay = await withTransaction(async (client) => {
      const head = await client.query(
        `
        SELECT o.id, o.booking_id, t.id AS table_id
        FROM orders o
        INNER JOIN table_sessions ts ON ts.id = o.table_session_id AND ts.status = 'ACTIVE'
        INNER JOIN tables t ON t.id = ts.table_id
        WHERE o.id = $1
        LIMIT 1
      `,
        [orderId],
      )
      if (!head.rows.length) throw notFound('Không tìm thấy đơn hoặc phiên đã đóng')

      const bookingId = head.rows[0].booking_id
      const sessionTableId = head.rows[0].table_id

      const pending = await client.query(
        `
        SELECT id FROM payments
        WHERE order_id = $1 AND status = 'UNPAID'
        ORDER BY id DESC
        LIMIT 1
      `,
        [orderId],
      )
      if (!pending.rows.length) throw badRequest('Không có yêu cầu thanh toán chờ thu')

      const upd = await client.query(
        `UPDATE payments SET status = 'PAID', paid_at = NOW() WHERE id = $1 RETURNING id, order_id, amount, method, status, paid_at`,
        [pending.rows[0].id],
      )

      await client.query(`UPDATE orders SET status = 'DONE' WHERE id = $1`, [orderId])
      await client.query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = $1`, [bookingId])

      await client.query(
        `UPDATE table_sessions SET status = 'CLOSED', closed_at = NOW() WHERE booking_id = $1 AND status = 'ACTIVE'`,
        [bookingId],
      )

      const bt = await client.query('SELECT table_id FROM booking_tables WHERE booking_id = $1 LIMIT 1', [bookingId])
      const tid = bt.rows[0]?.table_id ?? sessionTableId
      if (tid != null) {
        await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [tid])
      }

      return upd.rows[0]
    })

    return ok(res, {
      payment: pay,
      tableReleased: true,
      bookingCompleted: true,
    })
  } catch (e) {
    return next(e)
  }
}
