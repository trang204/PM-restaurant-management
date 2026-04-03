export type ApiError = {
  code: string
  message: string
  details?: unknown
}

export type ApiResponse<T> =
  | { success: true; data: T; meta?: unknown }
  | { success: false; error: ApiError }

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

function getToken() {
  return localStorage.getItem('luxeat_token')
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem('luxeat_token')
  else localStorage.setItem('luxeat_token', token)
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data
  throw new Error(json.error?.message || 'API error')
}

