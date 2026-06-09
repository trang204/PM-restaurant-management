export type AssignedTableInfo = {
  id: number
  name: string
  zone: string | null
  capacity: number
  status: string
}

export type OrderedItemInfo = {
  id: number
  foodName: string
  quantity: number
  price: number
  note: string | null
}

export type ReservationRow = {
  id: string
  fullName: string
  phone: string
  date: string
  time: string
  guestCount: number
  status: string
  assignedTableId?: string | null
  /** Tên bàn (nếu API trả array_agg). */
  tables?: string[]
  note?: string | null
  /** Link gọi món tại bàn (chỉ có sau khi khách đã vào bàn và có phiên QR). */
  tableOrderUrl?: string | null
  tableOrderToken?: string | null
  createdAt?: string | null
  assignedTables?: AssignedTableInfo[]
  orderItems?: OrderedItemInfo[]
}

function formatDateRaw(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v)
}

function formatTimeRaw(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2}):(\d{2})/)
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
    return v.length >= 5 ? v.slice(0, 5) : v
  }
  if (v instanceof Date) {
    const h = v.getUTCHours()
    const m = v.getUTCMinutes()
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return String(v)
}

function firstTableId(tableIds: unknown): string | null {
  if (!Array.isArray(tableIds) || tableIds.length === 0) return null
  return String(tableIds[0])
}

export function normalizeReservation(raw: unknown): ReservationRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.id == null) return null

  const nameRaw =
    [r.fullName, r.guest_name, r.user_name].find((x) => typeof x === 'string' && String(x).trim()) ??
    ''
  const phoneRaw =
    [r.phone, r.guest_phone, r.user_phone].find((x) => typeof x === 'string' && String(x).trim()) ?? ''

  const date =
    (typeof r.date === 'string' && r.date) || formatDateRaw(r.booking_date)
  const time =
    (typeof r.time === 'string' && r.time) || formatTimeRaw(r.booking_time)
  const guestCount =
    typeof r.guestCount === 'number'
      ? r.guestCount
      : Number(r.guests) || 0

  const assigned =
    r.assignedTableId != null && r.assignedTableId !== ''
      ? String(r.assignedTableId)
      : firstTableId(r.table_ids)

  const out: ReservationRow = {
    id: String(r.id),
    fullName: String(nameRaw).trim() || 'Khách',
    phone: String(phoneRaw).trim() || '—',
    date,
    time,
    guestCount,
    status: typeof r.status === 'string' ? r.status : String(r.status ?? ''),
    assignedTableId: assigned,
    note: r.note != null ? String(r.note) : null,
  }
  if (typeof r.tableOrderUrl === 'string' && r.tableOrderUrl) out.tableOrderUrl = r.tableOrderUrl
  if (typeof r.tableOrderToken === 'string' && r.tableOrderToken) out.tableOrderToken = r.tableOrderToken
  if (Array.isArray(r.tables) && r.tables.length) {
    out.tables = r.tables.filter((x): x is string => typeof x === 'string' && Boolean(x))
  }
  if (Array.isArray(r.assignedTables)) {
    out.assignedTables = r.assignedTables.map((t: any) => ({
      id: Number(t.id),
      name: String(t.name || ''),
      zone: t.zone ? String(t.zone) : null,
      capacity: Number(t.capacity) || 0,
      status: String(t.status || '')
    }))
  }
  if (Array.isArray(r.orderItems)) {
    out.orderItems = r.orderItems.map((item: any) => ({
      id: Number(item.id),
      foodName: String(item.foodName || item.food_name || ''),
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      note: item.note ? String(item.note) : null
    }))
  }
  if (r.createdAt) {
    out.createdAt = String(r.createdAt)
  } else if (r.created_at) {
    out.createdAt = String(r.created_at)
  }
  return out
}
