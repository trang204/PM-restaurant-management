import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

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
      ORDER BY f.created_at DESC
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
    if (!category_id) throw badRequest('category_id là bắt buộc')

    const r = await query(
      `
      INSERT INTO foods (name, price, description, image_url, category_id, status)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'AVAILABLE'))
      RETURNING *
    `,
      [
        String(name),
        price,
        description ? String(description) : null,
        image_url ? String(image_url) : null,
        Number(category_id),
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
    const r = await query(
      `
      UPDATE foods
      SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        category_id = COALESCE($5, category_id),
        status = COALESCE($6, status)
      WHERE id = $7
      RETURNING *
    `,
      [
        name ? String(name) : null,
        price ?? null,
        description ? String(description) : null,
        image_url ? String(image_url) : null,
        category_id ? Number(category_id) : null,
        status ? String(status) : null,
        id,
      ],
    )
    if (!r.rows.length) throw notFound('Không tìm thấy món')
    return ok(res, r.rows[0])
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

