export type ApiError = {
  code: string
  message: string
  details?: unknown
}

export type ApiResponse<T> =
  | { success: true; data: T; meta?: unknown }
  | { success: false; error: ApiError }

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/** Origin API (không có /api) — dùng cho ảnh tĩnh nếu backend phục vụ. */
export function getApiOrigin(): string {
  const raw = String(API_BASE).replace(/\/$/, '')
  let origin = raw.replace(/\/api$/, '') || 'http://localhost:5000'
  try {
    const u = new URL(origin)
    // Nếu VITE_API_BASE_URL trỏ nhầm sang Vite (5173/4173), /uploads không tồn tại — dùng backend mặc định.
    if (u.port === '5173' || u.port === '4173') {
      return 'http://localhost:5000'
    }
  } catch {
    /* ignore */
  }
  return origin
}

export function mediaUrl(path: string | undefined | null): string {
  if (!path) return ''
  // Nhiều file upload có khoảng trắng/ký tự đặc biệt → cần encode để CSS url()/img src hoạt động ổn định.
  if (path.startsWith('http')) return encodeURI(path)
  const full = `${getApiOrigin()}${path.startsWith('/') ? '' : '/'}${path}`
  return encodeURI(full)
}

/** Đường dẫn lưu trong DB (/uploads/...) từ URL đầy đủ đã encode — dùng khi xóa banner / lưu PATCH. */
export function storagePathFromMediaUrl(fullOrRelative: string): string {
  const raw = String(fullOrRelative || '').trim()
  if (!raw) return ''
  let p = raw
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p)
      p = u.pathname + u.search
    } catch {
      return raw
    }
  } else {
    const origin = getApiOrigin()
    if (p.startsWith(origin)) p = p.slice(origin.length)
  }
  if (!p.startsWith('/')) p = `/${p}`
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

function getToken() {
  return localStorage.getItem('luxeat_token')
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem('luxeat_token')
  else localStorage.setItem('luxeat_token', token)
}

/** Upload ảnh món (admin). Trả về `image_url` lưu trong DB (/uploads/...). */
export async function uploadFoodImage(itemId: number, file: File): Promise<{ id: number; image_url: string }> {
  const token = getToken()
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/admin/menu-items/${itemId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = (await res.json().catch(() => null)) as ApiResponse<{ id: number; image_url: string }> | null
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data
  throw new Error(json.error?.message || 'Upload ảnh thất bại')
}

/** Upload ảnh bàn (admin). Trả về `image_url` lưu trong DB (/uploads/...). */
export async function uploadTableImage(tableId: number, file: File): Promise<{ id: number; image_url: string }> {
  const token = getToken()
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/tables/${tableId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = (await res.json().catch(() => null)) as ApiResponse<{ id: number; image_url: string }> | null
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data
  throw new Error(json.error?.message || 'Upload ảnh thất bại')
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data
  throw new Error(json.error?.message || 'API error')
}

/** Gọi API không cần đăng nhập (settings công khai, gọi món theo mã bàn). */
export async function publicApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data
  throw new Error(json.error?.message || 'API error')
}
