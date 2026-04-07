import { ok, created } from '../../utils/response.js'
import { notFound } from '../../utils/httpError.js'
import { menuItems, categories } from '../../data/menu.store.js'

export async function list(req, res, next) {
  try {
    return ok(res, [...menuItems])
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const body = req.body || {}
    let categoryName = body.categoryName
    const categoryId = body.categoryId
    if (!categoryName && categoryId) {
      const c = categories.find((x) => x.id === categoryId)
      categoryName = c?.name || ''
    }
    const row = {
      id: body.id || `mi_${Date.now()}`,
      name: String(body.name || 'Món mới'),
      categoryId: categoryId || categories[0]?.id || 'cat_water',
      categoryName: categoryName || 'Món nước',
      price: Number(body.price) || 0,
      imageUrl: body.imageUrl || '',
      isActive: body.isActive !== false,
    }
    menuItems.push(row)
    return created(res, row)
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const idx = menuItems.findIndex((x) => String(x.id) === String(req.params.id))
    if (idx === -1) throw notFound('Không tìm thấy món')
    const body = req.body || {}
    const prev = menuItems[idx]
    let categoryName = body.categoryName ?? prev.categoryName
    const categoryId = body.categoryId ?? prev.categoryId
    if (body.categoryId && !body.categoryName) {
      const c = categories.find((x) => x.id === categoryId)
      categoryName = c?.name || categoryName
    }
    menuItems[idx] = {
      ...prev,
      ...body,
      id: prev.id,
      categoryId,
      categoryName,
      price: body.price != null ? Number(body.price) : prev.price,
    }
    return ok(res, menuItems[idx])
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const idx = menuItems.findIndex((x) => String(x.id) === String(req.params.id))
    if (idx === -1) throw notFound('Không tìm thấy món')
    const [removed] = menuItems.splice(idx, 1)
    return ok(res, { id: removed.id, deleted: true })
  } catch (e) {
    return next(e)
  }
}

export async function toggleActive(req, res, next) {
  try {
    const idx = menuItems.findIndex((x) => String(x.id) === String(req.params.id))
    if (idx === -1) throw notFound('Không tìm thấy món')
    menuItems[idx].isActive = !menuItems[idx].isActive
    return ok(res, { id: menuItems[idx].id, isActive: menuItems[idx].isActive })
  } catch (e) {
    return next(e)
  }
}
