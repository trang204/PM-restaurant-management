// ─── Menu / Food API ──────────────────────────────────────────────────────────
import { apiFetch, publicApiFetch, getToken, API_BASE } from './base'

export type MenuItem = {
  id: number
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  category_id?: number | null
  category_name?: string | null
  status: 'AVAILABLE' | 'UNAVAILABLE' | string
  created_at?: string | null
  ingredients?: Array<{
    ingredient_id: number
    name: string
    unit: string
    quantity_needed: number
  }>
}

export type Category = {
  id: number
  name: string
}

// ─── Public menu ──────────────────────────────────────────────────────────────

export async function getPublicMenu(): Promise<MenuItem[]> {
  return publicApiFetch<MenuItem[]>('/menu')
}

export async function getMenuCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/menu/categories')
}

// ─── Admin menu items ─────────────────────────────────────────────────────────

export async function adminListMenuItems(params?: {
  categoryId?: number
  search?: string
  status?: string
}): Promise<MenuItem[]> {
  const qs = new URLSearchParams()
  if (params?.categoryId) qs.set('categoryId', String(params.categoryId))
  if (params?.search) qs.set('search', params.search)
  if (params?.status) qs.set('status', params.status)
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return apiFetch<MenuItem[]>(`/admin/menu-items${query}`, { cache: 'no-store' })
}

export async function adminCreateMenuItem(payload: {
  name: string
  price: number
  description?: string
  image_url?: string
  category_id: number
  status?: string
  ingredients?: Array<{ ingredient_id: number; quantity_needed: number }>
}): Promise<MenuItem> {
  return apiFetch<MenuItem>('/admin/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateMenuItem(
  id: number,
  payload: {
    name?: string
    price?: number
    description?: string
    image_url?: string | null
    category_id?: number
    status?: string
    ingredients?: Array<{ ingredient_id: number; quantity_needed: number }>
  },
): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/admin/menu-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteMenuItem(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/admin/menu-items/${id}`, {
    method: 'DELETE',
  })
}

export async function adminToggleMenuItemActive(id: number): Promise<{ id: number; status: string }> {
  return apiFetch<{ id: number; status: string }>(`/admin/menu-items/${id}/toggle-active`, {
    method: 'POST',
  })
}

export async function uploadFoodImage(
  itemId: number,
  file: File,
): Promise<{ id: number; image_url: string }> {
  const token = getToken()
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/admin/menu-items/${itemId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = await res.json().catch(() => null)
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data as { id: number; image_url: string }
  throw new Error(json.error?.message || 'Upload ảnh thất bại')
}

// ─── Admin categories ─────────────────────────────────────────────────────────

export async function adminListCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/admin/categories', { cache: 'no-store' })
}

export async function adminCreateCategory(name: string): Promise<Category> {
  return apiFetch<Category>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function adminDeleteCategory(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/admin/categories/${id}`, {
    method: 'DELETE',
  })
}
