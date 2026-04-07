import { ok } from '../utils/response.js'
import { notFound } from '../utils/httpError.js'
import { categories, menuItems as items } from '../data/menu.store.js'

export async function listMenuItems(req, res, next) {
  try {
    const search = String(req.query.search || '').trim().toLowerCase()
    const categoryId = String(req.query.categoryId || '').trim()
    const activeOnly = String(req.query.active ?? 'true') !== 'false'

    const filtered = items.filter((i) => {
      if (activeOnly && !i.isActive) return false
      if (categoryId && i.categoryId !== categoryId) return false
      if (search && !i.name.toLowerCase().includes(search)) return false
      return true
    })

    return ok(res, filtered)
  } catch (e) {
    return next(e)
  }
}

export async function getMenuItem(req, res, next) {
  try {
    const item = items.find((i) => String(i.id) === String(req.params.id))
    if (!item) throw notFound('Không tìm thấy món')
    return ok(res, item)
  } catch (e) {
    return next(e)
  }
}

export async function listCategories(req, res, next) {
  try {
    return ok(res, categories.filter((c) => c.isActive))
  } catch (e) {
    return next(e)
  }
}

