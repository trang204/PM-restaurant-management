import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
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

export default function ReservationDetail() {
  const { toast, confirm } = useNotifications()
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<ReservationRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!id) return
    let c = false
    setLoading(true)
    apiFetch<unknown>(`/reservations/${id}`)
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
  }, [id])

  async function cancel() {
    if (!id) return
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
      await apiFetch(`/reservations/${id}/cancel`, { method: 'POST', body: '{}' })
      const d = await apiFetch<unknown>(`/reservations/${id}`)
      setData(normalizeReservation(d))
    } catch (e) {
      toast((e as Error).message, { variant: 'error' })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Chi tiết đơn</h1>
          <p className="menuHero__subtitle">
            Mã: <code>{id}</code>
          </p>
        </div>
      </header>

      <section className="menuSection" style={{ textAlign: 'left' }}>
        <p>
          <Link to="/reservations">← Lịch sử</Link>
        </p>
        {loading ? <p>Đang tải...</p> : null}
        {error ? <p style={{ color: 'white' }}>{error}</p> : null}
        {!loading && !error && !data ? (
          <p style={{ color: 'white' }}>Không tải được chi tiết đơn (dữ liệu không hợp lệ).</p>
        ) : null}
        {data ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, maxWidth: 560 }}>
            <p>
              <strong>{data.fullName}</strong> · {data.phone}
            </p>
            <p>
              {data.date} · {data.time} · {data.guestCount} khách
            </p>
            <p>
              Trạng thái: <StatusBadge status={String(data.status || '')} />
            </p>
            {data.tables?.length ? (
              <p>Bàn: {data.tables.join(', ')}</p>
            ) : data.assignedTableId ? (
              <p>Bàn (mã): {data.assignedTableId}</p>
            ) : null}
            {data.note ? <p>Ghi chú: {data.note}</p> : null}
            {data.tableOrderToken ? (
              <p style={{ marginTop: 12 }}>
                <Link to={`/order/table/${encodeURIComponent(data.tableOrderToken)}`}>
                  Gọi món tại bàn
                </Link>
              </p>
            ) : null}
            {['PENDING', 'HOLD'].includes(String(data.status || '').toUpperCase()) ? (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="nav__link" disabled={cancelling} onClick={cancel}>
                  {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}
