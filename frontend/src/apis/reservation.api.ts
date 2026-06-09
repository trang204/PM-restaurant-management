// ─── Reservation / Booking API ────────────────────────────────────────────────
import { apiFetch } from './base'

export type ReservationRow = {
  id: string
  fullName: string
  phone: string
  date: string
  time: string
  guestCount: number
  status: string
  assignedTableId?: string | null
  tables?: string[]
  note?: string | null
  tableOrderUrl?: string | null
  tableOrderToken?: string | null
  createdAt?: string | null
  assignedTables?: Array<{
    id: number
    name: string
    zone: string | null
    capacity: number
    status: string
  }>
  orderItems?: Array<{
    id: number
    foodName: string
    quantity: number
    price: number
    note: string | null
  }>
}

export type CreateReservationPayload = {
  bookingDate: string
  bookingTime: string
  guests: number
  note?: string
  guestName?: string
  guestPhone?: string
  tableIds?: number[]
  orderItems?: Array<{ food_id: number; quantity: number }>
}

// ─── Customer / public-auth reservations ─────────────────────────────────────

export async function listMyReservations(): Promise<unknown[]> {
  return apiFetch<unknown[]>('/reservations')
}

export async function getReservation(bookingId: string | number): Promise<unknown> {
  return apiFetch<unknown>(`/reservations/${bookingId}`)
}

export async function createReservation(
  payload: CreateReservationPayload,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function holdReservation(
  id: string | number,
  payload: { tableIds: number[] },
): Promise<unknown> {
  return apiFetch<unknown>(`/reservations/${id}/hold`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelMyReservation(
  bookingId: string | number,
): Promise<unknown> {
  return apiFetch<unknown>(`/reservations/${bookingId}/cancel`, {
    method: 'POST',
    body: '{}',
  })
}

// ─── Admin reservations ───────────────────────────────────────────────────────

export async function adminListReservations(): Promise<unknown[]> {
  return apiFetch<unknown[]>('/admin/reservations')
}

export async function adminConfirmReservation(id: string | number): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${id}/confirm`, {
    method: 'POST',
    body: '{}',
  })
}

export async function adminCheckInReservation(id: string | number): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${id}/check-in`, {
    method: 'POST',
    body: '{}',
  })
}

export async function adminCancelReservation(id: string | number): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${id}/cancel`, {
    method: 'POST',
    body: '{}',
  })
}

export async function adminAssignTable(
  bookingId: string | number,
  tableId: number,
): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${bookingId}/assign-table`, {
    method: 'POST',
    body: JSON.stringify({ tableId }),
  })
}

export async function adminTransferTable(
  bookingId: string | number,
  payload: { fromTableId: number; toTableId: number },
): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${bookingId}/transfer-table`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminReleaseGuest(
  bookingId: string | number,
  payload: { tableId?: number },
): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${bookingId}/release-guest`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminGetOrderQr(bookingId: string | number): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${bookingId}/order-qr`)
}

export async function adminGetOrderTotal(
  bookingId: string | number,
): Promise<{ total: number }> {
  return apiFetch<{ total: number }>(`/admin/reservations/${bookingId}/order-total`)
}

export async function adminGetOrderItems(bookingId: string | number): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/admin/reservations/${bookingId}/order-items`)
}

export async function adminCashierPay(
  bookingId: string | number,
  payload: {
    method: string
    tax?: number
    discount?: number
    surcharge?: number
    note?: string
  },
): Promise<unknown> {
  return apiFetch<unknown>(`/admin/reservations/${bookingId}/cashier-pay`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminWalkIn(payload: {
  tableId: number
  guestName?: string
  guestCount?: number
}): Promise<unknown> {
  return apiFetch<unknown>('/admin/reservations/walk-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
