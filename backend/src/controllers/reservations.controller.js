import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

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
    const { date, time, guestCount, note, tableId, tableIds } = req.body || {}
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

    await query('BEGIN')

    if (requestedTableIds.length) {
      const conflicts = await query(
        `
        SELECT bt.table_id
        FROM booking_tables bt
        JOIN bookings b ON b.id = bt.booking_id
        WHERE b.booking_date = $1
          AND b.booking_time = $2
          AND b.status IN ('PENDING', 'CONFIRMED')
          AND bt.table_id = ANY($3::int[])
      `,
        [booking_date, booking_time, requestedTableIds],
      )
      if (conflicts.rows.length) {
        await query('ROLLBACK')
        throw badRequest('Bàn đã được đặt trong khung giờ này')
      }
    }

    const inserted = await query(
      `
      INSERT INTO bookings (user_id, booking_date, booking_time, guests, status, note)
      VALUES ($1, $2, $3, $4, 'PENDING', $5)
      RETURNING id, user_id, booking_date, booking_time, guests, status, note, created_at
    `,
      [userId, booking_date, booking_time, guests, note ? String(note) : null],
    )

    const booking = inserted.rows[0]

    if (requestedTableIds.length) {
      const values = requestedTableIds.map((_, idx) => `($1, $${idx + 2})`).join(', ')
      await query(
        `INSERT INTO booking_tables (booking_id, table_id) VALUES ${values}`,
        [booking.id, ...requestedTableIds],
      )
    }

    await query('COMMIT')

    return created(res, booking)
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
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
        COALESCE(array_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '{}') AS tables
      FROM bookings b
      LEFT JOIN booking_tables bt ON bt.booking_id = b.id
      LEFT JOIN tables t ON t.id = bt.table_id
      WHERE b.user_id = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `,
      [userId],
    )

    return ok(res, r.rows)
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
        COALESCE(array_agg(bt.table_id) FILTER (WHERE bt.table_id IS NOT NULL), '{}') AS table_ids
      FROM bookings b
      LEFT JOIN booking_tables bt ON bt.booking_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    const booking = r.rows[0]
    const userId = Number(req.user?.sub)
    if (Number.isFinite(userId) && booking.user_id && booking.user_id !== userId) {
      throw notFound('Không tìm thấy đơn đặt bàn')
    }

    return ok(res, booking)
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
    if (cur.rows[0].status !== 'PENDING') throw badRequest('Chỉ được hủy khi đơn đang chờ xác nhận')

    const updated = await query(
      `UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
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
        AND b.status IN ('PENDING', 'CONFIRMED')
        AND bt.table_id = $3
        AND b.id <> $4
      LIMIT 1
    `,
      [cur.rows[0].booking_date, cur.rows[0].booking_time, tId, id],
    )
    if (conflicts.rows.length) throw badRequest('Bàn đã được đặt trong khung giờ này')

    await query('BEGIN')
    await query('DELETE FROM booking_tables WHERE booking_id = $1', [id])
    await query('INSERT INTO booking_tables (booking_id, table_id) VALUES ($1, $2)', [id, tId])
    await query('COMMIT')

    const detail = await query(
      `
      SELECT
        b.*,
        COALESCE(array_agg(bt.table_id) FILTER (WHERE bt.table_id IS NOT NULL), '{}') AS table_ids
      FROM bookings b
      LEFT JOIN booking_tables bt ON bt.booking_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `,
      [id],
    )
    return ok(res, detail.rows[0])
  } catch (e) {
    await query('ROLLBACK').catch(() => {})
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
    if (r.rows[0].status !== 'CONFIRMED') throw badRequest('Đơn phải ở trạng thái CONFIRMED để thanh toán online')

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
    if (r.rows[0].status !== 'CONFIRMED') throw badRequest('Đơn phải ở trạng thái CONFIRMED')

    return ok(res, { reservationId: id, status: 'PAYMENT_PENDING' })
  } catch (e) {
    return next(e)
  }
}
