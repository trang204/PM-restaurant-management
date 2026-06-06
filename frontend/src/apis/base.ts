// ─── Core HTTP utilities ──────────────────────────────────────────────────────
// Single source of truth for all HTTP calls to the backend.
// Re-exports everything previously in lib/api.ts so existing imports keep working.

export type ApiError = {
  code: string
  message: string
  details?: unknown
}

export type ApiResponse<T> =
  | { success: true; data: T; meta?: unknown }
  | { success: false; error: ApiError }

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/** Origin API (no /api suffix) — for static uploads if backend serves them. */
export function getApiOrigin(): string {
  const raw = String(API_BASE).replace(/\/$/, '')
  let origin = raw.replace(/\/api$/, '') || 'http://localhost:5000'
  try {
    const u = new URL(origin)
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
  if (path.startsWith('http')) return encodeURI(path)
  const full = `${getApiOrigin()}${path.startsWith('/') ? '' : '/'}${path}`
  return encodeURI(full)
}

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

export function getToken(): string | null {
  return localStorage.getItem('luxeat_token')
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem('luxeat_token')
  else localStorage.setItem('luxeat_token', token)
}

/** Authenticated fetch — attaches Bearer token automatically. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data
  throw new Error(json.error?.message || 'API error')
}

/** Public fetch — no auth token. */
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
