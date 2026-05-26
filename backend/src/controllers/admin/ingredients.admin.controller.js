import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { query, withTransaction } from '../../config/db.js'

function getStatus(stock, minAlert) {
  const s = Number(stock)
  const m = Number(minAlert)
  if (s <= 0) return 'Hết hàng'
  if (s <= m) return 'Sắp hết'
  return 'Còn hàng'
}

export async function list(req, res, next) {
  try {
    const r = await query('SELECT * FROM ingredients ORDER BY name ASC')
    const items = r.rows.map((row) => ({
      ...row,
      stock_quantity: Number(row.stock_quantity),
      min_stock_alert: Number(row.min_stock_alert),
      status: getStatus(row.stock_quantity, row.min_stock_alert),
    }))
    return ok(res, items)
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { name, unit, stock_quantity, min_stock_alert } = req.body || {}
    if (!name || !name.trim()) throw badRequest('Tên nguyên liệu là bắt buộc')
    if (!unit || !unit.trim()) throw badRequest('Đơn vị tính là bắt buộc')

    const stock = Number(stock_quantity) || 0
    const minAlert = Number(min_stock_alert) || 0

    if (stock < 0) throw badRequest('Số lượng tồn ban đầu không được âm')
    if (minAlert < 0) throw badRequest('Ngưỡng cảnh báo không được âm')

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO ingredients (name, unit, stock_quantity, min_stock_alert)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name.trim(), unit.trim(), stock, minAlert]
      )
      const ingredient = r.rows[0]

      if (stock > 0) {
        await client.query(
          `INSERT INTO ingredient_imports (ingredient_id, quantity, note)
           VALUES ($1, $2, $3)`,
          [ingredient.id, stock, 'Tồn kho ban đầu']
        )
      }
      return ingredient
    })

    result.stock_quantity = Number(result.stock_quantity)
    result.min_stock_alert = Number(result.min_stock_alert)
    result.status = getStatus(result.stock_quantity, result.min_stock_alert)

    return created(res, result)
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('ID không hợp lệ')

    const { name, unit, stock_quantity, min_stock_alert } = req.body || {}
    if (!name || !name.trim()) throw badRequest('Tên nguyên liệu là bắt buộc')
    if (!unit || !unit.trim()) throw badRequest('Đơn vị tính là bắt buộc')

    const stock = Number(stock_quantity) || 0
    const minAlert = Number(min_stock_alert) || 0

    if (stock < 0) throw badRequest('Số lượng tồn không được âm')
    if (minAlert < 0) throw badRequest('Ngưỡng cảnh báo không được âm')

    const r = await query(
      `UPDATE ingredients
       SET name = $1, unit = $2, stock_quantity = $3, min_stock_alert = $4
       WHERE id = $5 RETURNING *`,
      [name.trim(), unit.trim(), stock, minAlert, id]
    )
    if (!r.rows.length) throw notFound('Không tìm thấy nguyên liệu')

    const ingredient = r.rows[0]
    ingredient.stock_quantity = Number(ingredient.stock_quantity)
    ingredient.min_stock_alert = Number(ingredient.min_stock_alert)
    ingredient.status = getStatus(ingredient.stock_quantity, ingredient.min_stock_alert)

    return ok(res, ingredient)
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) throw badRequest('ID không hợp lệ')

    // Bắt lỗi ràng buộc khoá ngoại (23503)
    try {
      const r = await query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [id])
      if (!r.rows.length) throw notFound('Không tìm thấy nguyên liệu')
      return ok(res, { id: r.rows[0].id, deleted: true })
    } catch (dbErr) {
      if (dbErr.code === '23503') {
        throw badRequest('Không thể xoá nguyên liệu đã liên kết với món ăn')
      }
      throw dbErr
    }
  } catch (e) {
    return next(e)
  }
}

export async function importStock(req, res, next) {
  try {
    const ingredientId = Number(req.params.id)
    if (!Number.isFinite(ingredientId)) throw badRequest('ID không hợp lệ')

    const { quantity, note } = req.body || {}
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) throw badRequest('Số lượng nhập phải lớn hơn 0')

    const result = await withTransaction(async (client) => {
      // Khoá bản ghi
      const rIngredient = await client.query('SELECT * FROM ingredients WHERE id = $1 FOR UPDATE', [ingredientId])
      if (!rIngredient.rows.length) throw notFound('Không tìm thấy nguyên liệu')

      await client.query(
        `INSERT INTO ingredient_imports (ingredient_id, quantity, note)
         VALUES ($1, $2, $3)`,
        [ingredientId, qty, note ? String(note).trim() : null]
      )

      const rUpdate = await client.query(
        `UPDATE ingredients
         SET stock_quantity = stock_quantity + $1
         WHERE id = $2 RETURNING *`,
        [qty, ingredientId]
      )

      return rUpdate.rows[0]
    })

    result.stock_quantity = Number(result.stock_quantity)
    result.min_stock_alert = Number(result.min_stock_alert)
    result.status = getStatus(result.stock_quantity, result.min_stock_alert)

    return ok(res, result)
  } catch (e) {
    return next(e)
  }
}

export async function history(req, res, next) {
  try {
    const ingredientId = Number(req.params.id)
    if (!Number.isFinite(ingredientId)) throw badRequest('ID không hợp lệ')

    const r = await query(
      `SELECT id, quantity, note, import_date
       FROM ingredient_imports
       WHERE ingredient_id = $1
       ORDER BY import_date DESC`,
      [ingredientId]
    )

    const items = r.rows.map(row => ({
      ...row,
      quantity: Number(row.quantity)
    }))

    return ok(res, items)
  } catch (e) {
    return next(e)
  }
}
