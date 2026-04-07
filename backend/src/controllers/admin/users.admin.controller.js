import bcrypt from 'bcrypt'
import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

export async function list(req, res, next) {
  try {
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
      ORDER BY u.created_at DESC
    `,
    )
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { name, email, password, phone, role } = req.body || {}
    if (!name || !email || !password) throw badRequest('name, email, password là bắt buộc')

    const emailNorm = String(email).trim().toLowerCase()
    const exists = await query('SELECT id FROM users WHERE email = $1', [emailNorm])
    if (exists.rows.length) throw badRequest('Email đã tồn tại')

    const roleName = role ? String(role).toUpperCase() : 'STAFF'
    const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', [roleName])
    if (!roleRes.rows.length) throw badRequest('role không hợp lệ')

    const passwordHash = await bcrypt.hash(String(password), 10)
    const r = await query(
      `
      INSERT INTO users (name, email, password, phone, role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, phone, role_id, created_at
    `,
      [String(name).trim(), emailNorm, passwordHash, phone ? String(phone) : null, roleRes.rows[0].id],
    )

    return created(res, {
      id: r.rows[0].id,
      name: r.rows[0].name,
      email: r.rows[0].email,
      phone: r.rows[0].phone,
      role: roleRes.rows[0].name,
      created_at: r.rows[0].created_at,
    })
  } catch (e) {
    return next(e)
  }
}

export async function updateRole(req, res, next) {
  try {
    const { role } = req.body || {}
    if (!role) throw badRequest('role là bắt buộc')

    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const roleName = String(role).toUpperCase()
    const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', [roleName])
    if (!roleRes.rows.length) throw badRequest('role không hợp lệ')

    const r = await query(
      `
      UPDATE users
      SET role_id = $1
      WHERE id = $2
      RETURNING id, name, email, phone, role_id, created_at
    `,
      [roleRes.rows[0].id, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')

    return ok(res, { id: r.rows[0].id, role: roleRes.rows[0].name })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')
    return ok(res, { id: r.rows[0].id, deleted: true })
  } catch (e) {
    return next(e)
  }
}
