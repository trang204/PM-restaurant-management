import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import AdminPagination from '../../components/AdminPagination'
import './BookingManagement.css'

function badgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'book-badge book-badge--yellow'
  if (s === 'hold') return 'book-badge book-badge--yellow'
  if (s === 'confirmed') return 'book-badge book-badge--blue'
  if (s === 'checked_in') return 'book-badge book-badge--green'
  if (s === 'completed' || s === 'paid') return 'book-badge book-badge--green'
  if (s === 'cancelled') return 'book-badge book-badge--red'
  return 'book-badge'
}

const STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  HOLD: 'Đang giữ bàn',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã vào bàn',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
}

function statusLabel(status) {
  const key = String(status || '').trim().toUpperCase()
  return STATUS_LABELS[key] || key || '—'
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

function nowHmLocal() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

function tableAvailableForWalkIn(t) {
  const s = String(t?.status || '').toUpperCase()
  return s === 'AVAILABLE'
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
  return u === 'PENDING' || u === 'HOLD' || u === 'CONFIRMED' || u === 'CHECKED_IN'
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

function assignedTableIsClosed(tables, row) {
  if (!row?.assignedTableId) return false
  const t = tables.find((x) => String(x.id) === String(row.assignedTableId))
  return Boolean(t && String(t.status || '').toUpperCase() === 'CLOSED')
}

function bankLogoUrl(code) {
  if (!code) return null
  return `https://qr.sepay.vn/assets/img/banklogo/${code}.png`
}

/** @param {{ staffMode?: boolean }} props */
export default function BookingManagement({ staffMode = false }) {
  const { toast, confirm: askConfirm } = useNotifications()
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
  const [releaseGuestModal, setReleaseGuestModal] = useState(null)
  const [releaseGuestNote, setReleaseGuestNote] = useState('')
  const [opsBusy, setOpsBusy] = useState(false)
  const [walkInTableId, setWalkInTableId] = useState('')
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [walkInGuests, setWalkInGuests] = useState('2')
  const [walkInBusy, setWalkInBusy] = useState(false)
  const [paymentSettings, setPaymentSettings] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [qrBusy, setQrBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL | PENDING | CONFIRMED | COMPLETED

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

  useEffect(() => {
    apiFetch('/admin/settings')
      .then((d) => {
        if (!d) return
        setPaymentSettings({
          bankAccount: String(d.payment_bank_account ?? '').trim(),
          bankCode: String(d.payment_bank_code ?? '').trim(),
          transferContent: String(d.payment_transfer_content ?? '').trim(),
          qrTemplate: String(d.payment_qr_template ?? '').trim(),
        })
      })
      .catch(() => {})
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

  function matchesStatusFilter(r) {
    const st = String(r?.status || '').toUpperCase()
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'PENDING') return st === 'PENDING' || st === 'HOLD'
    if (statusFilter === 'CONFIRMED') return st === 'CONFIRMED'
    if (statusFilter === 'COMPLETED') return st === 'COMPLETED' || st === 'PAID' || st === 'CANCELLED'
    return true
  }

  const filteredDayRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return activeDayRows.filter((r) => {
      if (!matchesStatusFilter(r)) return false
      if (!q) return true
      const name = String(r.fullName || '').toLowerCase()
      const phone = String(r.phone || '').toLowerCase()
      return name.includes(q) || phone.includes(q) || String(r.id || '').includes(q)
    })
  }, [activeDayRows, search, statusFilter])

  function tableStatusVi(st) {
    const s = String(st || '').toUpperCase()
    if (s === 'AVAILABLE' || s === '') return 'còn trống'
    if (s === 'OCCUPIED') return 'đang dùng'
    if (s === 'RESERVED') return 'đang giữ'
    if (s === 'CLOSED') return 'đang đóng'
    return String(st || '').toLowerCase() || '—'
  }

  function rowActionType(r) {
    const st = String(r?.status || '').toUpperCase()
    if (st === 'PENDING' || st === 'HOLD') return 'PENDING'
    if (st === 'CONFIRMED') return 'CONFIRMED'
    if (st === 'CHECKED_IN') return 'CHECKED_IN'
    return 'DONE'
  }

  function goToday() {
    const idx = sortedDateKeys.indexOf(todayYmd)
    if (idx >= 0) setDayPage(idx)
  }

  async function confirmReservation(id) {
    try {
      const res = await apiFetch(`/admin/reservations/${id}/confirm`, { method: 'POST', body: '{}' })
      load()
      if (res?.tableSessionNote) {
        toast(res.tableSessionNote, { variant: 'info' })
      }
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function checkIn(id) {
    try {
      const res = await apiFetch(`/admin/reservations/${id}/check-in`, { method: 'POST', body: '{}' })
      load()
      if (res?.tableSession?.qrSvg && res?.tableSession?.orderUrl) {
        setQrModal({
          title: 'Vào bàn — QR gọi món',
          svg: res.tableSession.qrSvg,
          url: res.tableSession.orderUrl,
          note: res.tableSessionNote,
        })
      } else if (res?.tableSessionNote) {
        toast(res.tableSessionNote, { variant: 'info' })
      }
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function assignTable(bookingId) {
    const tid = assignPick[bookingId]
    if (!tid) {
      toast('Chọn bàn trước.', { variant: 'info' })
      return
    }
    const booking = rows.find((x) => x.id === bookingId)
    const table = tables.find((x) => String(x.id) === String(tid))
    if (booking && table) {
      const cap = Number(table.capacity)
      const need = Number(booking.guestCount)
      if (Number.isFinite(cap) && Number.isFinite(need) && cap > 0 && need > 0 && cap < need) {
        toast('Bàn không đủ chỗ.', { variant: 'error' })
        return
      }
      const st = String(table.status || '').toUpperCase()
      if (st !== 'AVAILABLE') {
        toast('Bàn đang được sử dụng.', { variant: 'error' })
        return
      }
    }
    try {
      await apiFetch(`/admin/reservations/${bookingId}/assign-table`, {
        method: 'POST',
        body: JSON.stringify({ tableId: Number(tid) }),
      })
      load()
      refreshTables()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function cancelBooking(id) {
    const row = rows.find((x) => x.id === id)
    const who = row?.fullName ? ` (${row.fullName})` : ''
    const okCancel = await askConfirm({
      title: 'Hủy đơn',
      message: `Bạn có chắc chắn muốn hủy đơn #${id}${who} không?`,
    })
    if (!okCancel) return
    try {
      await apiFetch(`/admin/reservations/${id}/cancel`, { method: 'POST', body: '{}' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(
      () => toast('Đã copy link.', { variant: 'success' }),
      () =>
        toast('Không thể copy tự động. Hãy chọn và sao chép liên kết trong ô bên dưới hoặc dùng nút mở trang.', {
          variant: 'info',
        }),
    )
  }

  function openTransfer(r) {
    if (!r.assignedTableId) {
      toast('Chưa gán bàn — không thể chuyển.', { variant: 'info' })
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
      toast('Chọn bàn đích.', { variant: 'info' })
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
      toast(e.message, { variant: 'error' })
    } finally {
      setOpsBusy(false)
    }
  }

  function openReleaseGuest(r) {
    if (!r.assignedTableId) {
      toast('Chưa gán bàn.', { variant: 'info' })
      return
    }
    if (r.status !== 'CHECKED_IN') {
      toast('Chỉ trả bàn khi khách đã vào bàn (đã check-in).', { variant: 'info' })
      return
    }
    setReleaseGuestModal({ bookingId: r.id, label: r.fullName || `Đơn #${r.id}` })
    setReleaseGuestNote('')
  }

  async function submitReleaseGuest() {
    if (!releaseGuestModal) return
    setOpsBusy(true)
    try {
      await apiFetch(`/admin/reservations/${releaseGuestModal.bookingId}/release-guest`, {
        method: 'POST',
        body: JSON.stringify({
          note: releaseGuestNote.trim() ? releaseGuestNote.trim() : undefined,
        }),
      })
      setReleaseGuestModal(null)
      setReleaseGuestNote('')
      toast('Đã trả bàn — bàn trống, có thể nhận khách mới.', { variant: 'success' })
      load()
      refreshTables()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    } finally {
      setOpsBusy(false)
    }
  }

  function buildSePayUrl({ bankAccount, bankCode, amount, content, template }) {
    const base = 'https://qr.sepay.vn/img'
    const params = new URLSearchParams()
    params.set('acc', bankAccount)
    params.set('bank', bankCode)
    if (amount) params.set('amount', String(Math.round(amount)))
    if (content) params.set('des', content)
    if (template) params.set('template', template)
    return `${base}?${params.toString()}`
  }

  async function openOrderQr(r) {
    setQrBusy(true)
    try {
      const res = await apiFetch(`/admin/reservations/${r.id}/order-qr`)
      if (res?.tableSession?.qrSvg && res?.tableSession?.orderUrl) {
        setQrModal({
          title: `QR gọi món — ${r.fullName || `Đơn #${r.id}`}`,
          svg: res.tableSession.qrSvg,
          url: res.tableSession.orderUrl,
          note: res.tableSessionNote,
        })
      } else {
        toast(res?.tableSessionNote || 'Chưa có phiên gọi món. Hãy gán bàn, xác nhận đơn và bấm Vào bàn khi khách tới.', { variant: 'info' })
      }
    } catch (e) {
      toast(e.message, { variant: 'error' })
    } finally {
      setQrBusy(false)
    }
  }

  async function openPaymentQr(r) {
    if (!paymentSettings?.bankAccount || !paymentSettings?.bankCode) {
      toast('Chưa cấu hình thông tin ngân hàng. Vào Cài đặt → Thanh toán để nhập.', { variant: 'info' })
      return
    }
    setPaymentBusy(true)
    try {
      const data = await apiFetch(`/admin/reservations/${r.id}/order-total`)
      const amount = Number(data?.amount ?? 0)
      const rawContent = paymentSettings.transferContent || 'Thanh toan dat ban {id}'
      const content = rawContent.replace('{id}', String(r.id)).replace('{amount}', String(Math.round(amount)))
      const qrUrl = buildSePayUrl({
        bankAccount: paymentSettings.bankAccount,
        bankCode: paymentSettings.bankCode,
        amount,
        content,
        template: paymentSettings.qrTemplate,
      })
      setPaymentModal({
        bookingId: r.id,
        guestName: r.fullName,
        amount,
        content,
        qrUrl,
        bankAccount: paymentSettings.bankAccount,
        bankCode: paymentSettings.bankCode,
      })
    } catch (e) {
      toast(e.message, { variant: 'error' })
    } finally {
      setPaymentBusy(false)
    }
  }

  return (
    <div className="booking-mgmt">
      <header className="booking-mgmt__header">
        <div>
          <h1 className="booking-mgmt__title">
            {staffMode ? 'Tiếp đón & quản lý bàn' : 'Đặt bàn'}
          </h1>
          <p className="booking-mgmt__subtitle">
            {staffMode
              ? 'Khách vãng lai: mở bàn nhanh (form bên dưới). Đặt trước: gán bàn → Xác nhận → Vào bàn → QR gọi món. Danh sách theo ngày.'
              : 'Khách vãng lai: mở bàn nhanh. Đặt trước: gán bàn → Xác nhận → Vào bàn → QR gọi món. Danh sách theo ngày.'}
          </p>
        </div>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      {!loading ? (
        <section className="booking-mgmt__walkIn" aria-labelledby="walkin-heading">
          <h2 id="walkin-heading" className="booking-mgmt__walkInTitle">
            Mở bàn — khách vãng lai
          </h2>
          <p className="booking-mgmt__walkInHint">
            Tạo đơn không cần tài khoản, vào bàn ngay, bàn chuyển sang đang có khách và hiển thị QR/link gọi món.
          </p>
          <div className="booking-mgmt__walkInGrid">
            <label className="booking-mgmt__field">
              <span>Bàn trống</span>
              <select
                value={walkInTableId}
                onChange={(e) => setWalkInTableId(e.target.value)}
                aria-label="Chọn bàn cho khách vãng lai"
              >
                <option value="">— Chọn bàn —</option>
                {tables.filter(tableAvailableForWalkIn).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || `Bàn ${t.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="booking-mgmt__field">
              <span>Tên khách (tuỳ chọn)</span>
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Khách vãng lai"
                maxLength={100}
              />
            </label>
            <label className="booking-mgmt__field">
              <span>Số điện thoại (tuỳ chọn)</span>
              <input
                type="tel"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="09…"
                maxLength={20}
              />
            </label>
            <label className="booking-mgmt__field">
              <span>Số khách</span>
              <input
                type="number"
                min={1}
                max={99}
                value={walkInGuests}
                onChange={(e) => setWalkInGuests(e.target.value)}
              />
            </label>
          </div>
          <div className="booking-mgmt__walkInActions">
            <button
              type="button"
              className="booking-mgmt__btn booking-mgmt__btn--primary"
              disabled={walkInBusy}
              onClick={async () => {
                const tid = Number(walkInTableId)
                if (!Number.isFinite(tid) || tid <= 0) {
                  toast('Chọn bàn trống.', { variant: 'info' })
                  return
                }
                setWalkInBusy(true)
                try {
                  const res = await apiFetch('/admin/reservations/walk-in', {
                    method: 'POST',
                    body: JSON.stringify({
                      tableId: tid,
                      guestName: walkInName.trim() || undefined,
                      guestPhone: walkInPhone.trim() || undefined,
                      guests: Number(walkInGuests) || 2,
                      bookingDate: todayYmdLocal(),
                      bookingTime: nowHmLocal(),
                    }),
                  })
                  setWalkInTableId('')
                  setWalkInName('')
                  setWalkInPhone('')
                  setWalkInGuests('2')
                  load()
                  refreshTables()
                  if (res?.tableSession?.qrSvg && res?.tableSession?.orderUrl) {
                    setQrModal({
                      title: 'Vãng lai — QR gọi món',
                      svg: res.tableSession.qrSvg,
                      url: res.tableSession.orderUrl,
                      note: res.tableSessionNote,
                    })
                  } else if (res?.tableSessionNote) {
                    toast(res.tableSessionNote, { variant: 'info' })
                  }
                } catch (e) {
                  toast(e.message, { variant: 'error' })
                } finally {
                  setWalkInBusy(false)
                }
              }}
            >
              {walkInBusy ? 'Đang mở bàn…' : 'Mở bàn & tạo QR'}
            </button>
          </div>
        </section>
      ) : null}

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
            <div className="booking-mgmt__modal-actions">
              <a
                href={qrModal.url}
                target="_blank"
                rel="noreferrer"
                className="booking-mgmt__btn booking-mgmt__btn--qr"
              >
                Gọi món cho khách
              </a>
              <button type="button" className="booking-mgmt__btn booking-mgmt__btn--primary" onClick={() => copyUrl(qrModal.url)}>
                Sao chép link
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

      {releaseGuestModal ? (
        <div className="booking-mgmt__modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="release-guest-title">
          <div className="booking-mgmt__modal">
            <h2 id="release-guest-title" className="booking-mgmt__modal-title">
              Trả bàn — gỡ khách
            </h2>
            <p className="booking-mgmt__modal-note">
              Kết thúc lượt phục vụ tại bàn: đóng phiên QR gọi món, kết thúc đơn, bàn trở lại trống để nhận khách tiếp theo.{' '}
              <strong>Không</strong> phải đóng bàn bảo trì. Đơn: {releaseGuestModal.label}
            </p>
            <label className="booking-mgmt__field">
              <span>Ghi chú (tuỳ chọn)</span>
              <textarea
                rows={3}
                value={releaseGuestNote}
                onChange={(e) => setReleaseGuestNote(e.target.value)}
                placeholder="Ví dụ: khách đã về, thanh toán tại quầy…"
              />
            </label>
            <div className="booking-mgmt__modal-actions">
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--primary"
                disabled={opsBusy}
                onClick={submitReleaseGuest}
              >
                {opsBusy ? 'Đang xử lý…' : 'Trả bàn'}
              </button>
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--ghost"
                disabled={opsBusy}
                onClick={() => setReleaseGuestModal(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {paymentModal ? (
        <div className="booking-mgmt__modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="payment-qr-title">
          <div className="booking-mgmt__modal booking-mgmt__modal--wide">
            <h2 id="payment-qr-title" className="booking-mgmt__modal-title">
              QR Thanh toán chuyển khoản
            </h2>
            <div className="booking-mgmt__payment-info">
              {(() => {
                const logo = bankLogoUrl(paymentModal.bankCode)
                return (
                  <div className="booking-mgmt__payment-bank-row">
                    {logo ? (
                      <img src={logo} alt={paymentModal.bankCode} className="booking-mgmt__payment-bank-logo" />
                    ) : null}
                    <div>
                      <p className="booking-mgmt__payment-bank-name">{paymentModal.bankCode}</p>
                      <p className="booking-mgmt__payment-bank-acc">STK: <strong>{paymentModal.bankAccount}</strong></p>
                    </div>
                  </div>
                )
              })()}
              <p>
                <span className="booking-mgmt__payment-label">Khách:</span> {paymentModal.guestName} &nbsp;|&nbsp;
                <span className="booking-mgmt__payment-label">Đơn #:</span> {paymentModal.bookingId}
              </p>
              <p>
                <span className="booking-mgmt__payment-label">Nội dung CK:</span> {paymentModal.content}
              </p>
              {paymentModal.amount > 0 ? (
                <p>
                  <span className="booking-mgmt__payment-label">Số tiền:</span>{' '}
                  <strong className="booking-mgmt__payment-amount">
                    {paymentModal.amount.toLocaleString('vi-VN')} ₫
                  </strong>
                </p>
              ) : (
                <p className="booking-mgmt__payment-note">Chưa có món — số tiền bằng 0. Khách có thể nhập tay khi quét QR.</p>
              )}
            </div>
            <div className="booking-mgmt__payment-qr">
              <img
                src={paymentModal.qrUrl}
                alt="QR thanh toán chuyển khoản"
                className="booking-mgmt__payment-qr-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.removeAttribute('hidden')
                }}
              />
              <p hidden className="booking-mgmt__payment-qr-err">
                Không tải được ảnh QR. Kiểm tra lại số tài khoản và mã ngân hàng trong Cài đặt.
              </p>
            </div>
            <div className="booking-mgmt__modal-actions">
              <a
                href={paymentModal.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="booking-mgmt__btn booking-mgmt__btn--secondary"
              >
                Mở QR mới
              </a>
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--ghost"
                onClick={() => setPaymentModal(null)}
              >
                Đóng
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

      {activeDateKey ? (
        <section className="booking-mgmt__day">
          <div className="booking-mgmt__dayHead">
            <h2 className="booking-mgmt__dayTitle">{formatDateHeader(activeDateKey)}</h2>
            <p className="booking-mgmt__dayMeta">
              {activeDayRows.length} đơn · {activeDayGuest} khách
              {activeIsToday ? <span className="booking-mgmt__dayBadge">Hôm nay</span> : null}
            </p>
          </div>
          <div
            className="booking-mgmt__toolbar"
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '10px 0 14px' }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên / SĐT"
              className="booking-mgmt__search"
              style={{
                flex: '1 1 260px',
                minWidth: 220,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #E2D9CC',
                background: '#fff',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['ALL', 'Tất cả'],
                ['PENDING', 'Chờ'],
                ['CONFIRMED', 'Đã xác nhận'],
                ['COMPLETED', 'Hoàn thành'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`booking-mgmt__btn booking-mgmt__btn--ghost booking-mgmt__btn--sm${statusFilter === k ? ' booking-mgmt__btn--active' : ''}`}
                  onClick={() => setStatusFilter(k)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="booking-mgmt__btn booking-mgmt__btn--secondary booking-mgmt__btn--sm"
                onClick={() => {
                  load()
                  refreshTables()
                }}
              >
                Làm mới
              </button>
            </div>
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
                {filteredDayRows.map((r) => {
                  const tableClosed = assignedTableIsClosed(tables, r)
                  const takenByOthers = tableIdsTakenByOtherBookings(rows, r)
                  const actionType = rowActionType(r)
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
                            {tables.map((t) => {
                              const id = String(t.id)
                              const st = String(t.status || '').toUpperCase()
                              const isKeep = id === String(r.assignedTableId || '') || id === String(assignPick[r.id] || '')
                              const disabled = !isKeep && (st !== 'AVAILABLE' || takenByOthers.has(id))
                              const name = t.name || `Bàn ${t.id}`
                              const cap = Number(t.capacity) || 0
                              return (
                                <option key={t.id} value={t.id} disabled={disabled}>
                                  {name} ({cap} chỗ - {tableStatusVi(t.status)})
                                </option>
                              )
                            })}
                          </select>
                          <button
                            type="button"
                            className="booking-mgmt__btn booking-mgmt__btn--ghost booking-mgmt__btn--sm"
                            disabled={actionType !== 'PENDING'}
                            onClick={() => assignTable(r.id)}
                          >
                            Gán
                          </button>
                        </div>
                      </td>
                      <td data-label="Trạng thái">
                        <span className={badgeClass(r.status)}>{statusLabel(r.status)}</span>
                      </td>
                      <td data-label="Thao tác">
                        <div className="booking-mgmt__actions">
                          {actionType === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                className="booking-mgmt__btn booking-mgmt__btn--primary"
                                disabled={tableClosed}
                                title={tableClosed ? 'Bàn đang đóng — chuyển khách sang bàn khác hoặc mở lại bàn trước' : undefined}
                                onClick={() => confirmReservation(r.id)}
                              >
                                Xác nhận
                              </button>
                              <button
                                type="button"
                                className="booking-mgmt__btn booking-mgmt__btn--danger"
                                onClick={() => cancelBooking(r.id)}
                              >
                                Hủy
                              </button>
                            </>
                          ) : null}

                          {actionType === 'CONFIRMED' ? (
                            <button
                              type="button"
                              className="booking-mgmt__btn booking-mgmt__btn--secondary"
                              disabled={tableClosed}
                              title={tableClosed ? 'Bàn đang đóng — chuyển khách sang bàn khác hoặc mở lại bàn trước' : undefined}
                              onClick={() => checkIn(r.id)}
                            >
                              Vào bàn
                            </button>
                          ) : null}

                          {actionType === 'CHECKED_IN' ? (
                            <>
                              <button
                                type="button"
                                className="booking-mgmt__btn booking-mgmt__btn--qr"
                                disabled={qrBusy || !r.assignedTableId}
                                title={!r.assignedTableId ? 'Cần gán bàn trước' : 'Xem QR gọi món / vào trang order cho khách'}
                                onClick={() => openOrderQr(r)}
                              >
                                QR gọi món
                              </button>
                              <button
                                type="button"
                                className="booking-mgmt__btn booking-mgmt__btn--ghost"
                                disabled={!r.assignedTableId}
                                onClick={() => openTransfer(r)}
                              >
                                Chuyển bàn
                              </button>
                              <button
                                type="button"
                                className="booking-mgmt__btn booking-mgmt__btn--ghost"
                                disabled={!r.assignedTableId}
                                title="Đóng phiên bàn và trả bàn về trống"
                                onClick={() => openReleaseGuest(r)}
                              >
                                Đóng bàn
                              </button>
                              <button
                                type="button"
                                className="booking-mgmt__btn booking-mgmt__btn--pay"
                                disabled={paymentBusy}
                                title="QR thanh toán chuyển khoản cho đơn này"
                                onClick={() => openPaymentQr(r)}
                              >
                                QR thanh toán
                              </button>
                            </>
                          ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {!loading && !err && totalDayPages > 0 ? (
            <div className="booking-mgmt__paginationWrap">
              <div className="booking-mgmt__pagerPick">
                <div>
                  <p className="booking-mgmt__pagerSelectLabel">Theo ngày</p>
                  <p className="booking-mgmt__pagerSub">{activeDateKey ? formatDateHeader(activeDateKey) : '—'}</p>
                </div>
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
              <AdminPagination
                className="booking-mgmt__pagination"
                page={dayPage + 1}
                pageSize={1}
                total={totalDayPages}
                showPageSize={false}
                onPageSizeChange={() => {}}
                onPageChange={(p) => setDayPage(Math.max(0, Math.min(totalDayPages - 1, Number(p) - 1)))}
              />
            </div>
          ) : null}
        </section>
      ) : !loading && !err && rows.length === 0 ? (
        <div className="booking-mgmt__table-wrap">
          <p className="booking-mgmt__empty">Chưa có đơn đặt bàn nào.</p>
        </div>
      ) : null}
    </div>
  )
}
