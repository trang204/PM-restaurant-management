import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  DollarSign,
  TableProperties,
  Users,
  BarChart3,
  ChefHat,
  PlusCircle,
  ClipboardList,
  LogIn,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import './Dashboard.css'

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

function todayYmdLocal() {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
  CHECKED_IN: 'Đã vào bàn',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [revenueToday, setRevenueToday] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tables, setTables] = useState([])
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [busy, setBusy] = useState(false)

  function load({ soft = false } = {}) {
    let cancelled = false
    if (!soft) setLoading(true)
    setBusy(true)
    setErr(null)
    const today = todayYmdLocal()
    Promise.all([
      apiFetch(`/admin/reports/revenue?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`),
      apiFetch('/admin/reservations'),
      apiFetch('/tables'),
      apiFetch('/admin/users'),
    ])
      .then(([revToday, res, tbl, usr]) => {
        if (cancelled) return
        setRevenueToday(revToday)
        setBookings(Array.isArray(res) ? res : [])
        setTables(Array.isArray(tbl) ? tbl : [])
        setUsers(Array.isArray(usr) ? usr : [])
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || String(e))
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false)
          if (!soft) setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(() => {
    const cancel = load()
    return cancel
  }, [])

  const today = todayYmdLocal()
  const totalRevenueToday = revenueToday?.total != null ? Number(revenueToday.total) : 0
  const occupiedTables = tables.filter((t) => String(t.status || '').toUpperCase() === 'OCCUPIED').length

  const todayBookingsCount = useMemo(() => {
    return bookings.filter((b) => String(b?.date || '').slice(0, 10) === today).length
  }, [bookings, today])

  const filteredRecent = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const st = String(status || 'ALL').toUpperCase()
    const out = bookings.filter((b) => {
      const name = String(b?.fullName || '').toLowerCase()
      const phone = String(b?.phone || '').toLowerCase()
      const email = String(b?.userEmail || '').toLowerCase()
      const okQ = !qq || name.includes(qq) || phone.includes(qq) || email.includes(qq) || String(b?.id || '').includes(qq)
      const s = String(b?.status || '').toUpperCase()
      const okSt = st === 'ALL' ? true : s === st
      return okQ && okSt
    })
    return out.slice(0, 10)
  }, [bookings, q, status])

  async function confirmBooking(id) {
    setBusy(true)
    setErr(null)
    try {
      await apiFetch(`/admin/reservations/${id}/confirm`, { method: 'POST', body: '{}' })
      load({ soft: true })
    } catch (e) {
      setErr(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function cancelBooking(id) {
    setBusy(true)
    setErr(null)
    try {
      await apiFetch(`/admin/reservations/${id}/cancel`, { method: 'POST', body: '{}' })
      load({ soft: true })
    } catch (e) {
      setErr(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

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
            Đặt bàn hôm nay
          </p>
          <p className="dash__stat-value">{todayBookingsCount}</p>
          <p className="dash__stat-sub">Số đơn theo ngày hiện tại</p>
        </article>
        <article className="dash__stat">
          <p className="dash__stat-label">
            <DollarSign size={14} />
            Doanh thu hôm nay
          </p>
          <p className="dash__stat-value" style={{ fontSize: '1.4rem' }}>
            {vnd.format(totalRevenueToday)}
          </p>
          <p className="dash__stat-sub">Tổng thanh toán (PAID) trong ngày</p>
        </article>
        <article className="dash__stat">
          <p className="dash__stat-label">
            <TableProperties size={14} />
            Bàn đang sử dụng
          </p>
          <p className="dash__stat-value">{occupiedTables} / {tables.length}</p>
          <p className="dash__stat-sub">Bàn đang phục vụ khách</p>
        </article>
        <article className="dash__stat">
          <p className="dash__stat-label">
            <Users size={14} />
            Tổng người dùng
          </p>
          <p className="dash__stat-value">{users.length}</p>
          <p className="dash__stat-sub">Người dùng đã đăng ký</p>
        </article>
      </div>

      <div className="dash__grid">
        {/* Recent bookings */}
        <div className="dash__section" style={{ gridColumn: '1 / -1' }}>
          <div className="dash__sectionHead">
            <h2 className="dash__section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
              <Clock size={16} />
              Đơn đặt bàn gần đây
            </h2>
            <div className="dash__sectionActions">
              <button
                type="button"
                className="dash__btn dash__btn--ghost"
                onClick={() => load({ soft: true })}
                disabled={busy}
                title="Làm mới dữ liệu"
              >
                <RefreshCw size={16} />
                Làm mới
              </button>
              <Link to="/admin/bookings" className="dash__btn dash__btn--primary">
                Xem tất cả
              </Link>
            </div>
          </div>

          <div className="dash__filters" aria-label="Tìm kiếm và lọc">
            <div className="dash__filter">
              <label className="dash__filterLabel" htmlFor="dash-q">Tìm theo tên</label>
              <input
                id="dash-q"
                className="dash__input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nhập tên / SĐT / email / mã..."
              />
            </div>
            <div className="dash__filter">
              <label className="dash__filterLabel" htmlFor="dash-status">Lọc theo trạng thái</label>
              <select
                id="dash-status"
                className="dash__select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="HOLD">Đang giữ bàn</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="CHECKED_IN">Đã vào bàn</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

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
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="dash__empty">Không có đơn phù hợp.</td>
                  </tr>
                ) : filteredRecent.map((r) => (
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
                    <td style={{ textAlign: 'right' }}>
                      <div className="dash__rowActions">
                        <button
                          type="button"
                          className="dash__btn dash__btn--sm"
                          onClick={() => navigate('/admin/bookings')}
                          title="Xem trong trang quản lý đặt bàn"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          className="dash__btn dash__btn--sm dash__btn--primary"
                          disabled={busy || !['PENDING', 'HOLD'].includes(String(r.status || '').toUpperCase())}
                          onClick={() => confirmBooking(r.id)}
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          className="dash__btn dash__btn--sm dash__btn--danger"
                          disabled={busy || ['CANCELLED', 'COMPLETED', 'CHECKED_IN'].includes(String(r.status || '').toUpperCase())}
                          onClick={() => cancelBooking(r.id)}
                        >
                          Huỷ
                        </button>
                      </div>
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
          <ClipboardList size={16} />
          Truy cập nhanh
        </h2>
        <div className="dash__links">
          <Link to="/admin/bookings" className="dash__link">
            <PlusCircle size={22} />
            Tạo đặt bàn
          </Link>
          <Link to="/admin/kitchen" className="dash__link">
            <ChefHat size={22} />
            Thêm món
          </Link>
          <Link to="/admin/bookings" className="dash__link">
            <LogIn size={22} />
            Check-in khách
          </Link>
          <Link to="/admin/tables" className="dash__link">
            <TableProperties size={22} />
            Xem bàn trống
          </Link>
        </div>
      </div>
    </div>
  )
}
