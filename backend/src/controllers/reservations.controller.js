import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query, withTransaction } from '../config/db.js'
import { mapBookingForClient } from '../utils/bookingMapper.js'
import { closeSessionsForBooking, publicOrderUrl } from '../services/tableSession.service.js'

function toInt(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeTime(v) {
  return String(v || '').trim()
}

function normalizeDate(v) {
  return String(v || '').trim()
}

export async function createReservation(req, res, next) {
  try {
    const { date, time, guestCount, note, tableId, tableIds, fullName, phone, preorderItems } = req.body || {}
    const booking_date = normalizeDate(date)
    const booking_time = normalizeTime(time)
    const guests = toInt(guestCount)

    if (!booking_date || !booking_time || !guests) throw badRequest('Thiếu thông tin đặt bàn')
    if (guests <= 0) throw badRequest('guestCount không hợp lệ')

    const userId = req.user?.sub ? Number(req.user.sub) : null

    const requestedTableIdsRaw = Array.isArray(tableIds)
      ? tableIds
      : tableId
        ? [tableId]
        : []
    const requestedTableIds = requestedTableIdsRaw
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x))

    const guestName = fullName != null && String(fullName).trim() ? String(fullName).trim() : null
    const guestPhone = phone != null && String(phone).trim() ? String(phone).trim() : null

    const booking = await withTransaction(async (client) => {
      if (requestedTableIds.length) {
        const conflicts = await client.query(
          `
          SELECT bt.table_id
          FROM booking_tables bt
          JOIN bookings b ON b.id = bt.booking_id
          WHERE b.booking_date = $1
            AND b.booking_time = $2
            AND (
              b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
              OR (b.status = 'HOLD' AND b.hold_expires_at IS NOT NULL AND b.hold_expires_at > NOW())
            )
            AND bt.table_id = ANY($3::int[])
        `,
          [booking_date, booking_time, requestedTableIds],
        )
        if (conflicts.rows.length) throw badRequest('Bàn đã được đặt trong khung giờ này')
      }

      const inserted = await client.query(
        `
        INSERT INTO bookings (user_id, booking_date, booking_time, guests, status, note, guest_name, guest_phone)
        VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7)
        RETURNING id, user_id, booking_date, booking_time, guests, status, note, guest_name, guest_phone, created_at
      `,
        [userId, booking_date, booking_time, guests, note ? String(note) : null, guestName, guestPhone],
      )

      const b = inserted.rows[0]

      if (requestedTableIds.length) {
        const values = requestedTableIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')
        await client.query(`INSERT INTO booking_tables (booking_id, table_id) VALUES ${values}`, [
          b.id,
          ...requestedTableIds,
        ])
      }

      // Preorder (gọi món trước khi đến) — tạo order + order_items (chưa gắn table_session)
      const items = Array.isArray(preorderItems) ? preorderItems : []
      const normalized = items
        .map((x) => ({
          foodId: Number(x?.menuItemId ?? x?.food_id ?? x?.foodId),
          quantity: Number(x?.quantity),
        }))
        .filter((x) => Number.isFinite(x.foodId) && Number.isFinite(x.quantity) && x.quantity > 0)

      if (normalized.length) {
        const orderIns = await client.query(
          `INSERT INTO orders (booking_id, status, table_session_id) VALUES ($1, 'PENDING', NULL) RETURNING id`,
          [b.id],
        )
        const orderId = orderIns.rows[0].id

        // Load prices (server authoritative)
        const foodIds = Array.from(new Set(normalized.map((x) => x.foodId)))
        const foods = await client.query(
          `SELECT id, price FROM foods WHERE id = ANY($1::int[]) AND COALESCE(status, 'AVAILABLE') = 'AVAILABLE'`,
          [foodIds],
        )
        const priceById = new Map(foods.rows.map((r) => [Number(r.id), r.price]))
        for (const it of normalized) {
          if (!priceById.has(it.foodId)) throw badRequest('Có món không tồn tại hoặc đã bị ẩn')
        }

        // Insert items (gộp quantity theo foodId)
        const qtyById = new Map()
        for (const it of normalized) qtyById.set(it.foodId, (qtyById.get(it.foodId) || 0) + it.quantity)

        const rows = Array.from(qtyById.entries())
        const values = rows.map((_, idx) => `($1, $${idx * 3 + 2}, $${idx * 3 + 3}, $${idx * 3 + 4})`).join(', ')
        const params = [orderId]
        for (const [fid, qty] of rows) {
          params.push(fid, qty, priceById.get(fid))
        }
        await client.query(
          `INSERT INTO order_items (order_id, food_id, quantity, price) VALUES ${values}`,
          params,
        )
      }

      return b
    })

    return created(res, booking)
  } catch (e) {
    return next(e)
  }
}

export async function listMyReservations(req, res, next) {
  try {
    const userId = Number(req.user?.sub)
    if (!Number.isFinite(userId)) throw badRequest('Thiếu thông tin người dùng')

    const r = await query(
      `
      SELECT
        b.*,
        u.name AS user_name,
        u.phone AS user_phone,
        (
          SELECT COALESCE(array_agg(DISTINCT bt.table_id), ARRAY[]::integer[])
          FROM booking_tables bt
          WHERE bt.booking_id = b.id AND bt.table_id IS NOT NULL
        ) AS table_ids,
        (
          SELECT COALESCE(array_agg(DISTINCT t.name), ARRAY[]::text[])
          FROM booking_tables bt2
          JOIN tables t ON t.id = bt2.table_id
          WHERE bt2.booking_id = b.id AND t.name IS NOT NULL
        ) AS tables
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `,
      [userId],
    )

    return ok(res, r.rows.map(mapBookingForClient))
  } catch (e) {
    return next(e)
  }
}

export async function getReservationDetail(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      `
      SELECT
        b.*,
        u.name AS user_name,
        u.phone AS user_phone,
        (
          SELECT COALESCE(array_agg(DISTINCT bt.table_id), ARRAY[]::integer[])
          FROM booking_tables bt
          WHERE bt.booking_id = b.id AND bt.table_id IS NOT NULL
        ) AS table_ids,
        (
          SELECT COALESCE(array_agg(DISTINCT t.name), ARRAY[]::text[])
          FROM booking_tables bt2
          JOIN tables t ON t.id = bt2.table_id
          WHERE bt2.booking_id = b.id AND t.name IS NOT NULL
        ) AS tables
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    const booking = r.rows[0]
    const userId = Number(req.user?.sub)
    if (Number.isFinite(userId) && booking.user_id && booking.user_id !== userId) {
      throw notFound('Không tìm thấy đơn đặt bàn')
    }

    const mapped = mapBookingForClient(booking)
    if (
      Number.isFinite(userId) &&
      booking.user_id === userId &&
      ['CONFIRMED', 'CHECKED_IN'].includes(booking.status)
    ) {
      const sess = await query(
        `SELECT qr_token FROM table_sessions WHERE booking_id = $1 AND status = 'ACTIVE' LIMIT 1`,
        [id],
      )
      if (sess.rows[0]?.qr_token) {
        mapped.tableOrderToken = sess.rows[0].qr_token
        mapped.tableOrderUrl = publicOrderUrl(sess.rows[0].qr_token)
      }
    }

    return ok(res, mapped)
  } catch (e) {
    return next(e)
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const userId = Number(req.user?.sub)
    if (!Number.isFinite(userId)) throw badRequest('Thiếu thông tin người dùng')

    const cur = await query('SELECT id, user_id, status FROM bookings WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    if (cur.rows[0].user_id !== userId) throw notFound('Không tìm thấy đơn đặt bàn')
    if (!['PENDING', 'HOLD'].includes(cur.rows[0].status)) throw badRequest('Chỉ được hủy khi đơn đang chờ xác nhận')

    await closeSessionsForBooking(id)
    // trả bàn nếu đang giữ
    const bt = await query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [id])
    if (bt.rows.length) {
      await query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1 AND status = 'RESERVED'`, [bt.rows[0].table_id])
      await query('DELETE FROM booking_tables WHERE booking_id = $1', [id])
    }
    const updated = await query(
      `UPDATE bookings SET status = 'CANCELLED', hold_expires_at = NULL WHERE id = $1 RETURNING *`,
      [id],
    )
    return ok(res, updated.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function holdTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const { tableId } = req.body || {}
    const tId = Number(tableId)
    if (!Number.isFinite(tId)) throw badRequest('tableId là bắt buộc')

    const cur = await query('SELECT id, booking_date, booking_time, status FROM bookings WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    if (cur.rows[0].status !== 'PENDING') throw badRequest('Chỉ giữ bàn khi đơn đang chờ xác nhận')

    const conflicts = await query(
      `
      SELECT 1
      FROM booking_tables bt
      JOIN bookings b ON b.id = bt.booking_id
      WHERE b.booking_date = $1
        AND b.booking_time = $2
        AND (
          b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
          OR (b.status = 'HOLD' AND b.hold_expires_at IS NOT NULL AND b.hold_expires_at > NOW())
        )
        AND bt.table_id = $3
        AND b.id <> $4
      LIMIT 1
    `,
      [cur.rows[0].booking_date, cur.rows[0].booking_time, tId, id],
    )
    if (conflicts.rows.length) throw badRequest('Bàn đã được đặt trong khung giờ này')

    await withTransaction(async (client) => {
      const prev = await client.query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [id])
      if (prev.rows[0]?.table_id) {
        await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1 AND status = 'RESERVED'`, [
          prev.rows[0].table_id,
        ])
      }
      await client.query('DELETE FROM booking_tables WHERE booking_id = $1', [id])
      await client.query('INSERT INTO booking_tables (booking_id, table_id) VALUES ($1, $2)', [id, tId])
      await client.query(`UPDATE tables SET status = 'RESERVED' WHERE id = $1 AND status = 'AVAILABLE'`, [tId])
      await client.query(`UPDATE bookings SET status = 'HOLD', hold_expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $1`, [
        id,
      ])
    })

    const detail = await query(
      `
      SELECT
        b.*,
        u.name AS user_name,
        u.phone AS user_phone,
        (
          SELECT COALESCE(array_agg(DISTINCT bt.table_id), ARRAY[]::integer[])
          FROM booking_tables bt
          WHERE bt.booking_id = b.id AND bt.table_id IS NOT NULL
        ) AS table_ids,
        (
          SELECT COALESCE(array_agg(DISTINCT t.name), ARRAY[]::text[])
          FROM booking_tables bt2
          JOIN tables t ON t.id = bt2.table_id
          WHERE bt2.booking_id = b.id AND t.name IS NOT NULL
        ) AS tables
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
    `,
      [id],
    )
    return ok(res, mapBookingForClient(detail.rows[0]))
  } catch (e) {
    return next(e)
  }
}

export async function createOnlinePaymentIntent(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const userId = Number(req.user?.sub)
    if (!Number.isFinite(userId)) throw badRequest('Thiếu thông tin người dùng')

    const r = await query('SELECT * FROM bookings WHERE id = $1', [id])
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.rows[0].user_id !== userId) throw notFound('Không tìm thấy đơn đặt bàn')
    if (!['CONFIRMED', 'CHECKED_IN'].includes(r.rows[0].status))
      throw badRequest('Đơn phải đã xác nhận hoặc đã check-in để thanh toán online')

    return ok(res, {
      reservationId: id,
      amount: 0,
      qrContent: 'BANK|ACCOUNT|AMOUNT|CONTENT',
    })
  } catch (e) {
    return next(e)
  }
}

export async function markOnlinePaidByCustomer(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const userId = Number(req.user?.sub)
    if (!Number.isFinite(userId)) throw badRequest('Thiếu thông tin người dùng')

    const r = await query('SELECT id, user_id, status FROM bookings WHERE id = $1', [id])
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    if (r.rows[0].user_id !== userId) throw notFound('Không tìm thấy đơn đặt bàn')
    if (!['CONFIRMED', 'CHECKED_IN'].includes(r.rows[0].status))
      throw badRequest('Đơn phải đã xác nhận hoặc đã check-in')

    return ok(res, { reservationId: id, status: 'PAYMENT_PENDING' })
  } catch (e) {
    return next(e)
  }
}
