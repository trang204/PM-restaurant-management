import crypto from 'node:crypto'
import { query } from '../config/db.js'

export function generateQrToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function publicOrderUrl(token) {
  const base = (process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/order/table/${encodeURIComponent(token)}`
}

/**
 * Đóng mọi phiên ACTIVE của bàn (trước khi mở phiên mới).
 */
export async function closeActiveSessionsForTable(tableId) {
  await query(
    `UPDATE table_sessions SET status = 'CLOSED', closed_at = NOW()
     WHERE table_id = $1 AND status = 'ACTIVE'`,
    [tableId],
  )
}

/**
 * Tạo / tái sử dụng phiên gọi món cho booking đã CONFIRMED hoặc CHECKED_IN và đã gán bàn.
 * Trả về { session, order, orderUrl } hoặc null nếu thiếu bàn.
 */
export async function ensureTableSessionForBooking(bookingId) {
  const bt = await query(
    `SELECT bt.table_id FROM booking_tables bt WHERE bt.booking_id = $1 LIMIT 1`,
    [bookingId],
  )
  if (!bt.rows.length) return null

  const tableId = bt.rows[0].table_id

  const existingSess = await query(
    `SELECT id, qr_token FROM table_sessions
     WHERE booking_id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [bookingId],
  )
  if (existingSess.rows.length) {
    const sid = existingSess.rows[0].id
    const token = existingSess.rows[0].qr_token
    let order = await query(
      `SELECT id FROM orders WHERE booking_id = $1 AND table_session_id = $2
       ORDER BY id DESC LIMIT 1`,
      [bookingId, sid],
    )
    if (!order.rows.length) {
      const open = await query(
        `SELECT id FROM orders WHERE booking_id = $1 AND status IN ('PENDING', 'SERVING')
         ORDER BY id DESC LIMIT 1`,
        [bookingId],
      )
      if (open.rows.length) {
        await query(`UPDATE orders SET table_session_id = $1 WHERE id = $2`, [sid, open.rows[0].id])
        order = open
      } else {
        order = await query(
          `INSERT INTO orders (booking_id, status, table_session_id) VALUES ($1, 'PENDING', $2) RETURNING id`,
          [bookingId, sid],
        )
      }
    }
    return {
      sessionId: sid,
      qrToken: token,
      orderId: order.rows[0].id,
      tableId,
      orderUrl: publicOrderUrl(token),
    }
  }

  await closeActiveSessionsForTable(tableId)

  const token = generateQrToken()
  const ins = await query(
    `INSERT INTO table_sessions (table_id, booking_id, qr_token, status)
     VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
    [tableId, bookingId, token],
  )
  const sessionId = ins.rows[0].id

  const orderIns = await query(
    `INSERT INTO orders (booking_id, status, table_session_id) VALUES ($1, 'PENDING', $2) RETURNING id`,
    [bookingId, sessionId],
  )

  return {
    sessionId,
    qrToken: token,
    orderId: orderIns.rows[0].id,
    tableId,
    orderUrl: publicOrderUrl(token),
  }
}

export async function closeSessionsForBooking(bookingId) {
  await query(
    `UPDATE table_sessions SET status = 'CLOSED', closed_at = NOW()
     WHERE booking_id = $1 AND status = 'ACTIVE'`,
    [bookingId],
  )
}

export async function loadActiveSessionByToken(token) {
  const raw = String(token || '').trim()
  if (!raw) return null
  const r = await query(
    `
    SELECT
      ts.id AS session_id,
      ts.qr_token,
      ts.table_id,
      ts.booking_id,
      t.name AS table_name,
      b.status AS booking_status
    FROM table_sessions ts
    JOIN tables t ON t.id = ts.table_id
    JOIN bookings b ON b.id = ts.booking_id
    WHERE ts.qr_token = $1 AND ts.status = 'ACTIVE'
      AND COALESCE(t.status, 'AVAILABLE') <> 'CLOSED'
    LIMIT 1
  `,
    [raw],
  )
  if (!r.rows.length) return null
  const row = r.rows[0]
  if (!['CONFIRMED', 'CHECKED_IN'].includes(row.booking_status)) return null
  return row
}

export async function getOrCreateOrderForSession(sessionRow) {
  const bookingId = sessionRow.booking_id
  const sessionId = sessionRow.session_id
  let order = await query(
    `SELECT id, status FROM orders WHERE table_session_id = $1 ORDER BY id DESC LIMIT 1`,
    [sessionId],
  )
  if (order.rows.length) return order.rows[0]
  const ins = await query(
    `INSERT INTO orders (booking_id, status, table_session_id) VALUES ($1, 'PENDING', $2) RETURNING id, status`,
    [bookingId, sessionId],
  )
  return ins.rows[0]
}
