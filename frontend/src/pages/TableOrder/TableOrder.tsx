import { useCallback, useEffect, useState } from 'react'
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
}

type Ctx = {
  tableName: string
  order: { id: number; status: string }
  items: OrderItem[]
  menu: MenuItem[]
  restaurant: { name?: string | null; logoUrl?: string | null; address?: string | null; phone?: string | null }
  orderUrl: string
}

export default function TableOrder() {
  const { token } = useParams()
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<number | null>(null)

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

  async function addToCart(foodId: number) {
    if (!token) return
    setAdding(foodId)
    setErr(null)
    try {
      await publicApiFetch(`/table-session/${encodeURIComponent(token)}/items`, {
        method: 'POST',
        body: JSON.stringify({ food_id: foodId, quantity: 1 }),
      })
      await load()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setAdding(null)
    }
  }

  const total =
    ctx?.items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0) ?? 0

  return (
    <main className="table-order">
      <header className="table-order__hero">
        <div>
          <p className="table-order__eyebrow">{ctx?.restaurant?.name || 'Luxeat'}</p>
          <h1 className="table-order__title">Gọi món tại bàn</h1>
          {ctx ? (
            <p className="table-order__meta">
              <strong>{ctx.tableName}</strong> · Đơn #{ctx.order.id} · {ctx.order.status}
            </p>
          ) : null}
        </div>
        <Link to="/" className="table-order__home">
          Về trang chủ
        </Link>
      </header>

      {loading ? <p className="table-order__msg">Đang tải...</p> : null}
      {err ? <p className="table-order__err">{err}</p> : null}

      {ctx ? (
        <div className="table-order__layout">
          <section className="table-order__menu" aria-label="Thực đơn">
            <h2 className="table-order__h2">Chọn món</h2>
            <div className="table-order__grid">
              {ctx.menu.map((m) => (
                <article key={String(m.id)} className="table-order__card">
                  <div
                    className="table-order__img"
                    style={
                      m.image_url
                        ? { backgroundImage: `url(${mediaUrl(m.image_url)})` }
                        : undefined
                    }
                  />
                  <div className="table-order__card-body">
                    <p className="table-order__cat">{m.category_name || 'Món'}</p>
                    <h3 className="table-order__name">{m.name}</h3>
                    <p className="table-order__price">
                      {Number(m.price).toLocaleString('vi-VN')} ₫
                    </p>
                    <button
                      type="button"
                      className="table-order__add"
                      disabled={adding === Number(m.id) || !['PENDING', 'SERVING'].includes(ctx.order.status)}
                      onClick={() => addToCart(Number(m.id))}
                    >
                      {adding === Number(m.id) ? 'Đang thêm...' : 'Thêm'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="table-order__cart" aria-label="Giỏ gọi món">
            <h2 className="table-order__h2">Đơn của bạn</h2>
            {ctx.items.length === 0 ? (
              <p className="table-order__empty">Chưa có món. Chọn món bên trái.</p>
            ) : (
              <ul className="table-order__items">
                {ctx.items.map((i) => (
                  <li key={i.id} className="table-order__line">
                    <span>{i.food_name || `Món #${i.food_id}`}</span>
                    <span>
                      ×{i.quantity} · {(Number(i.price) * i.quantity).toLocaleString('vi-VN')} ₫
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="table-order__total">
              Tạm tính: <strong>{total.toLocaleString('vi-VN')} ₫</strong>
            </p>
            <p className="table-order__hint">
              Nhân viên sẽ xác nhận và thanh toán tại quầy. Giữ trang này để thêm món.
            </p>
          </aside>
        </div>
      ) : null}
    </main>
  )
}
