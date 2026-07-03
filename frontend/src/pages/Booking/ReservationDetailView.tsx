import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import { normalizeReservation, type ReservationRow } from '../../lib/reservation'
import { getStatusLabel } from '../../lib/statusMapper'
import './ReservationDetailView.css'

import DetailModal from '../../components/DetailModal/DetailModal'
import StatusBadge from '../../components/StatusBadge/StatusBadge'

function tableStatusVi(st: string) {
  const s = String(st || '').toUpperCase()
  if (s === 'AVAILABLE') return 'Còn trống'
  if (s === 'OCCUPIED') return 'Đang dùng'
  if (s === 'RESERVED') return 'Đang giữ'
  if (s === 'CLOSED') return 'Đang đóng'
  return st.toLowerCase()
}

type Props = {
  bookingId: string
  variant: 'page' | 'modal'
  onClose?: () => void
  /** Gọi sau khi hủy đơn thành công (vd. làm mới danh sách) */
  onCancelled?: () => void
  adminMode?: boolean
}

export default function ReservationDetailView({ bookingId, variant, onClose, onCancelled, adminMode }: Props) {
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
    const detailUrl = adminMode ? `/admin/reservations/${bookingId}` : `/reservations/${bookingId}`
    apiFetch<unknown>(detailUrl)
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
  }, [bookingId, adminMode])

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
      const cancelUrl = adminMode ? `/admin/reservations/${bookingId}/cancel` : `/reservations/${bookingId}/cancel`
      const detailUrl = adminMode ? `/admin/reservations/${bookingId}` : `/reservations/${bookingId}`
      await apiFetch(cancelUrl, { method: 'POST', body: '{}' })
      const d = await apiFetch<unknown>(detailUrl)
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* A. Thông tin đặt bàn */}
          <DetailModal.Card title="Thông tin đặt bàn">
            <DetailModal.Row label="Mã đặt bàn" value={`#${data.id}`} />
            <DetailModal.Row label="Tên khách hàng" value={data.fullName} />
            <DetailModal.Row label="Số điện thoại" value={data.phone} />
            <DetailModal.Row label="Ngày đặt" value={data.date} />
            <DetailModal.Row label="Giờ đặt" value={data.time} />
            <DetailModal.Row label="Số lượng khách" value={`${data.guestCount} khách`} />
            <DetailModal.Row 
              label="Thời gian tạo đơn" 
              value={data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : '—'} 
            />
            <DetailModal.Row 
              label="Trạng thái" 
              value={<StatusBadge status={String(data.status || '')} label={getStatusLabel(String(data.status || ''), 'reservation')} />} 
            />
            <DetailModal.Row label="Ghi chú" value={data.note || 'Không có ghi chú'} />
          </DetailModal.Card>

          {/* C. Thông tin bàn được gán */}
          <DetailModal.Card title="Thông tin bàn gán">
            {data.assignedTables && data.assignedTables.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {data.assignedTables.map((t) => (
                  <div key={t.id} style={{ border: '1px solid #eae5de', borderRadius: '8px', padding: '12px', background: '#faf8f5', minWidth: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ color: '#2c1e16' }}>{t.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#7a7069' }}>{tableStatusVi(t.status)}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>
                      Khu vực: <strong>{t.zone || 'Chung'}</strong><br/>
                      Sức chứa: <strong>{t.capacity} chỗ</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : data.tables?.length ? (
              <p style={{ margin: 0 }}>Bàn đã gán: <strong>{data.tables.join(', ')}</strong></p>
            ) : data.assignedTableId ? (
              <p style={{ margin: 0 }}>Bàn đã gán (mã): <strong>#{data.assignedTableId}</strong></p>
            ) : (
              <p style={{ margin: 0, color: '#9e9080' }}>Chưa gán bàn</p>
            )}
          </DetailModal.Card>

          {/* B. Danh sách món đã gọi (nếu có) */}
          <DetailModal.Card title="Danh sách món đã gọi">
            {data.orderItems && data.orderItems.length > 0 ? (
              <DetailModal.Table>
                <thead>
                  <tr>
                    <th>Tên món</th>
                    <th style={{ textAlign: 'center' }}>SL</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orderItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: '#2c1e16' }}>{item.foodName}</div>
                        {item.note ? <div style={{ fontSize: '0.85rem', color: '#7a7069' }}>Ghi chú: {item.note}</div> : null}
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{item.price.toLocaleString('vi-VN')} ₫</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{(item.price * item.quantity).toLocaleString('vi-VN')} ₫</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Tổng tiền món:</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#b8935a' }}>
                      {data.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                </tbody>
              </DetailModal.Table>
            ) : (
              <p style={{ margin: 0, color: '#9e9080' }}>Chưa gọi món</p>
            )}
          </DetailModal.Card>

          {data.tableOrderToken ? (
            <DetailModal.Card title="Gọi món tại bàn">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                <p style={{ margin: 0, textAlign: 'center', color: '#555', fontSize: '0.95rem' }}>
                  Quét mã QR hoặc bấm vào link dưới đây để gọi món trực tiếp từ điện thoại tại bàn:
                </p>
                {data.tableOrderQrSvg ? (
                  <div 
                    style={{ 
                      background: '#fff', 
                      padding: '12px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      border: '1px solid #eae5de',
                      display: 'inline-flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    dangerouslySetInnerHTML={{ __html: data.tableOrderQrSvg }}
                  />
                ) : null}
                <Link 
                  to={`/order/table/${encodeURIComponent(data.tableOrderToken)}`} 
                  className="nav__link nav__cta"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 8, 
                    height: 40, 
                    padding: '0 24px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    borderRadius: '8px'
                  }}
                >
                  Bắt đầu gọi món →
                </Link>
              </div>
            </DetailModal.Card>
          ) : null}
        </div>
      ) : null}
    </>
  )

  const cancelAction = data && ['PENDING', 'HOLD'].includes(String(data.status || '').toUpperCase()) ? (
    <button type="button" className="nav__link nav__cta" disabled={cancelling} onClick={() => void cancel()}>
      {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
    </button>
  ) : null

  if (variant === 'modal') {
    return (
      <DetailModal
        isOpen={true}
        onClose={onClose || (() => {})}
        title={`Chi tiết đơn · mã #${bookingId}`}
        subtitle={data?.date ? `Ngày ${data.date}` : undefined}
        footerActions={
          <>
            <button type="button" className="nav__link" onClick={onClose}>Đóng</button>
            {cancelAction}
          </>
        }
      >
        {body}
      </DetailModal>
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
