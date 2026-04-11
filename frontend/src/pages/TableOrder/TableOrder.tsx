import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mediaUrl, publicApiFetch } from '../../lib/api'
import './TableOrder.css'

type MenuItem = {
  id: string | number
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  category_name?: string | null
}

type OrderItem = {
  id: number
  food_id: number
  quantity: number
  price: string | number
  food_name?: string | null
  kitchen_status?: string | null
  kitchen_ack_at?: string | null
  order_id?: number
  order_status?: string | null
}

type Ctx = {
  tableName: string
  order: { id: number; status: string }
  items: OrderItem[]
  menu: MenuItem[]
  restaurant: { name?: string | null; logoUrl?: string | null; address?: string | null; phone?: string | null }
  orderUrl: string
}

type PaymentRow = {
  id: number
  order_id: number
  amount: string | number
  method: string | null
  status: string | null
  paid_at?: string | null
}

type PaymentCtx = {
  orderId: number
  total: number
  payment: PaymentRow | null
  qrUrl?: string | null
  bankAccount?: string | null
  bankCode?: string | null
  transferContent?: string | null
}

const STATUS_VI: Record<string, string> = {
  PENDING: 'Đang chờ bếp',
  SERVING: 'Đang phục vụ',
  DONE: 'Đã xong',
  CANCELLED: 'Đã hủy',
}

function formatPrice(n: number) {
  return `${n.toLocaleString('vi-VN')} ₫`
}

export default function TableOrder() {
  const { token } = useParams()
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<number | null>(null)
  const [itemBusy, setItemBusy] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer'>('cash')
  const [paymentCtx, setPaymentCtx] = useState<PaymentCtx | null>(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    publicApiFetch<Ctx>(`/table-session/${encodeURIComponent(token)}`)
      .then(setCtx)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [cartOpen])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  // Luôn cho phép gọi thêm khi session còn active
  const canOrder = ctx !== null

  const categories = useMemo(() => {
    if (!ctx?.menu.length) return [] as string[]
    const s = new Set<string>()
    for (const m of ctx.menu) {
      const c = (m.category_name || 'Khác').trim()
      if (c) s.add(c)
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [ctx?.menu])

  const itemsByFoodId = useMemo(() => {
    const map = new Map<number, OrderItem>()
    if (!ctx?.items) return map
    for (const i of ctx.items) map.set(Number(i.food_id), i)
    return map
  }, [ctx?.items])

  const filteredMenu = useMemo(() => {
    if (!ctx?.menu) return []
    const q = search.trim().toLowerCase()
    return ctx.menu.filter((m) => {
      const cname = (m.category_name || 'Khác').trim()
      if (cat !== 'all' && cname !== cat) return false
      if (!q) return true
      const name = String(m.name || '').toLowerCase()
      const desc = String(m.description || '').toLowerCase()
      return name.includes(q) || desc.includes(q)
    })
  }, [ctx?.menu, search, cat])

  const total = useMemo(
    () => ctx?.items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0) ?? 0,
    [ctx?.items],
  )

  const totalQty = useMemo(() => ctx?.items.reduce((s, i) => s + Number(i.quantity), 0) ?? 0, [ctx?.items])

  const loadPayment = useCallback(async () => {
    if (!token) return
    try {
      const d = await publicApiFetch<PaymentCtx>(`/table-session/${encodeURIComponent(token)}/payment`)
      setPaymentCtx(d)
    } catch {
      setPaymentCtx(null)
    }
  }, [token])

  useEffect(() => {
    if (!ctx) return
    loadPayment()
  }, [ctx?.order?.id])

  async function addToCart(foodId: number, qty = 1) {
    if (!token) return
    setAdding(foodId)
    setErr(null)
    try {
      await publicApiFetch(`/table-session/${encodeURIComponent(token)}/items`, {
        method: 'POST',
        body: JSON.stringify({ food_id: foodId, quantity: qty }),
      })
      await load()
      await loadPayment()
      showToast('Đã thêm vào đơn')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setAdding(null)
    }
  }

  async function setLineQty(itemId: number, quantity: number) {
    if (!token) return
    if (quantity < 1) return
    setItemBusy(itemId)
    setErr(null)
    try {
      await publicApiFetch(`/table-session/${encodeURIComponent(token)}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      })
      await load()
      await loadPayment()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setItemBusy(null)
    }
  }

  async function removeLine(itemId: number) {
    if (!token) return
    setItemBusy(itemId)
    setErr(null)
    try {
      await publicApiFetch(`/table-session/${encodeURIComponent(token)}/items/${itemId}`, {
        method: 'DELETE',
      })
      await load()
      await loadPayment()
      showToast('Đã xóa món')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setItemBusy(null)
    }
  }

  function callStaff() {
    const phone = ctx?.restaurant?.phone?.replace(/\s/g, '') || ''
    if (phone) {
      window.location.href = `tel:${phone}`
      return
    }
    showToast('Nhà hàng chưa cập nhật số điện thoại')
  }

  const statusKey = ctx ? String(ctx.order.status || '').toUpperCase() : ''
  const statusLabel = STATUS_VI[statusKey] || ctx?.order.status || '—'

  async function submit() {
    if (!token || !ctx) return
    if (!ctx.items.length) {
      showToast('Bạn chưa chọn món')
      return
    }
    setSubmitting(true)
    setErr(null)
    try {
      await publicApiFetch(`/table-session/${encodeURIComponent(token)}/submit`, { method: 'POST', body: '{}' })
      await load()
      await loadPayment()
      showToast('Đã xác nhận đặt món — nhân viên đã nhận đơn')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function createPay() {
    if (!token || !ctx) return
    if (!ctx.items.length) {
      showToast('Bạn chưa chọn món')
      return
    }
    setPaying(true)
    setErr(null)
    try {
      const d = await publicApiFetch<PaymentCtx>(`/table-session/${encodeURIComponent(token)}/payment`, {
        method: 'POST',
        body: JSON.stringify({ method: payMethod }),
      })
      setPaymentCtx(d)
      showToast('Đã tạo yêu cầu thanh toán')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setPaying(false)
    }
  }

  /** Chỉ nút "Xác nhận gọi món" — hiện trong giỏ hàng */
  function renderConfirmBtn() {
    // null/undefined order_status → coi là PENDING (item chưa được xác nhận)
    const hasPending = ctx?.items.some(i => {
      const s = String(i.order_status ?? 'PENDING').toUpperCase()
      return s === 'PENDING'
    })
    if (!hasPending) return null
    return (
      <button
        type="button"
        className="tableOrder__btn tableOrder__btn--accent tableOrder__btn--full"
        disabled={submitting}
        onClick={submit}
      >
        {submitting ? 'Đang xác nhận…' : 'Xác nhận gọi món'}
      </button>
    )
  }

  /** Section thanh toán riêng — hiện bên dưới layout */
  function renderPayPanel() {
    const hasItems = (ctx?.items.length ?? 0) > 0
    if (!hasItems) return null
    return (
      <section className="tableOrder__payPanel" aria-label="Thanh toán">
        <div className="tableOrder__payPanelInner">
          <h2 className="tableOrder__payPanelTitle">Thanh toán</h2>
          <div className="tableOrder__payPanelBody">
            {/* Chọn phương thức + nút yêu cầu */}
            <div className="tableOrder__payPanelLeft">
              <p className="tableOrder__payPanelSub">Tổng tạm tính: <strong className="tableOrder__payAmount">{formatPrice(total)}</strong></p>
              <div className="tableOrder__payRow">
                <label className="tableOrder__radio">
                  <input type="radio" checked={payMethod === 'cash'} onChange={() => setPayMethod('cash')} /> Tiền mặt
                </label>
                <label className="tableOrder__radio">
                  <input
                    type="radio"
                    checked={payMethod === 'bank_transfer'}
                    onChange={() => setPayMethod('bank_transfer')}
                  />{' '}
                  Chuyển khoản
                </label>
              </div>
              <button
                type="button"
                className="tableOrder__btn tableOrder__btn--outline tableOrder__btn--full"
                disabled={paying}
                onClick={createPay}
              >
                {paying ? 'Đang tạo…' : 'Yêu cầu thanh toán'}
              </button>

              {paymentCtx?.payment ? (
                <div className="tableOrder__payMeta">
                  <span>
                    Trạng thái:{' '}
                    <strong className={String(paymentCtx.payment.status || '').toUpperCase() === 'PAID' ? 'tableOrder__payPaid' : 'tableOrder__payUnpaid'}>
                      {String(paymentCtx.payment.status || '').toUpperCase() === 'PAID' ? 'Đã thanh toán ✓' : 'Chờ xác nhận'}
                    </strong>
                  </span>
                  <span>
                    Phương thức:{' '}
                    <strong>
                      {paymentCtx.payment.method === 'bank_transfer' ? 'Chuyển khoản' : paymentCtx.payment.method === 'cash' ? 'Tiền mặt' : '—'}
                    </strong>
                  </span>
                  <span>
                    Số tiền: <strong className="tableOrder__payAmount">{formatPrice(Number(paymentCtx.total || total))}</strong>
                  </span>
                  {String(paymentCtx.payment.status || '').toUpperCase() !== 'PAID' &&
                   paymentCtx.payment.method !== 'bank_transfer' ? (
                    <p className="tableOrder__payNotify">
                      Yêu cầu đã gửi tới nhân viên. Quý khách vui lòng chờ xác nhận.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="tableOrder__legal">Chọn phương thức rồi nhấn "Yêu cầu thanh toán". Nhân viên sẽ xác nhận.</p>
              )}
            </div>

            {/* QR chuyển khoản */}
            {paymentCtx?.qrUrl && paymentCtx?.payment?.method === 'bank_transfer' ? (
              <div className="tableOrder__payPanelRight">
                <div className="tableOrder__qrSection">
                  <p className="tableOrder__qrLabel">Quét mã QR để chuyển khoản</p>
                  <div className="tableOrder__qrImgWrap">
                    <img
                      src={paymentCtx.qrUrl}
                      alt="QR chuyển khoản"
                      className="tableOrder__qrImg"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                  {paymentCtx.bankCode ? (
                    <div className="tableOrder__qrBankRow">
                      <img
                        src={`https://qr.sepay.vn/assets/img/banklogo/${paymentCtx.bankCode}.png`}
                        alt={paymentCtx.bankCode}
                        className="tableOrder__qrBankLogo"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="tableOrder__qrBankCode">{paymentCtx.bankCode}</span>
                    </div>
                  ) : null}
                  {paymentCtx.bankAccount ? (
                    <div className="tableOrder__qrInfoRow">
                      <span className="tableOrder__qrInfoLabel">Số tài khoản</span>
                      <span className="tableOrder__qrInfoValue">{paymentCtx.bankAccount}</span>
                      <button
                        type="button"
                        className="tableOrder__qrCopy"
                        onClick={() => navigator.clipboard.writeText(paymentCtx.bankAccount!).then(() => showToast('Đã sao chép STK'))}
                        title="Sao chép"
                      >⎘</button>
                    </div>
                  ) : null}
                  {paymentCtx.total > 0 ? (
                    <div className="tableOrder__qrInfoRow">
                      <span className="tableOrder__qrInfoLabel">Số tiền</span>
                      <span className="tableOrder__qrInfoValue tableOrder__payAmount">{formatPrice(Number(paymentCtx.total))}</span>
                    </div>
                  ) : null}
                  {paymentCtx.transferContent ? (
                    <div className="tableOrder__qrInfoRow">
                      <span className="tableOrder__qrInfoLabel">Nội dung CK</span>
                      <span className="tableOrder__qrInfoValue">{paymentCtx.transferContent}</span>
                      <button
                        type="button"
                        className="tableOrder__qrCopy"
                        onClick={() => navigator.clipboard.writeText(paymentCtx.transferContent!).then(() => showToast('Đã sao chép nội dung'))}
                        title="Sao chép"
                      >⎘</button>
                    </div>
                  ) : null}
                  <p className="tableOrder__payNotify" style={{ textAlign: 'center', marginTop: 4 }}>
                    Sau khi chuyển khoản, nhân viên sẽ xác nhận thanh toán cho bạn.
                  </p>
                  <a
                    href={paymentCtx.qrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tableOrder__qrOpenLink"
                  >
                    Mở QR trong tab mới ↗
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="tableOrder">
      <div className={`tableOrder__toast${toast ? ' tableOrder__toast--on' : ''}`} role="status">
        {toast}
      </div>

      <header className="tableOrder__hero">
        <div className="tableOrder__heroInner">
          <div className="tableOrder__brand">
            {ctx?.restaurant?.logoUrl ? (
              <img
                className="tableOrder__logo"
                src={mediaUrl(ctx.restaurant.logoUrl)}
                alt=""
                width={56}
                height={56}
              />
            ) : (
              <div className="tableOrder__logoFallback" aria-hidden />
            )}
            <div>
              <p className="tableOrder__eyebrow">{ctx?.restaurant?.name || 'Nhà hàng'}</p>
              <h1 className="tableOrder__title">Gọi món tại bàn</h1>
              {ctx ? (
                <div className="tableOrder__chipsRow">
                  <span className="tableOrder__chip tableOrder__chip--table">
                    <span className="tableOrder__chipIcon" aria-hidden>
                      ◈
                    </span>
                    {ctx.tableName}
                  </span>
                  <span className={`tableOrder__chip tableOrder__chip--status tableOrder__chip--${statusKey.toLowerCase()}`}>
                    {statusLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="tableOrder__heroActions">
            <button type="button" className="tableOrder__btn tableOrder__btn--ghost" onClick={() => load()} disabled={loading}>
              {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
            <button type="button" className="tableOrder__btn tableOrder__btn--accent" onClick={callStaff}>
              Gọi nhân viên
            </button>
            <Link to="/" className="tableOrder__btn tableOrder__btn--ghost">
              Trang chủ
            </Link>
          </div>
        </div>
        {ctx?.restaurant?.address ? <p className="tableOrder__address">{ctx.restaurant.address}</p> : null}
      </header>

      {loading && !ctx ? (
        <div className="tableOrder__skeleton" aria-busy>
          <div className="tableOrder__skLine" />
          <div className="tableOrder__skGrid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="tableOrder__skCard" />
            ))}
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="tableOrder__banner tableOrder__banner--err" role="alert">
          {err}
        </div>
      ) : null}

      {!loading && !ctx && !err ? (
        <div className="tableOrder__banner tableOrder__banner--err">Không tải được phiên bàn. Kiểm tra link QR.</div>
      ) : null}

      {ctx ? (
        <>
          {statusKey === 'SERVING' && !ctx.items.some(i => String(i.order_status || '').toUpperCase() === 'PENDING') ? (
            <div className="tableOrder__banner tableOrder__banner--info">
              Đơn đang được phục vụ. Muốn gọi thêm? Chọn món bên dưới — sẽ tạo đợt gọi mới.
            </div>
          ) : !['PENDING', 'SERVING'].includes(statusKey) ? (
            <div className="tableOrder__banner tableOrder__banner--info">
              Đơn đã kết thúc (trạng thái: {statusLabel}). Cảm ơn quý khách!
            </div>
          ) : null}

          <div className="tableOrder__toolbar">
            <div className="tableOrder__searchWrap">
              <span className="tableOrder__searchIcon" aria-hidden>
                ⌕
              </span>
              <input
                className="tableOrder__search"
                type="search"
                placeholder="Tìm món, ví dụ: pizza, salad…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="tableOrder__cats" role="tablist" aria-label="Danh mục">
              <button
                type="button"
                role="tab"
                aria-selected={cat === 'all'}
                className={`tableOrder__cat ${cat === 'all' ? 'tableOrder__cat--on' : ''}`}
                onClick={() => setCat('all')}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={cat === c}
                  className={`tableOrder__cat ${cat === c ? 'tableOrder__cat--on' : ''}`}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="tableOrder__layout">
            <section className="tableOrder__menu" aria-label="Thực đơn">
              <div className="tableOrder__menuHead">
                <h2 className="tableOrder__h2">Thực đơn</h2>
                <span className="tableOrder__count">{filteredMenu.length} món</span>
              </div>
              {filteredMenu.length === 0 ? (
                <p className="tableOrder__empty">Không có món phù hợp. Thử đổi từ khóa hoặc danh mục.</p>
              ) : (
                <div className="tableOrder__grid">
                  {filteredMenu.map((m) => {
                    const fid = Number(m.id)
                    const inCart = itemsByFoodId.get(fid)
                    const busy = adding === fid
                    // item có trong giỏ và thuộc PENDING order → cho phép sửa số lượng trực tiếp
                    const inCartPending = inCart && String(inCart.order_status ?? 'PENDING').toUpperCase() !== 'SERVING'
                    return (
                      <article key={String(m.id)} className="tableOrder__card">
                        <div
                          className="tableOrder__img"
                          style={
                            m.image_url
                              ? { backgroundImage: `url(${mediaUrl(m.image_url)})` }
                              : undefined
                          }
                        />
                        <div className="tableOrder__cardBody">
                          <p className="tableOrder__catLabel">{m.category_name || 'Món'}</p>
                          <h3 className="tableOrder__name">{m.name}</h3>
                          {m.description ? <p className="tableOrder__desc">{m.description}</p> : null}
                          <div className="tableOrder__row">
                            <span className="tableOrder__price">{formatPrice(Number(m.price))}</span>
                            {inCartPending && canOrder ? (
                              /* Món trong Đợt PENDING: hiện số lượng + − + */
                              <div className="tableOrder__qtyInline">
                                <button
                                  type="button"
                                  className="tableOrder__iconBtn"
                                  disabled={itemBusy === inCart!.id || busy}
                                  aria-label="Giảm"
                                  onClick={() =>
                                    inCart!.quantity <= 1 ? removeLine(inCart!.id) : setLineQty(inCart!.id, inCart!.quantity - 1)
                                  }
                                >
                                  −
                                </button>
                                <span className="tableOrder__qtyNum">{inCart!.quantity}</span>
                                <button
                                  type="button"
                                  className="tableOrder__iconBtn"
                                  disabled={itemBusy === inCart!.id || busy}
                                  aria-label="Tăng"
                                  onClick={() => setLineQty(inCart!.id, inCart!.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              /* Món chưa gọi hoặc đã ở SERVING: nút "Thêm" / "Gọi thêm" → tạo Đợt mới */
                              <button
                                type="button"
                                className="tableOrder__add"
                                disabled={busy || !canOrder}
                                onClick={() => addToCart(fid, 1)}
                              >
                                {busy ? '…' : inCart ? 'Gọi thêm' : 'Thêm'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <aside className="tableOrder__cart" aria-label="Đơn của bạn">
              <div className="tableOrder__cartHead">
                <h2 className="tableOrder__h2">Đơn của bạn</h2>
              </div>
              {ctx.items.length === 0 ? (
                <div className="tableOrder__cartEmpty">
                  <p>Chưa có món nào.</p>
                  <p className="tableOrder__cartHint">Chọn món bên cạnh — nhân viên sẽ nhận đơn tại quầy.</p>
                </div>
              ) : (
                <>
                  {/* Group items theo từng đợt order */}
                  {Array.from(
                    ctx.items.reduce((map, i) => {
                      const key = i.order_id ?? ctx.order.id
                      if (!map.has(key)) map.set(key, { status: i.order_status ?? 'PENDING', items: [] })
                      map.get(key)!.items.push(i)
                      return map
                    }, new Map<number, { status: string; items: typeof ctx.items }>())
                  ).map(([orderId, group], idx) => {
                    const isPending = String(group.status).toUpperCase() !== 'SERVING'
                    return (
                      <div key={orderId}>
                        {idx > 0 || group.status !== 'PENDING' ? (
                          <div className="tableOrder__orderLabel">
                            {isPending ? `Đợt ${idx + 1} — Chưa xác nhận` : `Đợt ${idx + 1} — Đang phục vụ`}
                          </div>
                        ) : null}
                        <ul className="tableOrder__lines">
                          {group.items.map((i) => {
                            const line = Number(i.price) * i.quantity
                            const busy = itemBusy === i.id
                            return (
                              <li key={i.id} className="tableOrder__line">
                                <div className="tableOrder__lineMain">
                                  <span className="tableOrder__lineName">{i.food_name || `Món #${i.food_id}`}</span>
                                  <span className="tableOrder__lineSub">{formatPrice(Number(i.price))} / phần</span>
                                  {/* Chỉ hiện trạng thái bếp với đơn PENDING — SERVING đã được xử lý rồi */}
                                  {isPending ? (
                                    <span
                                      className={
                                        String(i.kitchen_status || '').toUpperCase() === 'ACKNOWLEDGED'
                                          ? 'tableOrder__kitchenOk'
                                          : 'tableOrder__kitchenWait'
                                      }
                                    >
                                      {String(i.kitchen_status || '').toUpperCase() === 'ACKNOWLEDGED'
                                        ? 'Bếp đã nhận'
                                        : 'Chờ bếp xác nhận'}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="tableOrder__lineActions">
                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        className="tableOrder__iconBtn tableOrder__iconBtn--sm"
                                        disabled={busy}
                                        aria-label="Giảm"
                                        onClick={() =>
                                          i.quantity <= 1 ? removeLine(i.id) : setLineQty(i.id, i.quantity - 1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span className="tableOrder__qtyNum">{i.quantity}</span>
                                      <button
                                        type="button"
                                        className="tableOrder__iconBtn tableOrder__iconBtn--sm"
                                        disabled={busy}
                                        aria-label="Tăng"
                                        onClick={() => setLineQty(i.id, i.quantity + 1)}
                                      >
                                        +
                                      </button>
                                    </>
                                  ) : (
                                    <span className="tableOrder__qtyNum">×{i.quantity}</span>
                                  )}
                                  <span className="tableOrder__lineTotal">{formatPrice(line)}</span>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </>
              )}
              <div className="tableOrder__cartFooter">
                <div className="tableOrder__totalRow">
                  <span>Tạm tính</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
                {renderConfirmBtn()}
              </div>
            </aside>
          </div>

          {renderPayPanel()}

          <div className="tableOrder__mobileBar">
            <button type="button" className="tableOrder__mobileBarBtn" onClick={() => setCartOpen(true)}>
              <span className="tableOrder__mobileBarLabel">Đơn của bạn</span>
              <span className="tableOrder__mobileBarMeta">
                {totalQty > 0 ? `${totalQty} món · ` : ''}
                {formatPrice(total)}
              </span>
            </button>
          </div>

          {cartOpen ? (
            <div className="tableOrder__drawerBack" role="presentation" onClick={() => setCartOpen(false)} />
          ) : null}
          <div className={`tableOrder__drawer${cartOpen ? ' tableOrder__drawer--open' : ''}`} aria-hidden={!cartOpen}>
            <div className="tableOrder__drawerHead">
              <h2 className="tableOrder__h2">Đơn của bạn</h2>
              <button type="button" className="tableOrder__drawerClose" onClick={() => setCartOpen(false)} aria-label="Đóng">
                ×
              </button>
            </div>
            <div className="tableOrder__drawerBody">
              {ctx.items.length === 0 ? (
                <p className="tableOrder__cartEmpty">Chưa có món.</p>
              ) : (
                <>
                  {Array.from(
                    ctx.items.reduce((map, i) => {
                      const key = i.order_id ?? ctx.order.id
                      if (!map.has(key)) map.set(key, { status: i.order_status ?? 'PENDING', items: [] })
                      map.get(key)!.items.push(i)
                      return map
                    }, new Map<number, { status: string; items: typeof ctx.items }>())
                  ).map(([orderId, group], idx) => {
                    const isPending = String(group.status).toUpperCase() !== 'SERVING'
                    return (
                      <div key={orderId}>
                        <div className="tableOrder__orderLabel">
                          {isPending ? `Đợt ${idx + 1} — Chưa xác nhận` : `Đợt ${idx + 1} — Đang phục vụ`}
                        </div>
                        <ul className="tableOrder__lines">
                          {group.items.map((i) => {
                            const line = Number(i.price) * i.quantity
                            const busy = itemBusy === i.id
                            return (
                              <li key={i.id} className="tableOrder__line">
                                <div className="tableOrder__lineMain">
                                  <span className="tableOrder__lineName">{i.food_name || `Món #${i.food_id}`}</span>
                                  <span className="tableOrder__lineSub">{formatPrice(Number(i.price))} / phần</span>
                                  {isPending ? (
                                    <span
                                      className={
                                        String(i.kitchen_status || '').toUpperCase() === 'ACKNOWLEDGED'
                                          ? 'tableOrder__kitchenOk'
                                          : 'tableOrder__kitchenWait'
                                      }
                                    >
                                      {String(i.kitchen_status || '').toUpperCase() === 'ACKNOWLEDGED'
                                        ? 'Bếp đã nhận'
                                        : 'Chờ bếp xác nhận'}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="tableOrder__lineActions">
                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        className="tableOrder__iconBtn tableOrder__iconBtn--sm"
                                        disabled={busy}
                                        onClick={() =>
                                          i.quantity <= 1 ? removeLine(i.id) : setLineQty(i.id, i.quantity - 1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span className="tableOrder__qtyNum">{i.quantity}</span>
                                      <button
                                        type="button"
                                        className="tableOrder__iconBtn tableOrder__iconBtn--sm"
                                        disabled={busy}
                                        onClick={() => setLineQty(i.id, i.quantity + 1)}
                                      >
                                        +
                                      </button>
                                    </>
                                  ) : (
                                    <span className="tableOrder__qtyNum">×{i.quantity}</span>
                                  )}
                                  <span className="tableOrder__lineTotal">{formatPrice(line)}</span>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
            <div className="tableOrder__drawerFoot">
              <div className="tableOrder__totalRow">
                <span>Tạm tính</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              {renderConfirmBtn()}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
