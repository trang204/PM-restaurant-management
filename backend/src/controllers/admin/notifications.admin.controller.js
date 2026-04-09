import { ok } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

export async function listMine(req, res, next) {
  try {
    const uid = Number(req.user?.sub)
    if (!Number.isFinite(uid)) throw badRequest('Thiếu thông tin người dùng')

    const items = await query(
      `
      SELECT id, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 40
    `,
      [uid],
    )
    const c = await query(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND COALESCE(is_read, FALSE) = FALSE`,
      [uid],
    )
    return ok(res, {
      items: items.rows,
      unreadCount: c.rows[0]?.n ?? 0,
    })
  } catch (e) {
    return next(e)
  }
}

export async function markRead(req, res, next) {
  try {
    const uid = Number(req.user?.sub)
    if (!Number.isFinite(uid)) throw badRequest('Thiếu thông tin người dùng')
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, uid],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy thông báo')
    return ok(res, { ok: true })
  } catch (e) {
    return next(e)
  }
}

export async function markAllRead(req, res, next) {
  try {
    const uid = Number(req.user?.sub)
    if (!Number.isFinite(uid)) throw badRequest('Thiếu thông tin người dùng')
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND COALESCE(is_read, FALSE) = FALSE`, [
      uid,
    ])
    return ok(res, { ok: true })
  } catch (e) {
    return next(e)
  }
}
