// ─── Authentication API ───────────────────────────────────────────────────────
import { apiFetch, publicApiFetch } from './base'

export type LoginResponse = {
  token: string
  user: { role?: string; id?: number; name?: string; email?: string }
}

export type RegisterResponse = {
  token: string
  user?: { role?: string; id?: number; name?: string }
}

export type MeResponse = {
  id: number
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  role?: string | null
  role_id?: number | null
  status?: string | null
}

// ─── Public auth (no token required) ─────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(payload: {
  name: string
  email: string
  password: string
  phone?: string
}): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function forgotPassword(email: string): Promise<{ message?: string }> {
  return publicApiFetch<{ message?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message?: string }> {
  return publicApiFetch<{ message?: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}
