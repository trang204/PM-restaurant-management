import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

export async function listZones(req, res, next) {
  try {
    const r = await query(`SELECT id, name, created_at FROM zones ORDER BY name ASC`)
    return ok(res, r.rows)
  } catch (e) { return next(e) }
}

export async function createZone(req, res, next) {
  try {
    const { name } = req.body || {}
    if (!name || !String(name).trim()) throw badRequest('Tên khu vực là bắt buộc')
    const r = await query(
      `INSERT INTO zones (name) VALUES ($1) RETURNING id, name, created_at`,
      [String(name).trim()]
    )
    return created(res, r.rows[0])
  } catch (e) {
    if (e.code === '23505') return next(badRequest('Tên khu vực đã tồn tại'))
    return next(e)
  }
}

export async function deleteZone(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')
    // Bỏ zone khỏi các bàn thuộc zone này
    await query(`UPDATE tables SET zone = NULL WHERE zone = (SELECT name FROM zones WHERE id = $1)`, [id])
    const r = await query(`DELETE FROM zones WHERE id = $1 RETURNING id, name`, [id])
    if (!r.rows.length) throw notFound('Không tìm thấy khu vực')
    return ok(res, r.rows[0])
  } catch (e) { return next(e) }
}
