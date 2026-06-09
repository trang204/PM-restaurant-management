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

    let upd
    try {
      upd = await query(
        `UPDATE tables SET status = 'CLOSED', status_note = $2 WHERE id = $1
         RETURNING id, name, capacity, image_url, status, status_note, pos_x, pos_y, created_at`,
        [id, note],
      )
    } catch (dbErr) {
      const code = dbErr && typeof dbErr === 'object' && 'code' in dbErr ? String(dbErr.code) : ''
      const msg = dbErr && typeof dbErr === 'object' && 'message' in dbErr ? String(dbErr.message) : String(dbErr)
      // 23514: check_violation — thường do CHECK/ENUM DB cũ không có CLOSED
      if (code === '23514' || /CLOSED|check constraint|enum/i.test(msg)) {
        throw badRequest(
          'Không lưu được trạng thái Đóng bàn — cột status trên database có thể thiếu giá trị CLOSED. Khởi động lại backend để chạy migrate (ensureDbSchema) hoặc cập nhật thủ công cột/ENUM.',
        )
      }
      throw dbErr
    }
    if (!upd.rows.length) throw notFound('Không tìm thấy bàn')
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

/**
 * Cập nhật vị trí nhiều bàn cùng lúc
 * Body: { layout: [{ id, pos_x, pos_y }] }
 */
export async function bulkUpdateLayout(req, res, next) {
  try {
    const { layout } = req.body || {}
    if (!Array.isArray(layout)) {
      throw badRequest('layout phải là một mảng')
    }

    await query('BEGIN')
    try {
      for (const item of layout) {
        if (!item || typeof item.id !== 'number') continue
        const posX = Number.isFinite(Number(item.pos_x)) ? Number(item.pos_x) : null
        const posY = Number.isFinite(Number(item.pos_y)) ? Number(item.pos_y) : null
        await query('UPDATE tables SET pos_x = $1, pos_y = $2 WHERE id = $3', [posX, posY, item.id])
      }
      await query('COMMIT')
      return ok(res, { message: 'Cập nhật sơ đồ bàn thành công' })
    } catch (err) {
      await query('ROLLBACK')
      throw err
    }
  } catch (e) {
    return next(e)
  }
}
