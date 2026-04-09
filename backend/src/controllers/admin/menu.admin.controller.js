import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads')

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function removeUploadFileIfSafe(publicPath) {
  const raw = String(publicPath || '').trim()
  if (!raw.startsWith('/uploads/')) return
  const rel = raw.replace(/^\/uploads\//, '')
  if (!rel || rel.includes('..')) return
  const full = path.join(UPLOAD_DIR, rel)
  if (!full.startsWith(UPLOAD_DIR)) return
  await fs.unlink(full).catch(() => {})
}

/** Khớp DECIMAL(14,2) — tối đa ~9,99 nghìn tỷ (đủ cho giá VND). */
const MAX_PRICE = 999999999999.99

function parsePrice(v) {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return NaN
  return n
}

function assertPriceInRange(n) {
  if (n < 0) throw badRequest('Giá không được âm')
  if (n > MAX_PRICE) throw badRequest(`Giá quá lớn (tối đa ${MAX_PRICE.toLocaleString('vi-VN')} ₫)`)
}

export async function list(req, res, next) {
  try {
    const { categoryId, search } = req.query || {}
    const params = []
    const where = []

    if (search) {
      params.push(`%${String(search).trim().toLowerCase()}%`)
      where.push(`LOWER(f.name) LIKE $${params.length}`)
    }
    if (categoryId) {
      const cId = Number(categoryId)
      if (!Number.isFinite(cId)) throw badRequest('categoryId không hợp lệ')
      params.push(cId)
      where.push(`f.category_id = $${params.length}`)
    }

    const r = await query(
      `
      SELECT
        f.id,
        f.name,
        f.price,
        f.description,
        f.image_url,
        f.category_id,
        c.name AS category_name,
        f.status,
        f.created_at
      FROM foods f
      LEFT JOIN categories c ON c.id = f.category_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.name NULLS LAST, f.name ASC, f.id ASC
    `,
      params,
    )
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { name, price, description, image_url, category_id, status } = req.body || {}
    if (!name) throw badRequest('name là bắt buộc')
    if (price === undefined || price === null) throw badRequest('price là bắt buộc')
    if (category_id === undefined || category_id === null || category_id === '') {
      throw badRequest('category_id là bắt buộc')
    }
    const priceNum = parsePrice(price)
    if (priceNum == null || !Number.isFinite(priceNum)) {
      throw badRequest('price không hợp lệ')
    }
    const catNum = Number(category_id)
    if (!Number.isFinite(catNum)) throw badRequest('category_id không hợp lệ')

    const r = await query(
      `
      INSERT INTO foods (name, price, description, image_url, category_id, status)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'AVAILABLE'))
      RETURNING *
    `,
      [
        String(name),
        priceNum,
        description ? String(description) : null,
        image_url != null && String(image_url).trim() ? String(image_url).trim() : null,
        catNum,
        status ? String(status) : null,
      ],
    )
    return created(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const { name, price, description, image_url, category_id, status } = req.body || {}

    if (category_id === undefined || category_id === null || category_id === '') {
      throw badRequest('category_id là bắt buộc')
    }
    const catVal = Number(category_id)
    if (!Number.isFinite(catVal)) throw badRequest('category_id không hợp lệ')

    if (price === undefined || price === null || price === '') {
      throw badRequest('price là bắt buộc')
    }
    const priceVal = parsePrice(price)
    if (priceVal == null || !Number.isFinite(priceVal)) throw badRequest('price không hợp lệ')
    assertPriceInRange(priceVal)

    const nameVal = String(name || '').trim() || 'Món'
    const descVal =
      description === undefined || description === null
        ? null
        : String(description).trim() === ''
          ? null
          : String(description)
    const imageVal =
      image_url == null || String(image_url).trim() === '' ? null : String(image_url).trim()
    const statusVal = status != null && String(status).trim() ? String(status).trim() : 'AVAILABLE'

    const r = await query(
      `
      UPDATE foods
      SET
        name = $1,
        price = $2,
        description = $3,
        image_url = $4,
        category_id = $5,
        status = $6
      WHERE id = $7
      RETURNING *
    `,
      [nameVal, priceVal, descVal, imageVal, catVal, statusVal, id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy món')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

/** Upload ảnh món (multipart field: image). Cập nhật image_url trong DB. */
export async function uploadImage(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const file = req.file
    if (!file) throw badRequest('Cần file ảnh')
    const mime = String(file.mimetype || '').toLowerCase()
    if (!IMAGE_MIME.has(mime)) throw badRequest('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF')

    const cur = await query('SELECT id, image_url FROM foods WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy món')
    const prevUrl = cur.rows[0].image_url

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'gif'
    const safeName = `food_${id}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`
    await fs.writeFile(path.join(UPLOAD_DIR, safeName), file.buffer)

    const publicUrl = `/uploads/${safeName}`
    const r = await query(`UPDATE foods SET image_url = $1 WHERE id = $2 RETURNING id, image_url`, [publicUrl, id])
    if (prevUrl && prevUrl !== publicUrl) await removeUploadFileIfSafe(prevUrl)
    return ok(res, { id: r.rows[0].id, image_url: r.rows[0].image_url })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')
    const r = await query('DELETE FROM foods WHERE id = $1 RETURNING id', [id])
    if (!r.rows.length) throw notFound('Không tìm thấy món')
    return ok(res, { id: r.rows[0].id, deleted: true })
  } catch (e) {
    return next(e)
  }
}

export async function toggleActive(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const cur = await query('SELECT id, status FROM foods WHERE id = $1', [id])
    if (!cur.rows.length) throw notFound('Không tìm thấy món')

    const nextStatus = cur.rows[0].status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    const r = await query('UPDATE foods SET status = $1 WHERE id = $2 RETURNING id, status', [nextStatus, id])
    return ok(res, { id: r.rows[0].id, status: r.rows[0].status })
  } catch (e) {
    return next(e)
  }
}
