import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Pin, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { normalizeReservation, type ReservationRow } from '../../lib/reservation'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã vào bàn',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
}

function statusBadgeStyle(statusRaw: string): React.CSSProperties {
  const s = String(statusRaw || '').toUpperCase()
  if (s === 'COMPLETED') return { color: '#0f5132', background: '#d1e7dd', border: '1px solid #badbcc' } // xanh
  if (s === 'CANCELLED') return { color: '#842029', background: '#f8d7da', border: '1px solid #f5c2c7' } // đỏ
  if (s === 'PENDING') return { color: '#664d03', background: '#fff3cd', border: '1px solid #ffecb5' } // vàng
  return { color: 'inherit', background: 'transparent', border: '1px solid transparent' }
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status
  const style = statusBadgeStyle(status)
  return (
    <span
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontWeight: 700,
        fontSize: '0.82rem',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function formatDateVi(isoDate: string) {
  const s = String(isoDate || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}`
}

function formatTimeVi(rawTime: string) {
  const s = String(rawTime || '').trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return s
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

export default function ReservationHistory() {
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      setLoading(false)
      setError('Đăng nhập để xem lịch sử đặt bàn của bạn.')
      return
    }
    apiFetch<unknown[]>('/reservations')
      .then((d) => {
        const arr = Array.isArray(d) ? d : []
        setRows(
          arr
            .map((raw) => normalizeReservation(raw))
            .filter((x): x is ReservationRow => x != null),
        )
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Lịch sử đặt bàn</h1>
          <p className="menuHero__subtitle">Xem các lần đặt trước và trạng thái đơn của bạn.</p>
        </div>
      </header>

      <section className="menuSection" style={{ textAlign: 'left' }}>
        {loading ? <p>Đang tải...</p> : null}
        {error ? (
          <p style={{ color: error.startsWith('Đăng nhập') ? 'inherit' : 'crimson' }}>
            {error}{' '}
            {error.startsWith('Đăng nhập') ? (
              <Link to="/login" className="nav__link nav__cta" style={{ display: 'inline-block', marginLeft: 8 }}>
                Đăng nhập
              </Link>
            ) : null}
          </p>
        ) : null}
        {!loading && !error && rows.length === 0 ? <p>Chưa có đơn nào (khi đặt đã đăng nhập, đơn sẽ gắn tài khoản).</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <strong>{r.fullName}</strong>
                <span style={{ opacity: 0.9 }}>· {r.phone}</span>
              </div>

              <div style={{ marginTop: 6, display: 'grid', gap: 2 }}>
                <div>
                  <Calendar size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                  {formatDateVi(r.date)} - {formatTimeVi(r.time)}
                </div>
                <div>
                  <Users size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                  {r.guestCount} khách
                </div>
                <div>
                  <MapPin size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                  {r.tables?.length ? `Bàn ${r.tables.join(', ')}` : r.assignedTableId ? `Bàn ${r.assignedTableId}` : 'Chưa gán bàn'}
                </div>
                <div>
                  <Pin size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                  Trạng thái: <StatusBadge status={String(r.status || '')} />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <Link
                  to={`/reservations/${r.id}`}
                  className="nav__link nav__cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  Xem chi tiết
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
