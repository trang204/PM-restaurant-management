import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Pin, Users, X } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import { normalizeReservation, type ReservationRow } from '../../lib/reservation'
import './ReservationDetailView.css'

export const STATUS_LABELS: Record<string, string> = {
  HOLD: 'Đang giữ bàn',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã vào bàn',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
}

function statusBadgeStyle(statusRaw: string): React.CSSProperties {
  const s = String(statusRaw || '').toUpperCase()
  if (s === 'COMPLETED') return { color: '#0f5132', background: '#d1e7dd', border: '1px solid #badbcc' }
  if (s === 'CANCELLED') return { color: '#842029', background: '#f8d7da', border: '1px solid #f5c2c7' }
  if (s === 'PENDING') return { color: '#664d03', background: '#fff3cd', border: '1px solid #ffecb5' }
  return { color: 'inherit', background: 'transparent', border: '1px solid transparent' }
}

export function StatusBadge({ status }: { status: string }) {
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

type Props = {
  bookingId: string
  variant: 'page' | 'modal'
  onClose?: () => void
  /** Gọi sau khi hủy đơn thành công (vd. làm mới danh sách) */
  onCancelled?: () => void
}

export default function ReservationDetailView({ bookingId, variant, onClose, onCancelled }: Props) {
  const navigate = useNavigate()
  const { toast, confirm } = useNotifications()
  const [data, setData] = useState<ReservationRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    let c = false
    setLoading(true)
    setError(null)
    apiFetch<unknown>(`/reservations/${bookingId}`)
      .then((d) => {
        if (!c) setData(normalizeReservation(d))
      })
      .catch((e) => {
        if (!c) setError((e as Error).message)
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [bookingId])

  async function cancel() {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      toast('Đăng nhập để hủy đơn của bạn.', { variant: 'info' })
      navigate('/login')
      return
    }
    const okCancel = await confirm({ title: 'Hủy đơn', message: 'Hủy đơn đặt bàn này?' })
    if (!okCancel) return
    setCancelling(true)
    try {
      await apiFetch(`/reservations/${bookingId}/cancel`, { method: 'POST', body: '{}' })
      const d = await apiFetch<unknown>(`/reservations/${bookingId}`)
      setData(normalizeReservation(d))
      onCancelled?.()
    } catch (e) {
      toast((e as Error).message, { variant: 'error' })
    } finally {
      setCancelling(false)
    }
  }

  const body = (
    <>
      {loading ? <p className="resDetail__muted">Đang tải...</p> : null}
      {error ? (
        <p className="resDetail__error">{error}</p>
      ) : null}
      {!loading && !error && !data ? (
        <p className="resDetail__error">Không tải được chi tiết đơn (dữ liệu không hợp lệ).</p>
      ) : null}
      {data ? (
        <div className="resDetail__card">
          <p>
            <strong>{data.fullName}</strong> · {data.phone}
          </p>
          <p>
            <Calendar size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
            {data.date} - {data.time}
            <br />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Users size={16} aria-hidden="true" />
              <span>{data.guestCount} khách</span>
            </span>
          </p>
          <p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Pin size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
              Trạng thái: <StatusBadge status={String(data.status || '')} />
            </span>
          </p>
          {data.tables?.length ? (
            <p>
              <MapPin size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
              Bàn: {data.tables.join(', ')}
            </p>
          ) : data.assignedTableId ? (
            <p>Bàn (mã): {data.assignedTableId}</p>
          ) : null}
          {data.note ? <p>Ghi chú: {data.note}</p> : null}
          {data.tableOrderToken ? (
            <p style={{ marginTop: 12 }}>
              <Link to={`/order/table/${encodeURIComponent(data.tableOrderToken)}`}>Gọi món tại bàn</Link>
            </p>
          ) : null}
          {['PENDING', 'HOLD'].includes(String(data.status || '').toUpperCase()) ? (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="nav__link" disabled={cancelling} onClick={() => void cancel()}>
                {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )

  if (variant === 'modal') {
    return (
      <div className="resDetail resDetail--modal" role="dialog" aria-modal="true" aria-labelledby="res-detail-title">
        <div className="resDetail__backdrop" onClick={onClose} aria-hidden />
        <div className="resDetail__panel">
          <div className="resDetail__toolbar">
            <h2 id="res-detail-title" className="resDetail__title">
              Chi tiết đơn · mã <code>{bookingId}</code>
            </h2>
            <button type="button" className="resDetail__close" onClick={onClose} aria-label="Đóng">
              <X size={22} />
            </button>
          </div>
          <div className="resDetail__body">{body}</div>
        </div>
      </div>
    )
  }

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Chi tiết đơn</h1>
          <p className="menuHero__subtitle">
            Mã: <code>{bookingId}</code>
          </p>
        </div>
      </header>

      <section className="menuSection resDetail__pageSection">
        <p>
          <Link to="/reservations">← Lịch sử</Link>
        </p>
        {body}
      </section>
    </main>
  )
}
