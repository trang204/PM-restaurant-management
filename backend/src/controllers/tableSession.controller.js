import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'
import {
  getOrCreateOrderForSession,
  getOrCreatePendingOrderForSession,
  loadActiveSessionByToken,
  publicOrderUrl,
} from '../services/tableSession.service.js'
import { notifyStaffAdmins } from '../utils/notifyStaff.js'

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
        AND b.status = 'CHECKED_IN'
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

    // Lấy items từ tất cả orders đang active (PENDING + SERVING) của session
    const itemsRes = await query(
      `
      SELECT oi.*, f.name AS food_name,
             o.id AS order_id, o.status AS order_status
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN foods f ON f.id = oi.food_id
      WHERE o.table_session_id = $1
        AND o.status IN ('PENDING', 'SERVING')
      ORDER BY o.id ASC, oi.id ASC
    `,
      [row.session_id],
    )

    const menuRes = await query(
      `
      SELECT
        f.id,
        f.name,
        f.price,
        f.description,
        f.image_url,
        COALESCE(f.status, 'AVAILABLE') AS status,
        f.category_id,
        c.name AS category_name
      FROM foods f
      LEFT JOIN categories c ON c.id = f.category_id
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

    // Luôn lấy/tạo PENDING order — nếu đang SERVING thì tạo đợt mới
    const orderRow = await getOrCreatePendingOrderForSession(row)
    const orderId = orderRow.id
    const st = String(orderRow.status || '').toUpperCase()
    if (st !== 'PENDING') throw badRequest('Đơn không thể thêm món ở trạng thái này')

    const foodRes = await query(
      `SELECT id, name, price FROM foods WHERE id = $1 AND COALESCE(status, 'AVAILABLE') = 'AVAILABLE'`,
      [foodId],
    )
    if (!foodRes.rows.length) throw notFound('Không tìm thấy món')

    const price = foodRes.rows[0].price
    const foodName = String(foodRes.rows[0].name || 'Món').trim() || 'Món'
    const tableLabel = String(row.table_name || 'Bàn').trim() || 'Bàn'

    const existing = await query(
      'SELECT id, quantity FROM order_items WHERE order_id = $1 AND food_id = $2',
      [orderId, foodId],
    )
    if (existing.rows.length) {
      const r2 = await query(
        `UPDATE order_items
         SET quantity = quantity + $1, kitchen_status = 'PENDING', kitchen_ack_at = NULL
         WHERE id = $2 RETURNING *`,
        [qty, existing.rows[0].id],
      )
      notifyStaffAdmins(`[Gọi món] ${tableLabel}: ${foodName} x${qty} (thêm vào đơn)`).catch(() => {})
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
    notifyStaffAdmins(`[Gọi món] ${tableLabel}: ${foodName} x${qty}`).catch(() => {})
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

    const sessionId = row.session_id
    // Chỉ cho phép sửa items thuộc PENDING orders
    const r = await query(
      `
      UPDATE order_items oi
      SET quantity = $1
      FROM orders o
      WHERE oi.id = $2 AND oi.order_id = o.id AND o.table_session_id = $3
        AND o.status = 'PENDING'
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

    const sessionId = row.session_id
    // Chỉ cho phép xóa items thuộc PENDING orders
    const r = await query(
      `
      DELETE FROM order_items oi
      USING orders o
      WHERE oi.id = $1 AND oi.order_id = o.id AND o.table_session_id = $2
        AND o.status = 'PENDING'
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

async function computeSessionTotal(sessionId) {
  const r = await query(
    `SELECT COALESCE(SUM(oi.price * oi.quantity), 0)::numeric AS total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.table_session_id = $1 AND o.status IN ('PENDING', 'SERVING')`,
    [sessionId],
  )
  return Number(r.rows[0]?.total || 0)
}

export async function submitOrder(req, res, next) {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) throw badRequest('Thiếu mã')

    const row = await loadActiveSessionByToken(token)
    if (!row) throw notFound('Link không hợp lệ hoặc phiên đã đóng')

    // Chỉ submit PENDING order (đợt mới nhất)
    const pendingRes = await query(
      `SELECT id FROM orders WHERE table_session_id = $1 AND status = 'PENDING' ORDER BY id DESC LIMIT 1`,
      [row.session_id],
    )
    if (!pendingRes.rows.length) throw badRequest('Không có đơn mới để xác nhận')
    const orderId = pendingRes.rows[0].id

    const total = await computeOrderTotal(orderId)
    if (!Number.isFinite(total) || total <= 0) throw badRequest('Chưa có món trong đơn mới')

    const updated = await query(
      `UPDATE orders SET status = 'SERVING' WHERE id = $1 AND status = 'PENDING' RETURNING id, status`,
      [orderId],
    )
    if (!updated.rows.length) throw badRequest('Đơn không thể xác nhận ở trạng thái này')

    const tableLabel = String(row.table_name || 'Bàn').trim() || 'Bàn'
    notifyStaffAdmins(
      `[Gửi đơn] ${tableLabel}: khách đã gửi đơn — tổng ${Number(total).toLocaleString('vi-VN')} ₫`,
    ).catch(() => {})

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
    const total = await computeSessionTotal(row.session_id)
    const paymentRow = pay.rows[0] || null
    const isBankTransfer = String(paymentRow?.method || '').toLowerCase() === 'bank_transfer'
    const bankQr = isBankTransfer ? await buildBankQrUrl(orderId, total) : null
    return ok(res, {
      orderId,
      total,
      payment: paymentRow,
      qrUrl: bankQr?.qrUrl ?? null,
      bankAccount: bankQr?.bankAccount ?? null,
      bankCode: bankQr?.bankCode ?? null,
      transferContent: bankQr?.transferContent ?? null,
    })
  } catch (e) {
    return next(e)
  }
}

/** Lấy thông tin ngân hàng từ settings và build URL QR SePay. */
async function buildBankQrUrl(orderId, total) {
  try {
    const sr = await query(
      `SELECT payment_bank_account, payment_bank_code, payment_transfer_content, payment_qr_template FROM settings ORDER BY id LIMIT 1`,
    )
    const s = sr.rows[0] || {}
    const bankAccount = String(s.payment_bank_account || '').trim()
    const bankCode = String(s.payment_bank_code || '').trim()
    if (!bankAccount || !bankCode) return null

    const rawContent = String(s.payment_transfer_content || 'Don {id}').trim()
    const content = rawContent
      .replace(/\{id\}/g, String(orderId))
      .replace(/\{amount\}/g, String(Math.round(total)))
    const template = String(s.payment_qr_template || '').trim()

    const params = new URLSearchParams()
    params.set('acc', bankAccount)
    params.set('bank', bankCode)
    if (total > 0) params.set('amount', String(Math.round(total)))
    if (content) params.set('des', content)
    if (template) params.set('template', template)

    return {
      qrUrl: `https://qr.sepay.vn/img?${params.toString()}`,
      bankAccount,
      bankCode,
      transferContent: content,
    }
  } catch {
    return null
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

    const total = await computeSessionTotal(row.session_id)
    if (!Number.isFinite(total) || total <= 0) throw badRequest('Chưa có món trong đơn')

    const existingPaid = await query(
      `SELECT id FROM payments WHERE order_id = $1 AND status = 'PAID' ORDER BY id DESC LIMIT 1`,
      [orderId],
    )
    if (existingPaid.rows.length) throw badRequest('Đơn đã thanh toán')

    const tableLabel = String(row.table_name || 'Bàn').trim() || 'Bàn'
    const methodVi = m === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'
    const money = `${Number(total).toLocaleString('vi-VN')} ₫`

    const latest = await query(`SELECT id, status FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1`, [
      orderId,
    ])
    let payRow
    let isUpdate = false
    if (latest.rows.length && String(latest.rows[0].status || '').toUpperCase() === 'UNPAID') {
      const upd = await query(
        `UPDATE payments SET amount = $2, method = $3 WHERE id = $1 RETURNING *`,
        [latest.rows[0].id, total, m],
      )
      payRow = upd.rows[0]
      isUpdate = true
      notifyStaffAdmins(
        `[Thanh toán] ${tableLabel}: khách cập nhật yêu cầu — ${methodVi} · ${money} · Đơn #${orderId}`,
      ).catch(() => {})
    } else {
      const ins = await query(
        `INSERT INTO payments (order_id, amount, method, status) VALUES ($1, $2, $3, 'UNPAID') RETURNING *`,
        [orderId, total, m],
      )
      payRow = ins.rows[0]
      notifyStaffAdmins(
        `[Thanh toán] ${tableLabel}: khách yêu cầu thanh toán — ${methodVi} · ${money} · Đơn #${orderId}`,
      ).catch(() => {})
    }

    const bankQr = m === 'bank_transfer' ? await buildBankQrUrl(orderId, total) : null
    const payload = {
      orderId,
      total,
      payment: payRow,
      qrUrl: bankQr?.qrUrl ?? null,
      bankAccount: bankQr?.bankAccount ?? null,
      bankCode: bankQr?.bankCode ?? null,
      transferContent: bankQr?.transferContent ?? null,
    }
    return isUpdate ? ok(res, payload) : created(res, payload)
  } catch (e) {
    return next(e)
  }
}
