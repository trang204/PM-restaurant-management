import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

export async function list(req, res, next) {
  try {
    const r = await query('SELECT id, name FROM categories ORDER BY name ASC')
    return ok(res, r.rows)
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { name } = req.body || {}
    if (!name) throw badRequest('name là bắt buộc')
    const r = await query('INSERT INTO categories (name) VALUES ($1) RETURNING id, name', [String(name)])
    return created(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')
    const { name } = req.body || {}
    if (!name) throw badRequest('name là bắt buộc')
    const r = await query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name', [String(name), id])
    if (!r.rows.length) throw notFound('Không tìm thấy danh mục')
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('id không hợp lệ')
    
    // Kiểm tra xem có món ăn nào thuộc danh mục này không
    const checkFoods = await query('SELECT COUNT(*) FROM foods WHERE category_id = $1', [id])
    if (Number(checkFoods.rows[0].count) > 0) {
      throw badRequest('Danh mục đã có món ăn gán, không thể xóa')
    }

    const r = await query('DELETE FROM categories WHERE id = $1 RETURNING id, name', [id])
    if (!r.rows.length) throw notFound('Không tìm thấy danh mục')
    return ok(res, { id: r.rows[0].id, deleted: true })
  } catch (e) {
    return next(e)
  }
}
