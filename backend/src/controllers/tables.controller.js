import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

const ALLOWED_STATUS = new Set(['AVAILABLE', 'RESERVED', 'OCCUPIED'])

export async function listTables(req, res, next) {
  try {
    const r = await query(
      'SELECT id, name, capacity, status, pos_x, pos_y, created_at FROM tables ORDER BY id ASC',
    )
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function getTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      'SELECT id, name, capacity, status, pos_x, pos_y, created_at FROM tables WHERE id = $1',
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy bàn')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function createTable(req, res, next) {
  try {
    const { name, capacity, status, pos_x, pos_y } = req.body || {}
    if (!name) throw badRequest('name là bắt buộc')
    if (capacity === undefined || capacity === null) throw badRequest('capacity là bắt buộc')

    const cap = Number(capacity)
    if (!Number.isFinite(cap) || cap <= 0) throw badRequest('capacity không hợp lệ')

    const st = status ? String(status).toUpperCase() : 'AVAILABLE'
    if (!ALLOWED_STATUS.has(st)) throw badRequest('status không hợp lệ')

    const r = await query(
      `
      INSERT INTO tables (name, capacity, status, pos_x, pos_y)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, capacity, status, pos_x, pos_y, created_at
    `,
      [
        String(name),
        cap,
        st,
        pos_x === undefined ? null : pos_x,
        pos_y === undefined ? null : pos_y,
      ],
    )
    return created(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function updateTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const { name, capacity, status, pos_x, pos_y } = req.body || {}
    const cap =
      capacity === undefined || capacity === null ? null : Number(capacity)
    if (cap !== null && (!Number.isFinite(cap) || cap <= 0)) throw badRequest('capacity không hợp lệ')

    const st = status ? String(status).toUpperCase() : null
    if (st !== null && !ALLOWED_STATUS.has(st)) throw badRequest('status không hợp lệ')

    const r = await query(
      `
      UPDATE tables
      SET
        name = COALESCE($1, name),
        capacity = COALESCE($2, capacity),
        status = COALESCE($3, status),
        pos_x = COALESCE($4, pos_x),
        pos_y = COALESCE($5, pos_y)
      WHERE id = $6
      RETURNING id, name, capacity, status, pos_x, pos_y, created_at
    `,
      [
        name ? String(name) : null,
        cap,
        st,
        pos_x === undefined ? null : pos_x,
        pos_y === undefined ? null : pos_y,
        id,
      ],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy bàn')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function deleteTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      'DELETE FROM tables WHERE id = $1 RETURNING id, name, capacity, status, pos_x, pos_y, created_at',
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy bàn')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

