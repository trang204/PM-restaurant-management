import { useEffect, useMemo, useRef, useState } from 'react'
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

/** Ngày hôm nay theo giờ máy (YYYY-MM-DD). */
function todayYmdLocal() {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseYmd(ymd) {
  const s = String(ymd || '').slice(0, 10)
  if (s.length < 10) return null
  const [y, mo, da] = s.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null
  return new Date(y, mo - 1, da)
}

/** Ví dụ: "Thứ năm, 9 tháng 4, 2026" */
function formatDateHeader(ymd) {
  const dt = parseYmd(ymd)
  if (!dt || Number.isNaN(dt.getTime())) return String(ymd || '—')
  const weekday = dt.toLocaleDateString('vi-VN', { weekday: 'long' })
  const cap = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : ''
  const rest = dt.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${cap}, ${rest}`
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
  return s === 'OCCUPIED' || s === 'RESERVED' || s === 'CLOSED'
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
  /** Trang theo ngày: mỗi trang = 1 ngày (index trong sortedDateKeys). */
  const [dayPage, setDayPage] = useState(0)
  const dayPageInitRef = useRef(false)
  const [transferModal, setTransferModal] = useState(null)
  const [transferToId, setTransferToId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [closeTableModal, setCloseTableModal] = useState(null)
  const [closeTableReason, setCloseTableReason] = useState('')
  const [opsBusy, setOpsBusy] = useState(false)

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

  function refreshTables() {
    apiFetch('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch(() => setTables([]))
  }

  useEffect(() => {
    refreshTables()
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

  const { byDate, todayYmd, todayGuestTotal, todayOrderCount, sortedDateKeys } = useMemo(() => {
    const todayYmd = todayYmdLocal()
    const byDate = new Map()
    for (const r of rows) {
      const key = normDate(r.date)
      if (!key) continue
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key).push(r)
    }
    const todayList = byDate.get(todayYmd) || []
    const todayGuestTotal = todayList.reduce((s, r) => s + Number(r.guestCount || 0), 0)
    const todayOrderCount = todayList.length
    const sortedDateKeys = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    return { byDate, todayYmd, todayGuestTotal, todayOrderCount, sortedDateKeys }
  }, [rows])

  useEffect(() => {
    if (!sortedDateKeys.length) {
      dayPageInitRef.current = false
      return
    }
    setDayPage((p) => Math.min(Math.max(0, p), sortedDateKeys.length - 1))
  }, [sortedDateKeys])

  useEffect(() => {
    if (!sortedDateKeys.length || dayPageInitRef.current) return
    const idx = sortedDateKeys.indexOf(todayYmd)
    setDayPage(idx >= 0 ? idx : 0)
    dayPageInitRef.current = true
  }, [sortedDateKeys, todayYmd])

  const totalDayPages = sortedDateKeys.length
  const activeDateKey = totalDayPages ? sortedDateKeys[dayPage] : null
  const activeDayRows = activeDateKey ? byDate.get(activeDateKey) || [] : []
  const activeDayGuest = activeDayRows.reduce((s, r) => s + Number(r.guestCount || 0), 0)
  const activeIsToday = Boolean(activeDateKey && activeDateKey === todayYmd)

  function goToday() {
    const idx = sortedDateKeys.indexOf(todayYmd)
    if (idx >= 0) setDayPage(idx)
  }

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

  function openTransfer(r) {
    if (!r.assignedTableId) {
      window.alert('Chưa gán bàn — không thể chuyển.')
      return
    }
    setTransferModal({ id: r.id })
    setTransferToId('')
    setTransferReason('')
  }

  async function submitTransfer() {
    if (!transferModal) return
    const tid = Number(transferToId)
    if (!Number.isFinite(tid) || tid <= 0) {
      window.alert('Chọn bàn đích.')
      return
    }
    setOpsBusy(true)
    try {
      await apiFetch(`/admin/reservations/${transferModal.id}/transfer-table`, {
        method: 'POST',
        body: JSON.stringify({
          tableId: tid,
          reason: transferReason.trim() ? transferReason.trim() : undefined,
        }),
      })
      setTransferModal(null)
      setTransferToId('')
      setTransferReason('')
      load()
      refreshTables()
    } catch (e) {
      window.alert(e.message)
    } finally {
      setOpsBusy(false)
    }
  }

  function openCloseTable(r) {
    if (!r.assignedTableId) {
      window.alert('Chưa gán bàn.')
      return
    }
    setCloseTableModal({ tableId: Number(r.assignedTableId), label: r.fullName || `Đơn #${r.id}` })
    setCloseTableReason('')
  }

  async function submitCloseTable() {
    if (!closeTableModal) return
    setOpsBusy(true)
    try {
      await apiFetch(`/admin/tables/${closeTableModal.tableId}/close`, {
        method: 'POST',
        body: JSON.stringify({
          reason: closeTableReason.trim() ? closeTableReason.trim() : undefined,
        }),
      })
      setCloseTableModal(null)
      setCloseTableReason('')
      load()
      refreshTables()
    } catch (e) {
      window.alert(e.message)
    } finally {
      setOpsBusy(false)
    }
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
              ? 'Gán bàn cho khách → Xác nhận đơn → Check-in khi khách đến → QR/link để khách gọi món tại bàn. Danh sách theo ngày: mỗi trang một ngày.'
              : 'Xác nhận đơn chờ → tạo link & QR gọi món tại bàn (cần đã gán bàn). Check-in khi khách đến. Danh sách theo ngày: mỗi trang một ngày.'}
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

      {transferModal ? (
        <div className="booking-mgmt__modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
          <div className="booking-mgmt__modal booking-mgmt__modal--wide">
            <h2 id="transfer-title" className="booking-mgmt__modal-title">
              Chuyển bàn
            </h2>
            <p className="booking-mgmt__modal-note">
              Chọn bàn mới cho khách. Link/QR gọi món giữ nguyên. Lý do có thể để trống.
            </p>
            {(() => {
              const r = rows.find((x) => x.id === transferModal.id)
              if (!r) return <p>Không tìm thấy đơn.</p>
              const options = tablesSelectableForRow(tables, rows, r, {
                ...assignPick,
                [r.id]: transferToId || String(r.assignedTableId || ''),
              }).filter((t) => String(t.id) !== String(r.assignedTableId))
              return (
                <>
                  <label className="booking-mgmt__field">
                    <span>Bàn đích</span>
                    <select
                      value={transferToId}
                      onChange={(e) => setTransferToId(e.target.value)}
                      aria-label="Bàn đích"
                    >
                      <option value="">— Chọn —</option>
                      {options.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || `Bàn ${t.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="booking-mgmt__field">
                    <span>Lý do (tuỳ chọn)</span>
                    <textarea
                      rows={3}
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      placeholder="Ví dụ: bàn hỏng đèn, ồn…"
                    />
                  </label>
                </>
              )
            })()}
            <div className="booking-mgmt__modal-actions">
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--primary"
                disabled={opsBusy}
                onClick={submitTransfer}
              >
                {opsBusy ? 'Đang xử lý…' : 'Xác nhận chuyển'}
              </button>
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--ghost"
                disabled={opsBusy}
                onClick={() => setTransferModal(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeTableModal ? (
        <div className="booking-mgmt__modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="close-table-title">
          <div className="booking-mgmt__modal">
            <h2 id="close-table-title" className="booking-mgmt__modal-title">
              Đóng bàn (sự cố)
            </h2>
            <p className="booking-mgmt__modal-note">
              Chỉ đóng được khi <strong>không còn khách đang ngồi</strong> tại bàn (chưa check-in hoặc đã chuyển khách). Đơn:{' '}
              {closeTableModal.label}
            </p>
            <label className="booking-mgmt__field">
              <span>Lý do (tuỳ chọn)</span>
              <textarea
                rows={3}
                value={closeTableReason}
                onChange={(e) => setCloseTableReason(e.target.value)}
                placeholder="Ghi chú cho nhân viên…"
              />
            </label>
            <div className="booking-mgmt__modal-actions">
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--primary"
                disabled={opsBusy}
                onClick={submitCloseTable}
              >
                {opsBusy ? 'Đang xử lý…' : 'Đóng bàn'}
              </button>
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--ghost"
                disabled={opsBusy}
                onClick={() => setCloseTableModal(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !err ? (
        <div className="booking-mgmt__today">
          <p className="booking-mgmt__todayEyebrow">Hôm nay</p>
          <div className="booking-mgmt__todayRow">
            <p className="booking-mgmt__todayDate">{formatDateHeader(todayYmd)}</p>
            {todayOrderCount === 0 ? (
              <p className="booking-mgmt__todayEmpty" role="status">
                Chưa có khách đặt bàn hôm nay.
              </p>
            ) : (
              <p className="booking-mgmt__todayStats">
                Tổng <strong>{todayGuestTotal}</strong> khách · <strong>{todayOrderCount}</strong> đơn
              </p>
            )}
          </div>
        </div>
      ) : null}

      {!loading && !err && totalDayPages > 0 ? (
        <nav className="booking-mgmt__pager" aria-label="Phân trang theo ngày">
          <div className="booking-mgmt__pagerMain">
            <button
              type="button"
              className="booking-mgmt__btn booking-mgmt__btn--ghost booking-mgmt__btn--sm"
              disabled={dayPage <= 0}
              onClick={() => setDayPage((p) => Math.max(0, p - 1))}
            >
              ← Trước
            </button>
            <span className="booking-mgmt__pagerLabel">
              Trang <strong>{dayPage + 1}</strong> / {totalDayPages}
            </span>
            <button
              type="button"
              className="booking-mgmt__btn booking-mgmt__btn--ghost booking-mgmt__btn--sm"
              disabled={dayPage >= totalDayPages - 1}
              onClick={() => setDayPage((p) => Math.min(totalDayPages - 1, p + 1))}
            >
              Sau →
            </button>
          </div>
          <div className="booking-mgmt__pagerPick">
            <label className="booking-mgmt__pagerSelectLabel" htmlFor="booking-day-page">
              Chọn ngày
            </label>
            <select
              id="booking-day-page"
              className="booking-mgmt__pagerSelect"
              value={dayPage}
              onChange={(e) => setDayPage(Number(e.target.value))}
            >
              {sortedDateKeys.map((k, i) => (
                <option key={k} value={i}>
                  {formatDateHeader(k)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="booking-mgmt__btn booking-mgmt__btn--secondary booking-mgmt__btn--sm"
              onClick={goToday}
              disabled={sortedDateKeys.indexOf(todayYmd) < 0}
              title={sortedDateKeys.indexOf(todayYmd) < 0 ? 'Không có đơn hôm nay' : 'Chuyển tới ngày hôm nay'}
            >
              Hôm nay
            </button>
          </div>
        </nav>
      ) : null}

      {activeDateKey ? (
        <section className="booking-mgmt__day">
          <div className="booking-mgmt__dayHead">
            <h2 className="booking-mgmt__dayTitle">{formatDateHeader(activeDateKey)}</h2>
            <p className="booking-mgmt__dayMeta">
              {activeDayRows.length} đơn · {activeDayGuest} khách
              {activeIsToday ? <span className="booking-mgmt__dayBadge">Hôm nay</span> : null}
            </p>
          </div>
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
                {activeDayRows.map((r) => {
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
                            <button
                              type="button"
                              className="booking-mgmt__btn booking-mgmt__btn--ghost"
                              disabled={
                                !r.assignedTableId || r.status === 'CANCELLED' || r.status === 'COMPLETED'
                              }
                              onClick={() => openTransfer(r)}
                            >
                              Chuyển bàn
                            </button>
                            <button
                              type="button"
                              className="booking-mgmt__btn booking-mgmt__btn--ghost"
                              disabled={
                                !r.assignedTableId || r.status === 'CANCELLED' || r.status === 'COMPLETED'
                              }
                              onClick={() => openCloseTable(r)}
                            >
                              Đóng bàn
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>
      ) : !loading && !err && rows.length === 0 ? (
        <div className="booking-mgmt__table-wrap">
          <p className="booking-mgmt__empty">Chưa có đơn đặt bàn nào.</p>
        </div>
      ) : null}
    </div>
  )
}
