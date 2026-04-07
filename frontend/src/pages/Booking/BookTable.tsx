import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'

type Table = { id: string; name: string; capacity: number; status: string; zone?: string }
type MenuRow = { id: string; name: string; price: number; categoryName?: string }

export default function BookTable() {
  const navigate = useNavigate()
  const [tables, setTables] = useState<Table[]>([])
  const [menu, setMenu] = useState<MenuRow[]>([])
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('18:30')
  const [guestCount, setGuestCount] = useState(2)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [qtyByMenuId, setQtyByMenuId] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let c = false
    Promise.all([apiFetch<Table[]>('/tables'), apiFetch<MenuRow[]>('/menu')])
      .then(([t, m]) => {
        if (c) return
        setTables(Array.isArray(t) ? t : [])
        setMenu(Array.isArray(m) ? m.filter((x) => x.id) : [])
      })
      .catch(() => {})
    return () => {
      c = true
    }
  }, [])

  const preorderItems = useMemo(() => {
    return Object.entries(qtyByMenuId)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
  }, [qtyByMenuId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body = {
        fullName,
        phone,
        date,
        time,
        guestCount,
        preorderItems,
      }
      const created = await apiFetch<{ id: string }>('/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const id = created?.id
      if (!id) throw new Error('Thiếu mã đơn')
      if (selectedTableId) {
        try {
          await apiFetch(`/reservations/${id}/hold`, {
            method: 'POST',
            body: JSON.stringify({ tableId: selectedTableId }),
          })
        } catch {
          /* giữ đơn dù giữ bàn lỗi */
        }
      }
      navigate(`/reservations/${id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function setQty(id: string, q: number) {
    setQtyByMenuId((prev) => ({ ...prev, [id]: Math.max(0, q) }))
  }

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Đặt bàn trực tuyến</h1>
          <p className="menuHero__subtitle">Gửi đơn qua API · có thể chọn bàn và gọi món trước (tuỳ chọn).</p>
        </div>
      </header>

      <section className="menuSection" style={{ textAlign: 'left', maxWidth: 720, margin: '0 auto' }}>
        <form onSubmit={onSubmit}>
          <h2 className="menuSection__title" style={{ fontSize: '1.1rem' }}>
            Thông tin liên hệ
          </h2>
          <label style={{ display: 'block', marginBottom: 10 }}>
            Họ tên *
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 10 }}>
            Điện thoại *
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              Ngày *
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }}
              />
            </label>
            <label>
              Giờ *
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }}
              />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 10 }}>
            Số khách *
            <input
              type="number"
              min={1}
              required
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }}
            />
          </label>

          <h2 className="menuSection__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Chọn bàn (tuỳ chọn)
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="nav__link"
              style={{ opacity: selectedTableId === null ? 1 : 0.7 }}
              onClick={() => setSelectedTableId(null)}
            >
              Không chọn
            </button>
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                className="nav__link nav__cta"
                style={{ opacity: selectedTableId === t.id ? 1 : 0.75 }}
                onClick={() => setSelectedTableId(t.id)}
              >
                {t.name} · {t.capacity} chỗ · {t.status}
              </button>
            ))}
          </div>

          <h2 className="menuSection__title" style={{ fontSize: '1.1rem', marginTop: 24 }}>
            Gọi món trước (tuỳ chọn)
          </h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {menu.slice(0, 12).map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <span>
                  {m.name}{' '}
                  <small style={{ opacity: 0.75 }}>({m.price.toLocaleString('vi-VN')} ₫)</small>
                </span>
                <input
                  type="number"
                  min={0}
                  value={qtyByMenuId[m.id] ?? 0}
                  onChange={(e) => setQty(m.id, Number(e.target.value))}
                  style={{ width: 72, padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
            ))}
          </div>

          {error ? <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p> : null}
          <button className="nav__link nav__cta" type="submit" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Đang gửi...' : 'Xác nhận đặt bàn'}
          </button>
        </form>
      </section>
    </main>
  )
}
