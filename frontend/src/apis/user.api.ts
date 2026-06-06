// ─── User API ─────────────────────────────────────────────────────────────────
import { apiFetch, getToken, API_BASE } from './base'

export type MeUser = {
  id: number
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  role?: string | null
  role_id?: number | null
  status?: string | null
}

export type AdminUser = {
  id: number
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  role?: string | null
  role_id?: number | null
  status?: string | null
  created_at?: string | null
}

// ─── Current user ─────────────────────────────────────────────────────────────

export async function getMe(): Promise<MeUser> {
  return apiFetch<MeUser>('/users/me')
}

export async function updateMe(payload: {
  name?: string
  phone?: string
  email?: string
}): Promise<MeUser> {
  return apiFetch<MeUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function updateMyPassword(payload: {
  currentPassword: string
  newPassword: string
}): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>('/users/me/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function uploadMyAvatar(file: File): Promise<MeUser> {
  const fd = new FormData()
  fd.append('avatar', file)
  return apiFetch<MeUser>('/users/me/avatar', { method: 'POST', body: fd })
}

// ─── Admin user management ────────────────────────────────────────────────────

export async function adminListUsers(params?: {
  search?: string
  role?: string
  status?: string
  page?: number
}): Promise<AdminUser[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.role) qs.set('role', params.role)
  if (params?.status) qs.set('status', params.status)
  if (params?.page != null) qs.set('page', String(params.page))
  const q = qs.toString()
  return apiFetch<AdminUser[]>(`/admin/users${q ? `?${q}` : ''}`)
}

export async function adminCreateUser(payload: {
  name: string
  email: string
  password: string
  phone?: string
  role_id?: number
  status?: string
}): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateUser(
  id: number,
  payload: {
    name?: string
    email?: string
    phone?: string
    role_id?: number
    status?: string
  },
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteUser(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/admin/users/${id}`, { method: 'DELETE' })
}

export async function uploadUserAvatar(
  userId: number,
  file: File,
): Promise<{ id: number; avatar_url: string }> {
  const token = getToken()
  const fd = new FormData()
  fd.append('avatar', file)
  const res = await fetch(`${API_BASE}/admin/users/${userId}/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = await res.json().catch(() => null)
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data as { id: number; avatar_url: string }
  throw new Error(json.error?.message || 'Upload ảnh đại diện thất bại')
}
