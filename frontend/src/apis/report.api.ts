// ─── Reports API ──────────────────────────────────────────────────────────────
import { apiFetch } from './base'

export type RevenueRes = {
  totalRevenue: number
  totalOrders: number
  topItems?: Array<{ name: string; quantity: number; revenue: number }>
  byDay?: Array<{ date: string; revenue: number; orders: number }>
}

export type RevenueByTableRow = {
  table_id: number
  table_name?: string | null
  total_revenue: number
  total_orders: number
}

export type InvoiceRow = {
  id: number
  order_id: number
  amount: number
  method?: string | null
  status?: string | null
  paid_at?: string | null
  table_name?: string | null
  booking_id?: number | null
  cashier_name?: string | null
  transaction_code?: string | null
  note?: string | null
  tax?: number | null
  discount?: number | null
  surcharge?: number | null
}

export async function adminGetRevenue(params: {
  from: string
  to: string
  groupBy?: string
}): Promise<RevenueRes> {
  const qs = new URLSearchParams()
  qs.set('from', params.from)
  qs.set('to', params.to)
  if (params.groupBy) qs.set('groupBy', params.groupBy)
  return apiFetch<RevenueRes>(`/admin/reports/revenue?${qs}`)
}

export async function adminGetRevenueByTable(params: {
  from: string
  to: string
}): Promise<RevenueByTableRow[]> {
  const qs = new URLSearchParams({ from: params.from, to: params.to })
  return apiFetch<RevenueByTableRow[]>(`/admin/reports/revenue/by-table?${qs}`)
}

export async function adminGetInvoices(params: {
  from?: string
  to?: string
  page?: number
  limit?: number
  search?: string
}): Promise<InvoiceRow[]> {
  const qs = new URLSearchParams()
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.search) qs.set('search', params.search)
  return apiFetch<InvoiceRow[]>(`/admin/reports/revenue/invoices?${qs}`)
}
