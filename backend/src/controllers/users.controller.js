import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { ok } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

function mapMeRow(row, req) {
  return {
    id: String(row.id),
    fullName: row.name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url ?? null,
    role: row.role || req.user?.role,
    createdAt: row.created_at,
  }
}

/** Xóa file trong thư mục uploads nếu đường dẫn hợp lệ (chỉ /uploads/...). */
async function removeUploadFileIfSafe(publicPath) {
  const raw = String(publicPath || '').trim()
  if (!raw.startsWith('/uploads/')) return
  const rel = raw.replace(/^\/uploads\//, '')
  if (!rel || rel.includes('..')) return
  const full = path.join(UPLOAD_DIR, rel)
  if (!full.startsWith(UPLOAD_DIR)) return
  await fs.unlink(full).catch(() => {})
}

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
        u.avatar_url,
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
    return ok(res, mapMeRow(r.rows[0], req))
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
      RETURNING id, name, email, phone, avatar_url, role_id, created_at
    `,
      [nextName, nextPhone, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')

    const roleRes = await query('SELECT name FROM roles WHERE id = $1', [r.rows[0].role_id])
    const roleName = roleRes.rows[0]?.name || req.user?.role

    return ok(res, {
      ...mapMeRow({ ...r.rows[0], role: roleName }, req),
    })
  } catch (e) {
    return next(e)
  }
}

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function uploadAvatar(req, res, next) {
  try {
    const id = Number(req.user?.sub)
    if (!Number.isFinite(id)) throw badRequest('Thiếu thông tin người dùng')

    const file = req.file
    if (!file) throw badRequest('Ảnh đại diện là bắt buộc')
    const mime = String(file.mimetype || '').toLowerCase()
    if (!IMAGE_MIME.has(mime)) throw badRequest('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF')

    const cur = await query('SELECT avatar_url FROM users WHERE id = $1', [id])
    const prevUrl = cur.rows[0]?.avatar_url

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const safeName = `${Date.now()}_${Math.random().toString(16).slice(2)}_${file.originalname}`.replaceAll('..', '')
    const fullPath = path.join(UPLOAD_DIR, safeName)
    await fs.writeFile(fullPath, file.buffer)

    const avatarUrl = `/uploads/${safeName}`

    const r = await query(
      `
      UPDATE users
      SET avatar_url = $1
      WHERE id = $2
      RETURNING id, name, email, phone, avatar_url, role_id, created_at
    `,
      [avatarUrl, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')

    if (prevUrl && prevUrl !== avatarUrl) await removeUploadFileIfSafe(prevUrl)

    const roleRes = await query('SELECT name FROM roles WHERE id = $1', [r.rows[0].role_id])
    const roleName = roleRes.rows[0]?.name || req.user?.role

    return ok(res, mapMeRow({ ...r.rows[0], role: roleName }, req))
  } catch (e) {
    return next(e)
  }
}

export async function deleteAvatar(req, res, next) {
  try {
    const id = Number(req.user?.sub)
    if (!Number.isFinite(id)) throw badRequest('Thiếu thông tin người dùng')

    const cur = await query('SELECT avatar_url FROM users WHERE id = $1', [id])
    const prevUrl = cur.rows[0]?.avatar_url

    const r = await query(
      `
      UPDATE users
      SET avatar_url = NULL
      WHERE id = $1
      RETURNING id, name, email, phone, avatar_url, role_id, created_at
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy người dùng')

    if (prevUrl) await removeUploadFileIfSafe(prevUrl)

    const roleRes = await query('SELECT name FROM roles WHERE id = $1', [r.rows[0].role_id])
    const roleName = roleRes.rows[0]?.name || req.user?.role

    return ok(res, mapMeRow({ ...r.rows[0], role: roleName }, req))
  } catch (e) {
    return next(e)
  }
}

