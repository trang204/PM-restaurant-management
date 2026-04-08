import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './BookingManagement.css'

function badgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'book-badge book-badge--yellow'
  if (s === 'confirmed') return 'book-badge book-badge--blue'
  if (s === 'checked_in') return 'book-badge book-badge--green'
  if (s === 'completed' || s === 'paid') return 'book-badge book-badge--green'
  if (s === 'cancelled') return 'book-badge book-badge--red'
  return 'book-badge'
}

function normDate(d) {
  if (d == null || d === '') return ''
  return String(d).slice(0, 10)
}

function normTime(t) {
  if (t == null || t === '') return ''
  const s = String(t)
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  return s.length >= 5 ? s.slice(0, 5) : s
}

function isActiveBookingStatus(status) {
  const u = String(status || '').toUpperCase()
  return u === 'PENDING' || u === 'CONFIRMED' || u === 'CHECKED_IN'
}

/** Mã bàn (string) đã gán cho đơn khác cùng khung ngày + giờ. */
function tableIdsTakenByOtherBookings(rows, currentRow) {
  const taken = new Set()
  const d = normDate(currentRow.date)
  const tm = normTime(currentRow.time)
  for (const o of rows) {
    if (o.id === currentRow.id) continue
    if (!isActiveBookingStatus(o.status)) continue
    if (normDate(o.date) !== d || normTime(o.time) !== tm) continue
    if (o.assignedTableId) taken.add(String(o.assignedTableId))
  }
  return taken
}

function isTableBlockedByStatus(table) {
  const s = String(table?.status || '').toUpperCase()
  return s === 'OCCUPIED' || s === 'RESERVED'
}

/**
 * Bàn hiển thị trong select: trừ bàn đã gán chỗ khác (cùng slot) và bàn OCCUPIED/RESERVED,
 * nhưng luôn giữ bàn đang gán / đang chọn của dòng này.
 */
function tablesSelectableForRow(allTables, rows, row, assignPick) {
  const takenByOthers = tableIdsTakenByOtherBookings(rows, row)
  const keepId = new Set()
  if (row.assignedTableId) keepId.add(String(row.assignedTableId))
  const pick = assignPick[row.id]
  if (pick) keepId.add(String(pick))

  const out = allTables.filter((t) => {
    const id = String(t.id)
    if (keepId.has(id)) return true
    if (takenByOthers.has(id)) return false
    if (isTableBlockedByStatus(t)) return false
    return true
  })

  const need = String(pick || row.assignedTableId || '')
  if (need && !out.some((t) => String(t.id) === need)) {
    const missing = allTables.find((t) => String(t.id) === need)
    if (missing) return [missing, ...out]
  }
  return out
}

/** @param {{ staffMode?: boolean }} props */
export default function BookingManagement({ staffMode = false }) {
  const [rows, setRows] = useState([])
  const [tables, setTables] = useState([])
  const [assignPick, setAssignPick] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [qrModal, setQrModal] = useState(null)

  function load() {
    setLoading(true)
    apiFetch('/admin/reservations')
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    apiFetch('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch(() => setTables([]))
  }, [])

  /** Đồng bộ dropdown gán bàn với bàn đã lưu trên server (F5 vẫn thấy đúng bàn). */
  useEffect(() => {
    setAssignPick((prev) => {
      const next = { ...prev }
      for (const r of rows) {
        if (r.assignedTableId) next[r.id] = String(r.assignedTableId)
      }
      return next
    })
  }, [rows])

  async function confirm(id) {
    try {
      const res = await apiFetch(`/admin/reservations/${id}/confirm`, { method: 'POST', body: '{}' })
      load()
      if (res?.tableSession?.qrSvg && res?.tableSession?.orderUrl) {
        setQrModal({
          title: 'Khách có thể gọi món',
          svg: res.tableSession.qrSvg,
          url: res.tableSession.orderUrl,
          note: res.tableSessionNote,
        })
      } else if (res?.tableSessionNote) {
        window.alert(res.tableSessionNote)
      }
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function checkIn(id) {
    try {
      const res = await apiFetch(`/admin/reservations/${id}/check-in`, { method: 'POST', body: '{}' })
      load()
      if (res?.tableSession?.qrSvg && res?.tableSession?.orderUrl) {
        setQrModal({
          title: 'Check-in — QR gọi món',
          svg: res.tableSession.qrSvg,
          url: res.tableSession.orderUrl,
          note: res.tableSessionNote,
        })
      } else if (res?.tableSessionNote) {
        window.alert(res.tableSessionNote)
      }
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function assignTable(bookingId) {
    const tid = assignPick[bookingId]
    if (!tid) {
      window.alert('Chọn bàn trước.')
      return
    }
    try {
      await apiFetch(`/admin/reservations/${bookingId}/assign-table`, {
        method: 'POST',
        body: JSON.stringify({ tableId: Number(tid) }),
      })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function cancelBooking(id) {
    if (!window.confirm('Hủy đơn này?')) return
    try {
      await apiFetch(`/admin/reservations/${id}/cancel`, { method: 'POST', body: '{}' })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(
      () => window.alert('Đã copy link.'),
      () => window.prompt('Copy link:', url),
    )
  }

  return (
    <div className="booking-mgmt">
      <header className="booking-mgmt__header">
        <div>
          <h1 className="booking-mgmt__title">
            {staffMode ? 'Tiếp đón & check-in' : 'Đặt bàn'}
          </h1>
          <p className="booking-mgmt__subtitle">
            {staffMode
              ? 'Gán bàn cho khách → Xác nhận đơn → Check-in khi khách đến → QR/link để khách gọi món tại bàn.'
              : 'Xác nhận đơn chờ → tạo link & QR gọi món tại bàn (cần đã gán bàn). Check-in khi khách đến.'}
          </p>
        </div>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      {qrModal ? (
        <div className="booking-mgmt__modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <div className="booking-mgmt__modal">
            <h2 id="qr-title" className="booking-mgmt__modal-title">
              {qrModal.title}
            </h2>
            {qrModal.note ? <p className="booking-mgmt__modal-note">{qrModal.note}</p> : null}
            <div
              className="booking-mgmt__qr-svg"
              dangerouslySetInnerHTML={{ __html: qrModal.svg }}
            />
            <p className="booking-mgmt__modal-url">
              <a href={qrModal.url} target="_blank" rel="noreferrer">
                Mở trang gọi món
              </a>
            </p>
            <div className="booking-mgmt__modal-actions">
              <button type="button" className="booking-mgmt__btn booking-mgmt__btn--primary" onClick={() => copyUrl(qrModal.url)}>
                Copy link
              </button>
              <button type="button" className="booking-mgmt__btn booking-mgmt__btn--ghost" onClick={() => setQrModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="booking-mgmt__table-wrap">
        <table className="booking-mgmt__table">
          <thead>
            <tr>
              <th>Khách</th>
              <th>Số điện thoại</th>
              <th>Email (tài khoản)</th>
              <th>Ngày</th>
              <th>Giờ</th>
              <th>Số khách</th>
              <th>Bàn</th>
              <th>Gán bàn</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selectableTables = tablesSelectableForRow(tables, rows, r, assignPick)
              return (
              <tr key={r.id}>
                <td data-label="Khách">{r.fullName}</td>
                <td data-label="SĐT">{r.phone}</td>
                <td data-label="Email">{r.userEmail || '—'}</td>
                <td data-label="Ngày">{r.date}</td>
                <td data-label="Giờ">{r.time}</td>
                <td data-label="Số khách">{r.guestCount}</td>
                <td data-label="Bàn">
                  {Array.isArray(r.tables) && r.tables.length
                    ? r.tables.join(', ')
                    : r.assignedTableId
                      ? `Bàn #${r.assignedTableId}`
                      : '—'}
                </td>
                <td data-label="Gán bàn">
                  <div className="booking-mgmt__assign">
                    <select
                      value={assignPick[r.id] ?? ''}
                      onChange={(e) => setAssignPick((p) => ({ ...p, [r.id]: e.target.value }))}
                      aria-label="Chọn bàn"
                    >
                      <option value="">— Chọn —</option>
                      {selectableTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || `Bàn ${t.id}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="booking-mgmt__btn booking-mgmt__btn--ghost booking-mgmt__btn--sm"
                      disabled={r.status === 'CANCELLED' || r.status === 'COMPLETED'}
                      onClick={() => assignTable(r.id)}
                    >
                      Gán
                    </button>
                  </div>
                </td>
                <td data-label="Trạng thái">
                  <span className={badgeClass(r.status)}>{r.status}</span>
                </td>
                <td data-label="Thao tác">
                  <div className="booking-mgmt__actions">
                    <button
                      type="button"
                      className="booking-mgmt__btn booking-mgmt__btn--primary"
                      disabled={r.status !== 'PENDING'}
                      onClick={() => confirm(r.id)}
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      className="booking-mgmt__btn booking-mgmt__btn--secondary"
                      disabled={r.status === 'CANCELLED' || r.status === 'COMPLETED'}
                      onClick={() => checkIn(r.id)}
                    >
                      Check-in
                    </button>
                    <button
                      type="button"
                      className="booking-mgmt__btn booking-mgmt__btn--danger"
                      disabled={r.status === 'CANCELLED' || r.status === 'COMPLETED'}
                      onClick={() => cancelBooking(r.id)}
                    >
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && !err && rows.length === 0 ? (
          <p className="booking-mgmt__empty">Chưa có đơn đặt bàn nào.</p>
        ) : null}
      </div>
    </div>
  )
}
