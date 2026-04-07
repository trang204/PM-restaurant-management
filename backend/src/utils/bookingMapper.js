export function pickDate(v) {
  if (v == null || v === '') return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
}

export function pickTime(v) {
  if (v == null || v === '') return ''
  if (v instanceof Date) {
    const h = v.getUTCHours()
    const m = v.getUTCMinutes()
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const s = String(v)
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  return s.length >= 5 ? s.slice(0, 5) : s
}

/** Payload chuẩn cho client (đặt bàn). */
export function mapBookingForClient(row) {
  if (!row) return null
  const name = (row.guest_name || row.user_name || '').trim()
  const phone = (row.guest_phone || row.user_phone || '').trim()
  const tableIds = Array.isArray(row.table_ids) ? row.table_ids : []
  const firstTableId = tableIds.length ? String(tableIds[0]) : null
  return {
    id: String(row.id),
    fullName: name || 'Khách',
    phone: phone || '—',
    date: pickDate(row.booking_date),
    time: pickTime(row.booking_time),
    guestCount: Number(row.guests) || 0,
    status: row.status,
    assignedTableId: firstTableId,
    note: row.note ?? null,
    tables: Array.isArray(row.tables) ? row.tables : undefined,
  }
}

/** Thêm email tài khoản + danh sách tên bàn cho admin. */
export function mapBookingForAdmin(row) {
  const base = mapBookingForClient(row)
  if (!base) return null
  return {
    ...base,
    userEmail: row.user_email != null && String(row.user_email).trim() ? String(row.user_email).trim() : null,
    tables: Array.isArray(row.tables) ? row.tables : [],
  }
}
