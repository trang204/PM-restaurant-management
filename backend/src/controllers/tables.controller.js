import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { ok, created } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'
import { publicOrderUrl } from '../services/tableSession.service.js'

const ALLOWED_STATUS = new Set(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLOSED'])
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')

async function removeUploadFileIfSafe(publicPath) {
  const raw = String(publicPath || '').trim()
  if (!raw.startsWith('/uploads/')) return
  const rel = raw.replace(/^\/uploads\//, '')
  if (!rel || rel.includes('..')) return
  const full = path.join(UPLOAD_DIR, rel)
  if (!full.startsWith(UPLOAD_DIR)) return
  await fs.unlink(full).catch(() => {})
}

export async function listTables(req, res, next) {
  try {
    const r = await query(
      `
      SELECT
        t.id,
        t.name,
        t.capacity,
        t.image_url,
        t.status,
        t.status_note,
        t.pos_x,
        t.pos_y,
        t.created_at,
        sess.booking_id AS active_booking_id,
        sess.session_created_at AS active_session_created_at,
        sess.qr_token AS active_qr_token,
        ord.order_id AS active_order_id,
        b.guest_name AS active_guest_name,
        b.guest_phone AS active_guest_phone,
        b.guests AS active_guest_count
      FROM tables t
      LEFT JOIN LATERAL (
        SELECT
          ts.booking_id,
          ts.qr_token,
          ts.created_at AS session_created_at
        FROM table_sessions ts
        WHERE ts.table_id = t.id
          AND ts.status = 'ACTIVE'
        ORDER BY ts.id DESC
        LIMIT 1
      ) sess ON true
      LEFT JOIN bookings b ON b.id = sess.booking_id
      LEFT JOIN LATERAL (
        SELECT o.id AS order_id
        FROM orders o
        WHERE o.table_session_id IN (
          SELECT ts2.id FROM table_sessions ts2
          WHERE ts2.table_id = t.id AND ts2.status = 'ACTIVE'
        )
        ORDER BY o.id DESC
        LIMIT 1
      ) ord ON true
      ORDER BY t.id ASC
    `,
    )
    return ok(
      res,
      r.rows.map((row) => ({
        ...row,
        active_order_url: row.active_qr_token ? publicOrderUrl(row.active_qr_token) : null,
      })),
    )
  } catch (e) {
    return next(e)
  }
}

export async function getTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      'SELECT id, name, capacity, image_url, status, status_note, pos_x, pos_y, created_at FROM tables WHERE id = $1',
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
      RETURNING id, name, capacity, image_url, status, status_note, pos_x, pos_y, created_at
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
      RETURNING id, name, capacity, image_url, status, status_note, pos_x, pos_y, created_at
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

export async function uploadImage(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const file = req.file
    if (!file) throw badRequest('Cần file ảnh')
    const mime = String(file.mimetype || '').toLowerCase()
    if (!IMAGE_MIME.has(mime)) throw badRequest('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF')

    const cur = await query('SELECT id, image_url FROM tables WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy bàn')
    const prevUrl = cur.rows[0].image_url

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'gif'
    const safeName = `table_${id}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), file.buffer)

    const publicUrl = `/uploads/${safeName}`
    const r = await query(`UPDATE tables SET image_url = $1 WHERE id = $2 RETURNING id, image_url`, [publicUrl, id])
    if (prevUrl && prevUrl !== publicUrl) await removeUploadFileIfSafe(prevUrl)
    return ok(res, { id: r.rows[0].id, image_url: r.rows[0].image_url })
  } catch (e) {
    return next(e)
  }
}

export async function deleteTable(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      'DELETE FROM tables WHERE id = $1 RETURNING id, name, capacity, image_url, status, pos_x, pos_y, created_at',
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy bàn')
    if (r.rows[0].image_url) await removeUploadFileIfSafe(r.rows[0].image_url)
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

