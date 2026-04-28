import bcrypt from 'bcrypt'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads')
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const USER_STATUS = new Set(['ACTIVE', 'LOCKED'])

async function removeUploadFileIfSafe(publicPath) {
  const raw = String(publicPath || '').trim()
  if (!raw.startsWith('/uploads/')) return
  const rel = raw.replace(/^\/uploads\//, '')
  if (!rel || rel.includes('..')) return
  const full = path.join(UPLOAD_DIR, rel)
  if (!full.startsWith(UPLOAD_DIR)) return
  await fs.unlink(full).catch(() => {})
}

function mapUserRow(row) {
  return {
    ...row,
    fullName: row.name,
  }
}

export async function list(req, res, next) {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const role = req.query.role ? String(req.query.role).toUpperCase() : null
    const status = req.query.status ? String(req.query.status).toUpperCase() : null
    const createdFrom = req.query.createdFrom ? String(req.query.createdFrom).slice(0, 10) : null
    const createdTo = req.query.createdTo ? String(req.query.createdTo).slice(0, 10) : null
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1)
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(req.query.pageSize || '10'), 10) || 10))

    const params = []
    const where = []
    if (q) {
      params.push(`%${q}%`)
      where.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR LOWER(COALESCE(u.phone, '')) LIKE $${params.length})`)
    }
    if (role) {
      params.push(role)
      where.push(`r.name = $${params.length}`)
    }
    if (status && status !== 'ALL') {
      if (!USER_STATUS.has(status)) throw badRequest('status không hợp lệ')
      params.push(status)
      where.push(`COALESCE(u.status, 'ACTIVE') = $${params.length}`)
    }
    if (createdFrom) {
      params.push(createdFrom)
      where.push(`u.created_at >= $${params.length}::date`)
    }
    if (createdTo) {
      params.push(createdTo)
      where.push(`u.created_at < ($${params.length}::date + INTERVAL '1 day')`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const totalRes = await query(
      `
      SELECT COUNT(*)::int AS total
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      ${whereSql}
    `,
      params,
    )

    const offset = (page - 1) * pageSize
    const listParams = [...params, pageSize, offset]

    const r = await query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        COALESCE(u.status, 'ACTIVE') AS status,
        r.name AS role,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
    `,
      listParams,
    )
    return ok(res, {
      items: r.rows.map(mapUserRow),
      pagination: {
        page,
        pageSize,
        total: Number(totalRes.rows[0]?.total || 0),
        totalPages: Math.max(1, Math.ceil(Number(totalRes.rows[0]?.total || 0) / pageSize)),
      },
    })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { name, email, password, phone, role, status } = req.body || {}
    if (!name || !email || !password) throw badRequest('name, email, password là bắt buộc')

    const emailNorm = String(email).trim().toLowerCase()
    const exists = await query('SELECT id FROM users WHERE email = $1', [emailNorm])
    if (exists.rows.length) throw badRequest('Email đã tồn tại')

    const roleName = role ? String(role).toUpperCase() : 'STAFF'
    const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', [roleName])
    if (!roleRes.rows.length) throw badRequest('role không hợp lệ')
    const statusName = status ? String(status).toUpperCase() : 'ACTIVE'
    if (!USER_STATUS.has(statusName)) throw badRequest('status không hợp lệ')

    const passwordHash = await bcrypt.hash(String(password), 10)
    const r = await query(
      `
      INSERT INTO users (name, email, password, phone, role_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, phone, avatar_url, status, role_id, created_at
    `,
      [String(name).trim(), emailNorm, passwordHash, phone ? String(phone) : null, roleRes.rows[0].id, statusName],
    )

    return created(res, {
      id: r.rows[0].id,
      name: r.rows[0].name,
      email: r.rows[0].email,
      phone: r.rows[0].phone,
      avatar_url: r.rows[0].avatar_url,
      status: r.rows[0].status,
      role: roleRes.rows[0].name,
      created_at: r.rows[0].created_at,
      fullName: r.rows[0].name,
    })
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const { role, fullName, name, email, phone, status } = req.body || {}
    const nameVal = String(fullName ?? name ?? '').trim()
    if (!nameVal) throw badRequest('fullName là bắt buộc')

    const emailNorm = String(email || '').trim().toLowerCase()
    if (!emailNorm) throw badRequest('email là bắt buộc')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw badRequest('Email không hợp lệ')

    const phoneVal = phone != null && String(phone).trim() ? String(phone).trim().replace(/[.\s-]/g, '') : null
    if (phoneVal && !/^(?:\+?84|0)\d{9,10}$/.test(phoneVal)) {
      throw badRequest('Số điện thoại không hợp lệ')
    }

    const roleName = String(role || '').toUpperCase()
    if (!roleName) throw badRequest('role là bắt buộc')
    const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', [roleName])
    if (!roleRes.rows.length) throw badRequest('role không hợp lệ')

    const statusName = String(status || 'ACTIVE').toUpperCase()
    if (!USER_STATUS.has(statusName)) throw badRequest('status không hợp lệ')

    const exists = await query('SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1', [emailNorm, id])
    if (exists.rows.length) throw badRequest('Email đã tồn tại')

    const r = await query(
      `
      UPDATE users
      SET name = $1, email = $2, phone = $3, role_id = $4, status = $5
      WHERE id = $6
      RETURNING id, name, email, phone, avatar_url, status, role_id, created_at
    `,
      [nameVal, emailNorm, phoneVal, roleRes.rows[0].id, statusName, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')

    return ok(res, mapUserRow({ ...r.rows[0], role: roleRes.rows[0].name }))
  } catch (e) {
    return next(e)
  }
}

export async function uploadAvatar(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const file = req.file
    if (!file) throw badRequest('Cần file ảnh')
    const mime = String(file.mimetype || '').toLowerCase()
    if (!IMAGE_MIME.has(mime)) throw badRequest('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF')

    const cur = await query('SELECT id, avatar_url, role_id, status FROM users WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy người dùng')
    const prevUrl = cur.rows[0].avatar_url

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'gif'
    const safeName = `user_${id}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), file.buffer)

    const publicUrl = `/uploads/${safeName}`
    const r = await query(
      `
      UPDATE users
      SET avatar_url = $1
      WHERE id = $2
      RETURNING id, name, email, phone, avatar_url, status, role_id, created_at
    `,
      [publicUrl, id],
    )
    if (prevUrl && prevUrl !== publicUrl) await removeUploadFileIfSafe(prevUrl)

    const roleRes = await query('SELECT name FROM roles WHERE id = $1', [r.rows[0].role_id])
    return ok(res, mapUserRow({ ...r.rows[0], role: roleRes.rows[0]?.name || null }))
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
