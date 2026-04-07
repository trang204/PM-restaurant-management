import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './BookingManagement.css'

function badgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'book-badge book-badge--yellow'
  if (s === 'confirmed') return 'book-badge book-badge--blue'
  if (s === 'completed' || s === 'paid') return 'book-badge book-badge--green'
  if (s === 'cancelled') return 'book-badge book-badge--red'
  return 'book-badge'
}

export default function BookingManagement() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

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

  async function confirm(id) {
    try {
      await apiFetch(`/admin/reservations/${id}/confirm`, { method: 'POST', body: '{}' })
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

  return (
    <div className="booking-mgmt">
      <header className="booking-mgmt__header">
        <div>
          <h1 className="booking-mgmt__title">Đặt bàn</h1>
          <p className="booking-mgmt__subtitle">Danh sách đơn từ cơ sở dữ liệu · xác nhận hoặc hủy đơn chờ.</p>
        </div>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

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
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Khách">{r.fullName}</td>
                <td data-label="SĐT">{r.phone}</td>
                <td data-label="Email">{r.userEmail || '—'}</td>
                <td data-label="Ngày">{r.date}</td>
                <td data-label="Giờ">{r.time}</td>
                <td data-label="Số khách">{r.guestCount}</td>
                <td data-label="Bàn">
                  {Array.isArray(r.tables) && r.tables.length ? r.tables.join(', ') : '—'}
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
                      className="booking-mgmt__btn booking-mgmt__btn--danger"
                      disabled={r.status === 'CANCELLED' || r.status === 'COMPLETED'}
                      onClick={() => cancelBooking(r.id)}
                    >
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !err && rows.length === 0 ? (
          <p className="booking-mgmt__empty">Chưa có đơn đặt bàn nào.</p>
        ) : null}
      </div>
    </div>
  )
}
