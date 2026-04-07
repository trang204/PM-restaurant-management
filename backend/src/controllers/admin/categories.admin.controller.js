import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { categories, menuItems } from '../../data/menu.store.js'

export async function list(req, res, next) {
  try {
    return ok(res, [...categories])
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const body = req.body || {}
    const row = {
      id: body.id || `cat_${Date.now()}`,
      name: String(body.name || 'Danh mục'),
      isActive: body.isActive !== false,
    }
    categories.push(row)
    return created(res, row)
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const idx = categories.findIndex((x) => String(x.id) === String(req.params.id))
    if (idx === -1) throw notFound('Không tìm thấy danh mục')
    categories[idx] = { ...categories[idx], ...req.body, id: categories[idx].id }
    return ok(res, categories[idx])
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const idx = categories.findIndex((x) => String(x.id) === String(req.params.id))
    if (idx === -1) throw notFound('Không tìm thấy danh mục')
    const catId = categories[idx].id
    if (menuItems.some((m) => m.categoryId === catId)) {
      throw badRequest('Còn món thuộc danh mục này')
    }
    const [removed] = categories.splice(idx, 1)
    return ok(res, { id: removed.id, deleted: true })
  } catch (e) {
    return next(e)
  }
}
