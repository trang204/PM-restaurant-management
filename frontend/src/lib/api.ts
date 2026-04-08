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
  return raw.replace(/\/api$/, '') || 'http://localhost:5000'
}

export function mediaUrl(path: string | undefined | null): string {
  if (!path) return ''
  // Nhiều file upload có khoảng trắng/ký tự đặc biệt → cần encode để CSS url()/img src hoạt động ổn định.
  if (path.startsWith('http')) return encodeURI(path)
  const full = `${getApiOrigin()}${path.startsWith('/') ? '' : '/'}${path}`
  return encodeURI(full)
}

function getToken() {
  return localStorage.getItem('luxeat_token')
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem('luxeat_token')
  else localStorage.setItem('luxeat_token', token)
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
