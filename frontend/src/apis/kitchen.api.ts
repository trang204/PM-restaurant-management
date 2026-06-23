// ─── Kitchen API (Staff) ──────────────────────────────────────────────────────
import { apiFetch } from './base'

export type KitchenOrder = {
  id: number
  status: string
  table_session_id?: number | null
  booking_id?: number | null
  created_at?: string | null
  items?: KitchenOrderItem[]
}

export type KitchenOrderItem = {
  id: number
  food_id: number | null
  food_name?: string | null
  quantity: number
  price: number
  kitchen_status?: string
  kitchen_ack_at?: string | null
  note?: string | null
}

export async function kitchenListOrders(): Promise<KitchenOrder[]> {
  return apiFetch<KitchenOrder[]>('/admin/kitchen/orders')
}

export async function kitchenGetOrder(orderId: number): Promise<KitchenOrder> {
  return apiFetch<KitchenOrder>(`/admin/kitchen/orders/${orderId}`)
}

export async function kitchenAckItem(itemId: number): Promise<KitchenOrderItem> {
  return apiFetch<KitchenOrderItem>(`/admin/kitchen/order-items/${itemId}/ack`, {
    method: 'POST',
    body: '{}',
  })
}

export async function kitchenServeItem(itemId: number): Promise<KitchenOrderItem> {
  return apiFetch<KitchenOrderItem>(`/admin/kitchen/order-items/${itemId}/serve`, {
    method: 'POST',
    body: '{}',
  })
}

export async function kitchenAckAllOrderItems(orderId: number): Promise<unknown> {
  return apiFetch<unknown>(`/admin/kitchen/orders/${orderId}/ack-all`, {
    method: 'POST',
    body: '{}',
  })
}

export async function kitchenConfirmPayment(orderId: number): Promise<unknown> {
  return apiFetch<unknown>(`/admin/kitchen/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    body: '{}',
  })
}
