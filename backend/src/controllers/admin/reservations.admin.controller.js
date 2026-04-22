import QRCode from 'qrcode'
import { ok } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query, withTransaction } from '../../config/db.js'
import { mapBookingForAdmin } from '../../utils/bookingMapper.js'
import {
  closeSessionsForBooking,
  ensureTableSessionForBooking,
} from '../../services/tableSession.service.js'

async function orderItemsTotal(client, orderId) {
  const tot = await client.query(
    `SELECT COALESCE(SUM(price * quantity), 0)::numeric AS total FROM order_items WHERE order_id = $1`,
    [orderId],
  )
  return Number(tot.rows[0]?.total || 0)
}

/** Không xác nhận / check-in khi bàn gán đang CLOSED. */
function padTimeForDb(t) {
  const s = String(t || '').trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) return null
  const h = m[1].padStart(2, '0')
  const min = m[2].padStart(2, '0')
  const sec = (m[3] || '00').padStart(2, '0')
  return `${h}:${min}:${sec}`
}

/** Tạo đặt bàn không tài khoản, check-in ngay, gán bàn và tạo phiên QR gọi món. */
export async function walkIn(req, res, next) {
  try {
    const { tableId, guestName, guestPhone, guests, bookingDate, bookingTime } = req.body || {}
    const tId = Number(tableId)
    if (!Number.isFinite(tId) || tId <= 0) throw badRequest('tableId là bắt buộc')

    const nGuests = Number(guests)
    const gCount = Number.isFinite(nGuests) && nGuests > 0 ? Math.min(99, nGuests) : 2
    const name =
      guestName != null && String(guestName).trim() ? String(guestName).trim().slice(0, 100) : 'Khách vãng lai'
    const phone =
      guestPhone != null && String(guestPhone).trim() ? String(guestPhone).trim().slice(0, 20) : null

    let bDate = bookingDate != null ? String(bookingDate).trim().slice(0, 10) : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
      const r = await query(`SELECT CURRENT_DATE::text AS d`)
      bDate = r.rows[0].d
    }

    let timeRaw = bookingTime != null ? String(bookingTime).trim() : ''
    const timeForDb = padTimeForDb(timeRaw) || (await query(`SELECT to_char(NOW(), 'HH24:MI:SS') AS t`)).rows[0].t

    const tbl = await query('SELECT id, status FROM tables WHERE id = $1', [tId])
    if (!tbl.rows.length) throw notFound('Bàn không tồn tại')
    const tst = String(tbl.rows[0].status || '').toUpperCase()
    if (tst === 'CLOSED') throw badRequest('Bàn đang đóng — không mở được cho khách')
    if (tst === 'OCCUPIED' || tst === 'RESERVED') throw badRequest('Bàn không trống — chọn bàn khác')

    const conflicts = await query(
      `
      SELECT 1
      FROM booking_tables bt
      JOIN bookings b ON b.id = bt.booking_id
      WHERE b.booking_date = $1::date
        AND b.booking_time = $2::time
        AND (
          b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
          OR (b.status = 'HOLD' AND b.hold_expires_at IS NOT NULL AND b.hold_expires_at > NOW())
        )
        AND bt.table_id = $3
      LIMIT 1
    `,
      [bDate, timeForDb, tId],
    )
    if (conflicts.rows.length) {
      throw badRequest('Bàn đã có đơn khác trong cùng khung giờ — chọn bàn hoặc đợi vài phút')
    }

    const bookingId = await withTransaction(async (client) => {
      const ins = await client.query(
        `
        INSERT INTO bookings (
          user_id, booking_date, booking_time, guests, status,
          note, guest_name, guest_phone
        )
        VALUES (NULL, $1::date, $2::time, $3, 'CHECKED_IN', $4, $5, $6)
        RETURNING id
      `,
        [bDate, timeForDb, gCount, 'Walk-in (vãng lai)', name, phone],
      )
      const bid = ins.rows[0].id
      await client.query('INSERT INTO booking_tables (booking_id, table_id) VALUES ($1, $2)', [bid, tId])
      await client.query(`UPDATE tables SET status = 'OCCUPIED' WHERE id = $1`, [tId])
      return bid
    })

    const payload = await tableSessionPayload(bookingId, 'CHECKED_IN')
    return ok(res, {
      reservationId: bookingId,
      walkIn: true,
      ...payload,
    })
  } catch (e) {
    return next(e)
  }
}

async function assertAssignedTableNotClosed(bookingId, actionVi) {
  const r = await query(
    `
    SELECT t.status
    FROM booking_tables bt
    JOIN tables t ON t.id = bt.table_id
    WHERE bt.booking_id = $1
    LIMIT 1
    `,
    [bookingId],
  )
  if (!r.rows.length) return
  if (String(r.rows[0].status || '').toUpperCase() === 'CLOSED') {
    throw badRequest(
      `Bàn đã đóng — không thể ${actionVi}. Chuyển khách sang bàn khác hoặc mở lại bàn (Trang bàn → Mở bàn).`,
    )
  }
}

async function tableSessionPayload(bookingId, bookingStatus) {
  const sessionPayload = await ensureTableSessionForBooking(bookingId)
  let qrSvg = null
  if (sessionPayload?.orderUrl) {
    try {
      qrSvg = await QRCode.toString(sessionPayload.orderUrl, { type: 'svg', width: 220, margin: 1 })
    } catch {
      /* ignore */
    }
  }
  return {
    reservationId: bookingId,
    status: bookingStatus,
    tableSession: sessionPayload ? { ...sessionPayload, qrSvg } : null,
    tableSessionNote: sessionPayload
      ? null
      : String(bookingStatus || '').toUpperCase() === 'CHECKED_IN'
        ? 'Chưa gán bàn nên chưa tạo QR. Gán bàn cho đơn rồi bấm Vào bàn để tạo link/QR gọi món.'
        : 'Khách chưa vào quán nên chưa tạo QR. Xác nhận đơn trước, sau đó bấm Vào bàn khi khách tới để tạo link/QR gọi món.',
  }
}

/** Lấy (hoặc tạo) QR gọi món cho một booking đang hoạt động. */
export async function getOrderQr(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')
    const b = await query(`SELECT id, status FROM bookings WHERE id = $1`, [id])
    if (!b.rows.length) throw notFound('Không tìm thấy đơn')
    const payload = await tableSessionPayload(id, b.rows[0].status)
    return ok(res, payload)
  } catch (e) {
    return next(e)
  }
}

export async function list(req, res, next) {
  try {
    const r = await query(
      `
      SELECT
        b.*,
        u.name AS user_name,
        u.email AS user_email,
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
      ORDER BY b.created_at DESC
    `,
    )
    return ok(res, r.rows.map((row) => mapBookingForAdmin(row)).filter(Boolean))
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
        (
          SELECT COALESCE(array_agg(DISTINCT bt.table_id), ARRAY[]::integer[])
          FROM booking_tables bt
          WHERE bt.booking_id = b.id AND bt.table_id IS NOT NULL
        ) AS table_ids,
        (
          SELECT COALESCE(array_agg(DISTINCT t2.name), ARRAY[]::text[])
          FROM booking_tables bt2
          JOIN tables t2 ON t2.id = bt2.table_id
          WHERE bt2.booking_id = b.id AND t2.name IS NOT NULL
        ) AS tables
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    return ok(res, mapBookingForAdmin(r.rows[0]))
  } catch (e) {
    return next(e)
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const cur = await query('SELECT id, status FROM bookings WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    if (['COMPLETED', 'CANCELLED'].includes(cur.rows[0].status)) {
      throw badRequest('Không thể hủy đơn ở trạng thái này')
    }

    await closeSessionsForBooking(id)
    const updated = await query(`UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 RETURNING *`, [id])
    return ok(res, updated.rows[0])
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

    const tblSt = await query('SELECT status FROM tables WHERE id = $1', [tId])
    if (!tblSt.rows.length) throw notFound('Bàn không tồn tại')
    if (String(tblSt.rows[0].status || '').toUpperCase() === 'CLOSED') {
      throw badRequest('Bàn đang đóng — không gán được')
    }

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
      [cur.rows[0].booking_date, cur.rows[0].booking_time, tId, bookingId],
    )
    if (conflicts.rows.length) throw badRequest('Bàn đã được đặt trong khung giờ này')

    await withTransaction(async (client) => {
      await client.query('DELETE FROM booking_tables WHERE booking_id = $1', [bookingId])
      await client.query('INSERT INTO booking_tables (booking_id, table_id) VALUES ($1, $2)', [bookingId, tId])
    })

    return ok(res, { reservationId: bookingId, tableId: tId })
  } catch (e) {
    return next(e)
  }
}

/**
 * Chuyển khách sang bàn khác (staff/admin). Giữ nguyên phiên/QR nếu đã có session.
 * Body: { tableId, reason?: string }
 */
export async function transferTable(req, res, next) {
  try {
    const { tableId: nextTableId, reason } = req.body || {}
    const bookingId = Number(req.params.id)
    const tId = Number(nextTableId)
    if (!Number.isFinite(bookingId) || !Number.isFinite(tId)) throw badRequest('id không hợp lệ')

    const cur = await query('SELECT id, booking_date, booking_time, status FROM bookings WHERE id = $1', [bookingId])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    const newT = await query('SELECT id, status FROM tables WHERE id = $1', [tId])
    if (!newT.rows.length) throw notFound('Bàn không tồn tại')
    if (String(newT.rows[0].status || '').toUpperCase() === 'CLOSED') {
      throw badRequest('Bàn đích đang đóng — chọn bàn khác')
    }

    const prevBt = await query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [bookingId])
    if (!prevBt.rows.length) throw badRequest('Đơn chưa gán bàn — không thể chuyển')
    const oldTid = prevBt.rows[0].table_id
    if (Number(oldTid) === tId) throw badRequest('Chọn bàn khác với bàn hiện tại')

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
      [cur.rows[0].booking_date, cur.rows[0].booking_time, tId, bookingId],
    )
    if (conflicts.rows.length) throw badRequest('Bàn đích đã được đặt trong khung giờ này')

    const reasonNote = reason != null && String(reason).trim() ? String(reason).trim() : null
    const bSt = String(cur.rows[0].status || '').toUpperCase()
    const nextTableStatus = bSt === 'CHECKED_IN' ? 'OCCUPIED' : 'RESERVED'

    await withTransaction(async (client) => {
      await client.query('DELETE FROM booking_tables WHERE booking_id = $1', [bookingId])
      await client.query('INSERT INTO booking_tables (booking_id, table_id) VALUES ($1, $2)', [bookingId, tId])

      await client.query(
        `UPDATE table_sessions SET table_id = $1 WHERE booking_id = $2 AND status = 'ACTIVE'`,
        [tId, bookingId],
      )

      await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [oldTid])
      await client.query(`UPDATE tables SET status = $1 WHERE id = $2`, [nextTableStatus, tId])

      if (reasonNote) {
        await client.query(`UPDATE bookings SET note = COALESCE(note, '') || $2 WHERE id = $1`, [
          bookingId,
          `\n[Chuyển bàn] ${reasonNote}`,
        ])
      }
    })

    return ok(res, { reservationId: bookingId, tableId: tId, fromTableId: oldTid })
  } catch (e) {
    return next(e)
  }
}

export async function confirm(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const cur = await query('SELECT id, status FROM bookings WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    const curStatus = String(cur.rows[0].status || '').toUpperCase()
    if (curStatus !== 'PENDING' && curStatus !== 'HOLD') {
      throw badRequest(`Không thể xác nhận đơn ở trạng thái "${curStatus}".`)
    }

    await assertAssignedTableNotClosed(id, 'xác nhận')

    const r = await query(
      `UPDATE bookings SET status = 'CONFIRMED', hold_expires_at = NULL WHERE id = $1 RETURNING *`,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    return ok(res, {
      reservationId: id,
      status: r.rows[0].status,
      tableSession: null,
      tableSessionNote: 'Đã xác nhận đơn. Khi khách tới quán, bấm Vào bàn để tạo QR gọi món.',
    })
  } catch (e) {
    return next(e)
  }
}

export async function checkIn(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    // Cho phép check-in khi đã CONFIRMED hoặc đang HOLD (khách đã giữ bàn trước khi đến).
    const cur = await query('SELECT id, status FROM bookings WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
    const curStatus = String(cur.rows[0].status || '').toUpperCase()
    if (curStatus === 'PENDING') {
      throw badRequest('Đơn chưa được xác nhận — vui lòng Xác nhận đơn trước khi Check-in.')
    }
    if (curStatus === 'CANCELLED') throw badRequest('Đơn đã hủy, không thể check-in.')
    if (curStatus === 'COMPLETED') throw badRequest('Đơn đã hoàn tất, không thể check-in.')
    if (curStatus === 'CHECKED_IN') throw badRequest('Khách đã check-in rồi.')
    if (curStatus !== 'CONFIRMED' && curStatus !== 'HOLD') {
      throw badRequest(`Không thể check-in đơn ở trạng thái "${curStatus}".`)
    }

    await assertAssignedTableNotClosed(id, 'check-in')

    const bt = await query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [id])
    if (bt.rows.length) {
      await query(`UPDATE tables SET status = 'OCCUPIED' WHERE id = $1`, [bt.rows[0].table_id])
    }
    const r = await query(
      `UPDATE bookings SET status = 'CHECKED_IN', hold_expires_at = NULL WHERE id = $1 RETURNING *`,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

    const payload = await tableSessionPayload(id, r.rows[0].status)
    return ok(res, { ...payload, status: 'CHECKED_IN' })
  } catch (e) {
    return next(e)
  }
}

export async function confirmOnlinePayment(req, res, next) {
  try {
    const bookingId = Number(req.params.id)
    if (!Number.isFinite(bookingId)) throw badRequest('id không hợp lệ')

    const pay = await withTransaction(async (client) => {
      let order = await client.query('SELECT * FROM orders WHERE booking_id = $1 ORDER BY id DESC LIMIT 1', [
        bookingId,
      ])
      if (!order.rows.length) {
        order = await client.query('INSERT INTO orders (booking_id, status) VALUES ($1, $2) RETURNING *', [
          bookingId,
          'DONE',
        ])
      }
      const orderId = order.rows[0].id
      const amountTotal = await orderItemsTotal(client, orderId)

      let payRow = await client.query('SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [
        orderId,
      ])
      if (!payRow.rows.length) {
        payRow = await client.query(
          `INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
          [orderId, amountTotal, 'bank_transfer', 'PAID'],
        )
      } else {
        payRow = await client.query(
          `UPDATE payments SET status = 'PAID', amount = COALESCE(NULLIF(amount, 0), $2), method = COALESCE(method, 'bank_transfer'), paid_at = COALESCE(paid_at, NOW()) WHERE id = $1 RETURNING *`,
          [payRow.rows[0].id, amountTotal],
        )
      }

      const b = await client.query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = $1 RETURNING *`, [bookingId])
      if (!b.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

      return payRow.rows[0]
    })

    return ok(res, { reservationId: bookingId, status: 'PAID', paymentId: pay.id })
  } catch (e) {
    return next(e)
  }
}

/** Lấy tổng tiền order của một đặt bàn (dùng cho hiển thị QR thanh toán). */
export async function getOrderTotal(req, res, next) {
  try {
    const bookingId = Number(req.params.id)
    if (!Number.isFinite(bookingId)) throw badRequest('id không hợp lệ')

    const r = await query(
      `
      SELECT
        o.id AS order_id,
        COALESCE(SUM(oi.price * oi.quantity), 0)::numeric AS total
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.booking_id = $1
      GROUP BY o.id
      ORDER BY o.id DESC
      LIMIT 1
      `,
      [bookingId],
    )

    const amount = r.rows.length ? Number(r.rows[0].total) : 0
    return ok(res, { bookingId, amount })
  } catch (e) {
    return next(e)
  }
}

export async function cashierPay(req, res, next) {
  try {
    const bookingId = Number(req.params.id)
    if (!Number.isFinite(bookingId)) throw badRequest('id không hợp lệ')

    const pay = await withTransaction(async (client) => {
      let order = await client.query('SELECT * FROM orders WHERE booking_id = $1 ORDER BY id DESC LIMIT 1', [
        bookingId,
      ])
      if (!order.rows.length) {
        order = await client.query('INSERT INTO orders (booking_id, status) VALUES ($1, $2) RETURNING *', [
          bookingId,
          'DONE',
        ])
      } else {
        order = await client.query(`UPDATE orders SET status = 'DONE' WHERE id = $1 RETURNING *`, [order.rows[0].id])
      }
      const orderId = order.rows[0].id
      const amountTotal = await orderItemsTotal(client, orderId)

      const payRow = await client.query(
        `INSERT INTO payments (order_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [orderId, amountTotal, 'cash', 'PAID'],
      )

      const b = await client.query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = $1 RETURNING *`, [bookingId])
      if (!b.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')

      const bt = await client.query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [bookingId])
      if (bt.rows.length) {
        await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [bt.rows[0].table_id])
      }

      return payRow.rows[0]
    })

    return ok(res, { reservationId: bookingId, status: 'COMPLETED', paymentId: pay.id })
  } catch (e) {
    return next(e)
  }
}

/**
 * Trả bàn / gỡ khách: đóng phiên QR, kết thúc đơn, bàn về trống (AVAILABLE).
 * Khác với đóng bàn bảo trì (POST /admin/tables/:id/close → tables.status = CLOSED).
 */
export async function releaseGuest(req, res, next) {
  try {
    const bookingId = Number(req.params.id)
    if (!Number.isFinite(bookingId)) throw badRequest('id không hợp lệ')
    const { note } = req.body || {}

    await withTransaction(async (client) => {
      const cur = await client.query('SELECT id, status FROM bookings WHERE id = $1', [bookingId])
      if (!cur.rows.length) throw notFound('Không tìm thấy đơn đặt bàn')
      const st = String(cur.rows[0].status || '').toUpperCase()
      if (st === 'COMPLETED' || st === 'CANCELLED') throw badRequest('Đơn đã kết thúc')
      if (st !== 'CHECKED_IN') {
        throw badRequest('Chỉ trả bàn khi khách đã vào bàn (đã check-in).')
      }

      await client.query(
        `UPDATE table_sessions SET status = 'CLOSED', closed_at = NOW()
         WHERE booking_id = $1 AND status = 'ACTIVE'`,
        [bookingId],
      )

      await client.query(
        `UPDATE orders SET status = 'DONE' WHERE booking_id = $1 AND status IN ('PENDING', 'SERVING')`,
        [bookingId],
      )

      const noteTrim = note != null ? String(note).trim() : ''
      if (noteTrim) {
        await client.query(`UPDATE bookings SET status = 'COMPLETED', note = COALESCE(note, '') || $2 WHERE id = $1`, [
          bookingId,
          `\n[Trả bàn] ${noteTrim}`,
        ])
      } else {
        await client.query(`UPDATE bookings SET status = 'COMPLETED' WHERE id = $1`, [bookingId])
      }

      const bt = await client.query('SELECT table_id FROM booking_tables WHERE booking_id = $1', [bookingId])
      if (bt.rows.length) {
        await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [bt.rows[0].table_id])
      }
    })

    return ok(res, { reservationId: bookingId, status: 'COMPLETED' })
  } catch (e) {
    return next(e)
  }
}
