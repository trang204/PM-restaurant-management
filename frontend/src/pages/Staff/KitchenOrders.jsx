import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import './KitchenOrders.css'

function formatPrice(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return `${x.toLocaleString('vi-VN')} ₫`
}

export default function KitchenOrders() {
  const { confirm } = useNotifications()
  const { pathname } = useLocation()
  const base = pathname.startsWith('/admin') ? '/admin' : '/staff'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(null) // item id | -1 ack-all | -2 confirm pay

  const load = useCallback(() => {
    setLoading(true)
    apiFetch('/admin/kitchen/orders')
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const t = window.setInterval(load, 12000)
    return () => window.clearInterval(t)
  }, [load])

  async function openDetail(orderId) {
    setErr(null)
    setBusy(null)
    try {
      const d = await apiFetch(`/admin/kitchen/orders/${orderId}`)
      setDetail(d)
    } catch (e) {
      setErr(e.message)
    }
  }

  async function ackLine(itemId) {
    const oid = detail?.order_id
    setBusy(itemId)
    setErr(null)
    try {
      await apiFetch(`/admin/kitchen/order-items/${itemId}/ack`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      if (oid != null) await openDetail(oid)
      load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function ackAll(orderId) {
    setBusy(-1)
    setErr(null)
    try {
      await apiFetch(`/admin/kitchen/orders/${orderId}/ack-all`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      await openDetail(orderId)
      load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  async function confirmPayment(orderId) {
    const okPay = await confirm({
      title: 'Xác nhận thanh toán',
      message:
        'Xác nhận đã thu đủ tiền? Hệ thống sẽ đóng phiên bàn, hoàn tất đặt bàn và trả bàn về trạng thái trống.',
      confirmLabel: 'Đã thu tiền',
    })
    if (!okPay) return
    setBusy(-2)
    setErr(null)
    try {
      await apiFetch(`/admin/kitchen/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setDetail(null)
      load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(null)
    }
  }

  const payMethodVi = (m) => {
    const u = String(m || '').toLowerCase()
    if (u === 'cash') return 'Tiền mặt'
    if (u === 'bank_transfer') return 'Chuyển khoản'
    return m || '—'
  }

  const stVi = (s) => {
    const u = String(s || '').toUpperCase()
    if (u === 'PENDING') return 'Chờ gửi'
    if (u === 'SERVING') return 'Đang phục vụ'
    return s || '—'
  }

  return (
    <div className="kitchen">
      <header className="kitchen__head">
        <div>
          <h1 className="kitchen__title">Bếp &amp; gọi món</h1>
          <p className="kitchen__sub">
            Theo dõi đơn theo bàn, xác nhận món lên bếp và xác nhận đã thu tiền khi khách tạo yêu cầu thanh toán. Thông báo ở
            icon chuông trên thanh menu.
          </p>
        </div>
        <button type="button" className="kitchen__refresh" onClick={load}>
          Làm mới
        </button>
      </header>

      {err ? <p className="kitchen__err">{err}</p> : null}
      {loading && rows.length === 0 ? <p>Đang tải…</p> : null}

      <div className="kitchen__grid">
        <section className="kitchen__card">
          <h2 className="kitchen__h2">Đơn đang mở</h2>
          {rows.length === 0 && !loading ? (
            <p className="kitchen__empty">Chưa có đơn gọi món từ bàn nào.</p>
          ) : (
            <ul className="kitchen__list">
              {rows.map((r) => (
                <li key={r.order_id}>
                  <button
                    type="button"
                    className={`kitchen__row${detail?.order_id === r.order_id ? ' kitchen__row--active' : ''}`}
                    onClick={() => openDetail(r.order_id)}
                  >
                    <div>
                      <strong>{r.table_name || `Bàn #${r.table_id}`}</strong>
                      <span className="kitchen__meta">
                        Đơn #{r.order_id} · {stVi(r.order_status)}
                      </span>
                    </div>
                    <div className="kitchen__badges">
                      {r.has_unpaid_payment ? (
                        <span className="kitchen__pill kitchen__pill--pay">Chờ thu tiền</span>
                      ) : null}
                      {r.pending_kitchen > 0 ? (
                        <span className="kitchen__pill kitchen__pill--warn">{r.pending_kitchen} chờ xác nhận</span>
                      ) : (
                        <span className="kitchen__pill kitchen__pill--ok">Đã xử lý dòng</span>
                      )}
                      <span className="kitchen__pill">{r.line_count} dòng</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kitchen__card kitchen__detail">
          <h2 className="kitchen__h2">Chi tiết đơn</h2>
          {!detail ? (
            <p className="kitchen__hint">Chọn một đơn bên trái để xem món và xác nhận.</p>
          ) : (
            <>
              <div className="kitchen__detailHead">
                <div>
                  <strong>{detail.table_name || 'Bàn'}</strong>
                  <span className="kitchen__meta">
                    Đơn #{detail.order_id} · {stVi(detail.order_status)}
                  </span>
                </div>
                <button
                  type="button"
                  className="kitchen__btn kitchen__btn--ghost"
                  disabled={busy === -1}
                  onClick={() => ackAll(detail.order_id)}
                >
                  {busy === -1 ? 'Đang xử lý…' : 'Xác nhận tất cả còn lại'}
                </button>
              </div>
              <div className="kitchen__tableWrap">
                <table className="kitchen__table">
                  <thead>
                    <tr>
                      <th>Món</th>
                      <th>SL</th>
                      <th>Đơn giá</th>
                      <th>Trạng thái bếp</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((it) => {
                      const ack = String(it.kitchen_status || '').toUpperCase() === 'ACKNOWLEDGED'
                      return (
                        <tr key={it.id}>
                          <td>{it.food_name || `Món #${it.food_id}`}</td>
                          <td>{it.quantity}</td>
                          <td>{formatPrice(it.price)}</td>
                          <td>
                            {ack ? (
                              <span className="kitchen__pill kitchen__pill--ok">Đã nhận lên</span>
                            ) : (
                              <span className="kitchen__pill kitchen__pill--warn">Chưa xác nhận</span>
                            )}
                          </td>
                          <td>
                            {!ack ? (
                              <button
                                type="button"
                                className="kitchen__btn kitchen__btn--primary"
                                disabled={busy === it.id}
                                onClick={() => ackLine(it.id)}
                              >
                                {busy === it.id ? '…' : 'Đã nhận'}
                              </button>
                            ) : (
                              <span className="kitchen__muted">
                                {it.kitchen_ack_at
                                  ? new Date(it.kitchen_ack_at).toLocaleTimeString('vi-VN')
                                  : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="kitchen__pay">
                <h3 className="kitchen__h3">Thanh toán</h3>
                {!detail.payment ? (
                  <p className="kitchen__muted">Khách chưa tạo yêu cầu thanh toán trên điện thoại.</p>
                ) : String(detail.payment.status || '').toUpperCase() === 'PAID' ? (
                  <div className="kitchen__payBox kitchen__payBox--done">
                    <p>
                      <strong>Đã thu tiền</strong> — {payMethodVi(detail.payment.method)} ·{' '}
                      {formatPrice(detail.payment.amount)}
                    </p>
                    {detail.payment.paid_at ? (
                      <p className="kitchen__muted">
                        Lúc {new Date(detail.payment.paid_at).toLocaleString('vi-VN')}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="kitchen__payBox">
                    <p>
                      <strong>Chờ thu</strong> — {payMethodVi(detail.payment.method)} ·{' '}
                      {formatPrice(detail.payment.amount)}
                    </p>
                    <button
                      type="button"
                      className="kitchen__btn kitchen__btn--primary"
                      disabled={busy === -2}
                      onClick={() => confirmPayment(detail.order_id)}
                    >
                      {busy === -2 ? 'Đang xử lý…' : 'Xác nhận đã thu tiền'}
                    </button>
                  </div>
                )}
              </div>

              <p className="kitchen__foot">
                <a className="kitchen__link" href={`${window.location.origin}/order/table/${encodeURIComponent(detail.qr_token)}`} target="_blank" rel="noreferrer">
                  Mở trang gọi món khách (xem trước)
                </a>
                <span className="kitchen__muted"> · </span>
                <span className="kitchen__muted">Quay lại {base === '/admin' ? 'Admin' : 'Nhân viên'} từ menu.</span>
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
