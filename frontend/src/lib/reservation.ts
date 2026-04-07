/** Chuẩn hóa đơn đặt bàn từ API (camelCase mới hoặc snake_case cũ). */
export type ReservationRow = {
  id: string
  fullName: string
  phone: string
  date: string
  time: string
  guestCount: number
  status: string
  assignedTableId?: string | null
  note?: string | null
}

function formatDateRaw(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v
  if (v instanceof Date) return v.toISOString().slice(0, 10)
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

  return {
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
}
