import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  DollarSign,
  TableProperties,
  Users,
  BarChart3,
  ChefHat,
  UtensilsCrossed,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import './Dashboard.css'

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

function statusBadge(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'CONFIRMED') return 'dash__badge dash__badge--confirmed'
  if (s === 'PENDING') return 'dash__badge dash__badge--pending'
  if (s === 'COMPLETED' || s === 'PAID') return 'dash__badge dash__badge--confirmed'
  if (s === 'CANCELLED') return 'dash__badge dash__badge--cancelled'
  if (s === 'CHECKED_IN') return 'dash__badge dash__badge--checkedin'
  return 'dash__badge'
}

const STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận bàn',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
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
      .catch((e) => { if (!c) setErr(e.message) })
      .finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [])

  const totalRevenue = revenue?.total != null ? Number(revenue.total) : 0
  const recent = bookings.slice(0, 8)
  const occupiedTables = tables.filter((t) => String(t.status || '').toUpperCase() === 'OCCUPIED').length

  if (loading) {
    return (
      <div className="dash">
        <p style={{ color: '#7A7069', fontSize: '0.9rem' }}>Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="dash">
      <div style={{ marginBottom: 28 }}>
        <h1 className="dash__title">Tổng quan</h1>
        <p className="dash__subtitle">
          Xem nhanh tình trạng hoạt động của nhà hàng hôm nay.
        </p>
      </div>

      {err ? (
        <p style={{ color: '#C0392B', fontSize: '0.9rem', marginBottom: 16 }}>{err}</p>
      ) : null}

      {/* Stats */}
      <div className="dash__stats">
        <article className="dash__stat">
          <p className="dash__stat-label">
            <CalendarDays size={14} />
            Đặt bàn
          </p>
          <p className="dash__stat-value">{bookings.length}</p>
          <p className="dash__stat-sub">Tổng số đơn đặt bàn</p>
        </article>
        <article className="dash__stat">
          <p className="dash__stat-label">
            <DollarSign size={14} />
            Doanh thu
          </p>
          <p className="dash__stat-value" style={{ fontSize: '1.4rem' }}>
            {vnd.format(totalRevenue)}
          </p>
          <p className="dash__stat-sub">Theo báo cáo hệ thống</p>
        </article>
        <article className="dash__stat">
          <p className="dash__stat-label">
            <TableProperties size={14} />
            Bàn đang dùng
          </p>
          <p className="dash__stat-value">{occupiedTables} / {tables.length}</p>
          <p className="dash__stat-sub">Bàn đang phục vụ khách</p>
        </article>
        <article className="dash__stat">
          <p className="dash__stat-label">
            <Users size={14} />
            Tài khoản
          </p>
          <p className="dash__stat-value">{users.length}</p>
          <p className="dash__stat-sub">Người dùng đã đăng ký</p>
        </article>
      </div>

      <div className="dash__grid">
        {/* Recent bookings */}
        <div className="dash__section" style={{ gridColumn: '1 / -1' }}>
          <h2 className="dash__section-title">
            <Clock size={16} />
            Đơn đặt bàn gần đây
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách hàng</th>
                  <th>Email</th>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Số khách</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="dash__empty">Chưa có đơn đặt bàn nào.</td>
                  </tr>
                ) : recent.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: '#7A7069', fontSize: '0.82rem' }}>#{r.id}</td>
                    <td style={{ fontWeight: 500 }}>{r.fullName || '—'}</td>
                    <td style={{ color: '#7A7069', fontSize: '0.875rem' }}>{r.userEmail || '—'}</td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td style={{ textAlign: 'center' }}>{r.guestCount}</td>
                    <td>
                      <span className={statusBadge(r.status)}>
                        {STATUS_LABELS[String(r.status || '').toUpperCase()] || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="dash__section" style={{ marginTop: 20 }}>
        <h2 className="dash__section-title">
          <TrendingUp size={16} />
          Truy cập nhanh
        </h2>
        <div className="dash__links">
          <Link to="/admin/bookings" className="dash__link">
            <CalendarDays size={22} />
            Đặt bàn
          </Link>
          <Link to="/admin/tables" className="dash__link">
            <TableProperties size={22} />
            Quản lý bàn
          </Link>
          <Link to="/admin/kitchen" className="dash__link">
            <ChefHat size={22} />
            Bếp & gọi món
          </Link>
          <Link to="/admin/menu" className="dash__link">
            <UtensilsCrossed size={22} />
            Thực đơn
          </Link>
          <Link to="/admin/users/customers" className="dash__link">
            <Users size={22} />
            Người dùng
          </Link>
          <Link to="/admin/reports" className="dash__link">
            <BarChart3 size={22} />
            Doanh thu
          </Link>
        </div>
      </div>
    </div>
  )
}
