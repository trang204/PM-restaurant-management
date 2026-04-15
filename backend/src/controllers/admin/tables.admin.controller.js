import { ok } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

/**
 * Đóng bàn (sự cố / bảo trì). Staff/admin có thể đóng kể cả khi đang có khách.
 * Body: { reason?: string }
 */
export async function closeTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')
    const { reason } = req.body || {}
    const note = reason != null && String(reason).trim() ? String(reason).trim() : null

    const t = await query('SELECT id, status FROM tables WHERE id = $1', [id])
    if (!t.rows.length) throw notFound('Không tìm thấy bàn')
    if (String(t.rows[0].status || '').toUpperCase() === 'CLOSED') {
      return ok(res, { tableId: id, status: 'CLOSED', message: 'Bàn đã ở trạng thái đóng' })
    }

    const upd = await query(
      `UPDATE tables SET status = 'CLOSED', status_note = $2 WHERE id = $1
       RETURNING id, name, capacity, image_url, status, status_note, pos_x, pos_y, created_at`,
      [id, note],
    )
    return ok(res, upd.rows[0])
  } catch (e) {
    return next(e)
  }
}

/** Mở lại bàn đã đóng (AVAILABLE, xóa ghi chú đóng). */
export async function reopenTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const t = await query('SELECT id, status FROM tables WHERE id = $1', [id])
    if (!t.rows.length) throw notFound('Không tìm thấy bàn')
    if (String(t.rows[0].status || '').toUpperCase() !== 'CLOSED') {
      throw badRequest('Chỉ mở lại được bàn đang ở trạng thái đóng')
    }

    const upd = await query(
      `UPDATE tables SET status = 'AVAILABLE', status_note = NULL WHERE id = $1
       RETURNING id, name, capacity, image_url, status, status_note, pos_x, pos_y, created_at`,
      [id],
    )
    return ok(res, upd.rows[0])
  } catch (e) {
    return next(e)
  }
}
