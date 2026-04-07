import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './Dashboard.css'

function statusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'confirmed') return 'dash-bookings__badge dash-bookings__badge--blue'
  if (s === 'pending') return 'dash-bookings__badge dash-bookings__badge--yellow'
  if (s === 'completed' || s === 'paid') return 'dash-bookings__badge dash-bookings__badge--green'
  if (s === 'cancelled') return 'dash-bookings__badge dash-bookings__badge--red'
  return 'dash-bookings__badge'
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tables, setTables] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    let c = false
    setLoading(true)
    Promise.all([
      apiFetch('/admin/reports/revenue'),
      apiFetch('/admin/reservations'),
      apiFetch('/tables'),
      apiFetch('/admin/users'),
    ])
      .then(([rev, res, tbl, usr]) => {
        if (c) return
        setRevenue(rev)
        setBookings(Array.isArray(res) ? res : [])
        setTables(Array.isArray(tbl) ? tbl : [])
        setUsers(Array.isArray(usr) ? usr : [])
      })
      .catch((e) => {
        if (!c) setErr(e.message)
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [])

  const totalVnd = revenue?.total != null ? Number(revenue.total).toLocaleString('vi-VN') : '0'
  const recent = bookings.slice(0, 8)

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">Tổng quan đơn đặt bàn, doanh thu và hệ thống.</p>
        </div>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      <section className="dashboard__stats" aria-label="Statistics">
        <article className="dash-stat-card">
          <p className="dash-stat-card__label">Bookings</p>
          <p className="dash-stat-card__value">{bookings.length}</p>
          <p className="dash-stat-card__hint">Tổng số đơn đặt bàn</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-card__label">Revenue (báo cáo)</p>
          <p className="dash-stat-card__value">₫ {totalVnd}</p>
          <p className="dash-stat-card__hint">Theo báo cáo hệ thống</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-card__label">Tables</p>
          <p className="dash-stat-card__value">{tables.length}</p>
          <p className="dash-stat-card__hint">Số bàn trong nhà hàng</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-card__label">Users</p>
          <p className="dash-stat-card__value">{users.length}</p>
          <p className="dash-stat-card__hint">Tài khoản đã đăng ký</p>
        </article>
      </section>

      <div className="dashboard__grid dashboard__grid--single">
        <section className="dash-bookings" aria-label="Recent bookings">
          <h2 className="dash-section-title">Đơn gần đây</h2>
          <div className="dash-bookings__table-wrap">
            <table className="dash-bookings__table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách</th>
                  <th>Email</th>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Số khách</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.fullName}</td>
                    <td>{r.userEmail || '—'}</td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td>{r.guestCount}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
