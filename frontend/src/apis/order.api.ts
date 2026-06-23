// ─── Order / Table Session API ────────────────────────────────────────────────
import { apiFetch, publicApiFetch } from './base'

export type OrderItem = {
  id: number
  order_id: number
  food_id: number | null
  food_name?: string | null
  quantity: number
  price: number
  kitchen_status?: string | null
  kitchen_ack_at?: string | null
  note?: string | null
  order_status?: string
}

export type SessionContext = {
  tableName: string
  bookingId: number | null
  order: { id: number; status: string }
  items: OrderItem[]
  menu: unknown[]
  restaurant: {
    name?: string | null
    logoUrl?: string | null
    address?: string | null
    phone?: string | null
  }
  orderUrl: string
}

export type PaymentContext = {
  orderId: number
  total: number
  payment: {
    id: number
    order_id: number
    amount: number
    method: string
    status: string
    paid_at?: string | null
  } | null
  qrUrl?: string | null
  bankAccount?: string | null
  bankCode?: string | null
  transferContent?: string | null
}

// ─── Public table-session (no auth required) ──────────────────────────────────

export async function getSessionContext(token: string): Promise<SessionContext> {
  return publicApiFetch<SessionContext>(`/table-session/${encodeURIComponent(token)}`)
}

export async function getSessionPayment(token: string): Promise<PaymentContext> {
  return publicApiFetch<PaymentContext>(`/table-session/${encodeURIComponent(token)}/payment`)
}

export async function addSessionItem(
  token: string,
  payload: { food_id: number; quantity: number },
): Promise<OrderItem> {
  return publicApiFetch<OrderItem>(`/table-session/${encodeURIComponent(token)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSessionItem(
  token: string,
  itemId: number,
  payload: { quantity: number },
): Promise<OrderItem> {
  return publicApiFetch<OrderItem>(
    `/table-session/${encodeURIComponent(token)}/items/${itemId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}

export async function removeSessionItem(
  token: string,
  itemId: number,
): Promise<{ removedId: number }> {
  return publicApiFetch<{ removedId: number }>(
    `/table-session/${encodeURIComponent(token)}/items/${itemId}`,
    { method: 'DELETE' },
  )
}

export async function submitSessionOrder(token: string): Promise<unknown> {
  return publicApiFetch<unknown>(
    `/table-session/${encodeURIComponent(token)}/submit`,
    { method: 'POST', body: '{}' },
  )
}

export async function createSessionPayment(
  token: string,
  payload: { method: string },
): Promise<PaymentContext> {
  return publicApiFetch<PaymentContext>(
    `/table-session/${encodeURIComponent(token)}/payment`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

// ─── Authenticated table-session ──────────────────────────────────────────────

export async function getMyActiveSession(): Promise<unknown> {
  return apiFetch<unknown>('/table-session/me')
}
