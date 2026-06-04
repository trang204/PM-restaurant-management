import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, X, ShoppingBag, Hash } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import { normalizeReservation, type ReservationRow } from '../../lib/reservation'
import { getStatusLabel } from '../../lib/statusMapper'
import './ReservationDetailView.css'

function tableStatusVi(st: string) {
  const s = String(st || '').toUpperCase()
  if (s === 'AVAILABLE') return 'Còn trống'
  if (s === 'OCCUPIED') return 'Đang dùng'
  if (s === 'RESERVED') return 'Đang giữ'
  if (s === 'CLOSED') return 'Đang đóng'
  return st.toLowerCase()
}

function statusBadgeStyle(statusRaw: string): React.CSSProperties {
  const s = String(statusRaw || '').toUpperCase()
  if (s === 'COMPLETED') return { color: '#0f5132', background: '#d1e7dd', border: '1px solid #badbcc' }
  if (s === 'CANCELLED') return { color: '#842029', background: '#f8d7da', border: '1px solid #f5c2c7' }
  if (s === 'PENDING') return { color: '#664d03', background: '#fff3cd', border: '1px solid #ffecb5' }
  return { color: 'inherit', background: 'transparent', border: '1px solid transparent' }
}

export function StatusBadge({ status }: { status: string }) {
  const label = getStatusLabel(status, 'reservation')
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
          {/* A. Thông tin đặt bàn */}
          <div className="resDetail__section">
            <h3 className="resDetail__secTitle">
              <Hash size={18} style={{ marginRight: 6, verticalAlign: '-0.15em' }} />
              Thông tin đặt bàn
            </h3>
            <div className="resDetail__infoGrid">
              <div className="resDetail__infoItem">
                <span className="resDetail__infoLabel">Mã đặt bàn</span>
                <span className="resDetail__infoValue">#{data.id}</span>
              </div>
              <div className="resDetail__infoItem">
                <span className="resDetail__infoLabel">Tên khách hàng</span>
                <span className="resDetail__infoValue">{data.fullName}</span>
              </div>
              <div className="resDetail__infoItem">
                <span className="resDetail__infoLabel">Số điện thoại</span>
                <span className="resDetail__infoValue">{data.phone}</span>
              </div>
              <div className="resDetail__infoItem">
                <span className="resDetail__infoLabel">Ngày đặt</span>
                <span className="resDetail__infoValue">{data.date}</span>
              </div>
              <div className="resDetail__infoItem">
                <span className="resDetail__infoLabel">Giờ đặt</span>
                <span className="resDetail__infoValue">{data.time}</span>
              </div>
              <div className="resDetail__infoItem">
                <span className="resDetail__infoLabel">Số lượng khách</span>
                <span className="resDetail__infoValue">{data.guestCount} khách</span>
              </div>
              <div className="resDetail__infoItem resDetail__infoItem--full">
                <span className="resDetail__infoLabel">Thời gian tạo đơn</span>
                <span className="resDetail__infoValue">
                  {data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : '—'}
                </span>
              </div>
              <div className="resDetail__infoItem resDetail__infoItem--full">
                <span className="resDetail__infoLabel">Trạng thái hiện tại</span>
                <span className="resDetail__infoValue">
                  <StatusBadge status={String(data.status || '')} />
                </span>
              </div>
              <div className="resDetail__infoItem resDetail__infoItem--full">
                <span className="resDetail__infoLabel">Ghi chú</span>
                <span className="resDetail__infoValue resDetail__infoValue--note">
                  {data.note || 'Không có ghi chú'}
                </span>
              </div>
            </div>
          </div>

          {/* C. Thông tin bàn được gán */}
          <div className="resDetail__section" style={{ marginTop: 20 }}>
            <h3 className="resDetail__secTitle">
              <MapPin size={18} style={{ marginRight: 6, verticalAlign: '-0.15em' }} />
              Thông tin bàn gán
            </h3>
            {data.assignedTables && data.assignedTables.length > 0 ? (
              <div className="resDetail__tableGrid">
                {data.assignedTables.map((t) => (
                  <div key={t.id} className="resDetail__tableCard">
                    <div className="resDetail__tableHeader">
                      <span className="resDetail__tableName">{t.name}</span>
                      <span className={`resDetail__tableStatus resDetail__tableStatus--${t.status.toLowerCase()}`}>
                        {tableStatusVi(t.status)}
                      </span>
                    </div>
                    <div className="resDetail__tableBody">
                      <p style={{ margin: '4px 0 2px' }}>Khu vực: <strong>{t.zone || 'Chung'}</strong></p>
                      <p style={{ margin: 0 }}>Sức chứa: <strong>{t.capacity} chỗ</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : data.tables?.length ? (
              <div className="resDetail__simpleTables">
                Bàn đã gán: <strong>{data.tables.join(', ')}</strong>
              </div>
            ) : data.assignedTableId ? (
              <div className="resDetail__simpleTables">
                Bàn đã gán (mã): <strong>#{data.assignedTableId}</strong>
              </div>
            ) : (
              <div className="resDetail__empty">
                Chưa gán bàn
              </div>
            )}
          </div>

          {/* B. Danh sách món đã gọi (nếu có) */}
          <div className="resDetail__section" style={{ marginTop: 20 }}>
            <h3 className="resDetail__secTitle">
              <ShoppingBag size={18} style={{ marginRight: 6, verticalAlign: '-0.15em' }} />
              Danh sách món đã gọi
            </h3>
            {data.orderItems && data.orderItems.length > 0 ? (
              <div className="resDetail__orderWrap">
                <table className="resDetail__orderTable">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Tên món</th>
                      <th style={{ textAlign: 'center' }}>SL</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orderItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'left' }}>
                          <div className="resDetail__foodName">{item.foodName}</div>
                          {item.note ? (
                            <div className="resDetail__foodNote">Ghi chú: {item.note}</div>
                          ) : null}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          {item.price.toLocaleString('vi-VN')} ₫
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="resDetail__orderTotal">
                  <span>Tổng tiền món:</span>
                  <strong>
                    {data.orderItems
                      .reduce((sum, item) => sum + item.price * item.quantity, 0)
                      .toLocaleString('vi-VN')}{' '}
                    ₫
                  </strong>
                </div>
              </div>
            ) : (
              <div className="resDetail__empty">
                Chưa gọi món
              </div>
            )}
          </div>

          {data.tableOrderToken ? (
            <p style={{ marginTop: 16 }}>
              <Link to={`/order/table/${encodeURIComponent(data.tableOrderToken)}`} className="resDetail__orderLink">
                Gọi món tại bàn
              </Link>
            </p>
          ) : null}
          {['PENDING', 'HOLD'].includes(String(data.status || '').toUpperCase()) ? (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="nav__link nav__cta" disabled={cancelling} onClick={() => void cancel()}>
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
