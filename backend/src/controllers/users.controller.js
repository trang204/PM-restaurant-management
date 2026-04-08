import { ok } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

export async function getMe(req, res, next) {
  try {
    const id = Number(req.user?.sub)
    if (!Number.isFinite(id)) throw badRequest('Thiếu thông tin người dùng')

    const r = await query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        r.name AS role,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')
    const row = r.rows[0]
    return ok(res, {
      id: String(row.id),
      fullName: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role || req.user?.role,
      createdAt: row.created_at,
    })
  } catch (e) {
    return next(e)
  }
}

export async function updateMe(req, res, next) {
  try {
    const id = Number(req.user?.sub)
    if (!Number.isFinite(id)) throw badRequest('Thiếu thông tin người dùng')

    const { fullName, name, phone } = req.body || {}
    const nextNameRaw = fullName ?? name
    const nextName = nextNameRaw != null ? String(nextNameRaw).trim() : ''
    const nextPhone = phone != null && String(phone).trim() ? String(phone).trim() : null
    if (!nextName) throw badRequest('fullName là bắt buộc')

    const r = await query(
      `
      UPDATE users
      SET name = $1, phone = $2
      WHERE id = $3
      RETURNING id, name, email, phone, role_id, created_at
    `,
      [nextName, nextPhone, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')

    const roleRes = await query('SELECT name FROM roles WHERE id = $1', [r.rows[0].role_id])
    const roleName = roleRes.rows[0]?.name || req.user?.role

    return ok(res, {
      id: String(r.rows[0].id),
      fullName: r.rows[0].name,
      email: r.rows[0].email,
      phone: r.rows[0].phone,
      role: roleName,
      createdAt: r.rows[0].created_at,
    })
  } catch (e) {
    return next(e)
  }
}

