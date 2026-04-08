import { ok } from '../utils/response.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { query } from '../config/db.js'

export async function listMenuItems(req, res, next) {
  try {
    const search = String(req.query.search || '').trim().toLowerCase()
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null
    if (req.query.categoryId && !Number.isFinite(categoryId)) throw badRequest('categoryId không hợp lệ')

    const params = []
    const where = []
    // Public menu: chỉ hiển thị món đang hoạt động
    where.push(`COALESCE(f.status, 'AVAILABLE') = 'AVAILABLE'`)
    if (search) {
      params.push(`%${search}%`)
      where.push(`LOWER(f.name) LIKE $${params.length}`)
    }
    if (categoryId) {
      params.push(categoryId)
      where.push(`f.category_id = $${params.length}`)
    }

    const sql = `
      SELECT
        f.id,
        f.name,
        f.price,
        f.description,
        f.image_url,
        f.category_id,
        c.name AS category_name,
        f.created_at
      FROM foods f
      LEFT JOIN categories c ON c.id = f.category_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.name NULLS LAST, f.name ASC, f.created_at DESC
    `

    const r = await query(sql, params)
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function getMenuItem(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')

    const r = await query(
      `
      SELECT
        f.id,
        f.name,
        f.price,
        f.description,
        f.image_url,
        f.status,
        f.category_id,
        c.name AS category_name,
        f.created_at
      FROM foods f
      LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.id = $1
    `,
      [id],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy món')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function listCategories(req, res, next) {
  try {
    const r = await query('SELECT id, name FROM categories ORDER BY name ASC')
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}
