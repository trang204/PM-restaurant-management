import { ok } from '../utils/response.js'
import { notFound } from '../utils/httpError.js'

const categories = [
  { id: 'cat_water', name: 'Món nước', isActive: true },
  { id: 'cat_rice', name: 'Món cơm', isActive: true },
  { id: 'cat_drink', name: 'Đồ uống', isActive: true },
  { id: 'cat_dessert', name: 'Tráng miệng', isActive: true },
]

const items = [
  {
    id: 'pho-bo',
    name: 'Phở bò tái',
    categoryId: 'cat_water',
    categoryName: 'Món nước',
    price: 55000,
    imageUrl: '/images/menu/pho.svg',
    isActive: true,
  },
  {
    id: 'bun-cha',
    name: 'Bún chả Hà Nội',
    categoryId: 'cat_water',
    categoryName: 'Món nước',
    price: 65000,
    imageUrl: '/images/menu/buncha.svg',
    isActive: true,
  },
]

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
    const item = items.find((i) => i.id === req.params.id)
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

