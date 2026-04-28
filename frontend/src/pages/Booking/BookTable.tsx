import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../../lib/api'
import { requiredMessage } from '../../lib/validation'
import './BookTable.css'

type Table = { id: string; name: string; capacity: number; status: string; zone?: string; image_url?: string }
type MenuRow = {
  id: string
  name: string
  price: number
  categoryName?: string
  category_name?: string
  image_url?: string
}

function menuCategory(m: MenuRow) {
  return m.categoryName || m.category_name || 'Món ăn'
}

function isTableSelectable(t: Table) {
  const s = String(t.status || '').toUpperCase()
  return s === 'AVAILABLE' || s === ''
}

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const tablePlaceholder =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5efe6"/><stop offset="100%" stop-color="#eadcca"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><text x="200" y="132" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#7b6450">Chưa có ảnh góc nhìn</text></svg>`,
  )

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
  const [preorderExpanded, setPreorderExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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

  const menuByCategory = useMemo(() => {
    const map = new Map<string, MenuRow[]>()
    for (const m of menu) {
      const k = menuCategory(m)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(m)
    }
    return map
  }, [menu])

  const preorderItems = useMemo(() => {
    return Object.entries(qtyByMenuId)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
  }, [qtyByMenuId])

  const preorderTotal = useMemo(() => {
    let sum = 0
    for (const m of menu) {
      const q = qtyByMenuId[m.id] ?? 0
      if (q > 0) sum += Number(m.price) * q
    }
    return sum
  }, [menu, qtyByMenuId])

  const selectedTable = tables.find((t) => t.id === selectedTableId)
  const autoSuggestedTable = useMemo(() => {
    // Gợi ý: chọn bàn nhỏ nhất nhưng đủ chỗ và đang AVAILABLE
    const cands = tables
      .filter(isTableSelectable)
      .filter((t) => Number(t.capacity) >= guestCount)
      .sort((a, b) => Number(a.capacity) - Number(b.capacity))
    return cands[0] || null
  }, [tables, guestCount])

  const effectivePreferredTableId =
    selectedTableId === null ? autoSuggestedTable?.id ?? null : selectedTableId

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const nextErrors: Record<string, string> = {}
    if (!fullName.trim()) nextErrors.fullName = requiredMessage('Họ và tên')
    if (!phone.trim()) nextErrors.phone = requiredMessage('Số điện thoại')
    if (!date) nextErrors.date = requiredMessage('Ngày')
    if (!time) nextErrors.time = requiredMessage('Giờ')
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setLoading(true)
    try {
      const body = {
        fullName,
        phone,
        date,
        time,
        guestCount,
        preorderItems,
        // Ưu tiên bàn: nếu user chọn cụ thể hoặc đang để Tự động có gợi ý theo số khách
        tableId: effectivePreferredTableId,
      }
      const created = await apiFetch<{ id: string }>('/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const id = created?.id
      if (!id) throw new Error('Thiếu mã đơn')
      if (effectivePreferredTableId) {
        try {
          await apiFetch(`/reservations/${id}/hold`, {
            method: 'POST',
            body: JSON.stringify({ tableId: effectivePreferredTableId }),
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

  function bumpGuest(delta: number) {
    setGuestCount((g) => Math.max(1, Math.min(20, g + delta)))
  }

  const preorderSummaryText = useMemo(() => {
    if (!preorderItems.length) return 'Chưa chọn món'
    const lines: string[] = []
    for (const { menuItemId, quantity } of preorderItems) {
      const m = menu.find((x) => x.id === menuItemId)
      if (m) lines.push(`${m.name} ×${quantity}`)
    }
    return lines.join('\n')
  }, [preorderItems, menu])

  return (
    <main className="bookPage">
      <header className="bookHero">
        <div className="bookHero__copy">
          <p className="bookHero__eyebrow">Đặt chỗ</p>
          <h1 className="bookHero__title">Trải nghiệm đặt bàn tinh chỉnh</h1>
          <p className="bookHero__lead">
            Chọn thời gian, ưu tiên bàn yêu thích và gợi ý món trước — nhà hàng sẽ xác nhận và chuẩn bị cho buổi
            gặp của bạn.
          </p>
          <div className="bookHero__chips">
            <span className="bookHero__chip">Xác nhận nhanh</span>
            <span className="bookHero__chip">Giữ bàn theo giờ</span>
            <span className="bookHero__chip">Gọi món trước tuỳ chọn</span>
          </div>
        </div>
        <div className="bookHero__panel" aria-hidden="false">
          <div className="bookHero__stat">
            <span className="bookHero__stat-label">Bàn đang mở</span>
            <span className="bookHero__stat-val">{tables.filter(isTableSelectable).length}</span>
          </div>
          <div className="bookHero__stat">
            <span className="bookHero__stat-label">Món trên thực đơn</span>
            <span className="bookHero__stat-val">{menu.length}</span>
          </div>
          <div className="bookHero__stat">
            <span className="bookHero__stat-label">Khung giờ đặt</span>
            <span className="bookHero__stat-val" style={{ fontSize: '1.05rem' }}>
              Hôm nay trở đi
            </span>
          </div>
        </div>
      </header>

      <div className="bookLayout">
        <form id="book-form" className="bookMain" onSubmit={onSubmit} noValidate>
          <section className="bookCard">
            <div className="bookCard__head">
              <span className="bookStep">1</span>
              <div className="bookCard__titles">
                <h2>Thông tin liên hệ</h2>
                <p>Để nhà hàng liên lạc xác nhận hoặc hỗ trợ thay đổi lịch.</p>
              </div>
            </div>
            <div className="bookGrid2">
              <label className="bookField">
                <span>Họ và tên *</span>
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, fullName: '' }))
                    setFullName(e.target.value)
                  }}
                  placeholder="Nguyễn Văn A"
                />
                {fieldErrors.fullName ? <small className="bookField__error">{fieldErrors.fullName}</small> : null}
              </label>
              <label className="bookField">
                <span>Số điện thoại *</span>
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, phone: '' }))
                    setPhone(e.target.value)
                  }}
                  placeholder="09xx xxx xxx"
                />
                {fieldErrors.phone ? <small className="bookField__error">{fieldErrors.phone}</small> : null}
              </label>
            </div>
          </section>

          <section className="bookCard">
            <div className="bookCard__head">
              <span className="bookStep">2</span>
              <div className="bookCard__titles">
                <h2>Thời gian &amp; số khách</h2>
                <p>Chọn ngày giờ đến và số người để sắp xếp bàn hợp lý.</p>
              </div>
            </div>
            <div className="bookGrid2">
              <label className="bookField">
                <span>Ngày *</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, date: '' }))
                    setDate(e.target.value)
                  }}
                />
                {fieldErrors.date ? <small className="bookField__error">{fieldErrors.date}</small> : null}
              </label>
              <label className="bookField">
                <span>Giờ *</span>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, time: '' }))
                    setTime(e.target.value)
                  }}
                />
                {fieldErrors.time ? <small className="bookField__error">{fieldErrors.time}</small> : null}
              </label>
            </div>
            <div style={{ marginTop: 16, marginLeft: 26, marginBottom: 16 }}>
              <label className="bookField bookField--guest">
                <span>Số khách *</span>
                <div className="bookQty" style={{ maxWidth: 160 }}>
                  <button type="button" onClick={() => bumpGuest(-1)} aria-label="Giảm">
                    −
                  </button>
                  <span>{guestCount}</span>
                  <button type="button" onClick={() => bumpGuest(1)} aria-label="Tăng">
                    +
                  </button>
                </div>
              </label>
            </div>
          </section>

          <section className="bookCard">
            <div className="bookCard__head">
              <span className="bookStep">3</span>
              <div className="bookCard__titles">
                <h2>Chọn bàn ưu tiên</h2>
                <p>Tuỳ chọn — có thể để nhà hàng bố trí nếu bạn chưa chọn.</p>
              </div>
            </div>
            <div className="bookTables">
              <button
                type="button"
                className={`bookTableBtn${selectedTableId === null ? ' bookTableBtn--active' : ''}`}
                onClick={() => setSelectedTableId(null)}
              >
                <span className="bookTableBtn__name">Tự động</span>
                <span className="bookTableBtn__meta">
                  {autoSuggestedTable
                    ? `Hệ thống gợi ý: ${autoSuggestedTable.name} (${autoSuggestedTable.capacity} chỗ)`
                    : 'Hệ thống chọn bàn phù hợp số khách'}
                </span>
                <span className="bookTableBtn__badge">Gợi ý</span>
              </button>
              {tables.map((t) => {
                const ok = isTableSelectable(t)
                const img = t.image_url ? mediaUrl(t.image_url) : tablePlaceholder
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!ok}
                    className={`bookTableBtn${selectedTableId === t.id ? ' bookTableBtn--active' : ''}`}
                    onClick={() => ok && setSelectedTableId(t.id)}
                  >
                    <span className="bookTableBtn__imageWrap" aria-hidden>
                      <img className="bookTableBtn__image" src={img} alt="" />
                    </span>
                    <span className="bookTableBtn__name">{t.name || `Bàn ${t.id}`}</span>
                    <span className="bookTableBtn__meta">{t.capacity} chỗ ngồi</span>
                    <span className="bookTableBtn__badge">{ok ? 'Còn trống' : t.status}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="bookCard bookCard--preorder">
            <div className="bookCard__head">
              <span className="bookStep">4</span>
              <div className="bookCard__titles">
                <h2>Gọi món trước</h2>
                <p>Tuỳ chọn — đặt số lượng sơ bộ, bếp sẽ ghi nhận khi bạn đến.</p>
              </div>
              <div className="bookCard__actions">
                <button
                  type="button"
                  className="bookPreorder__toggle"
                  onClick={() => setPreorderExpanded((v) => !v)}
                >
                  {preorderExpanded ? 'Thu gọn' : 'Xem menu đầy đủ'}
                </button>
              </div>
            </div>
            <div className={`bookPreorder${preorderExpanded ? ' bookPreorder--expanded' : ''}`}>
              {menu.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--book-muted)', fontSize: '0.9rem' }}>Đang tải thực đơn…</p>
              ) : (
                Array.from(menuByCategory.entries()).map(([cat, items]) => (
                  <div key={cat}>
                    <h3 className="bookPreorder__group-title">{cat}</h3>
                    {items.map((m) => {
                      const q = qtyByMenuId[m.id] ?? 0
                      const img = m.image_url ? mediaUrl(m.image_url) : ''
                      return (
                        <div key={m.id} className="bookPreorder__row">
                          {img ? (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: `url(${img}) center/cover`,
                                flexShrink: 0,
                                border: '1px solid var(--book-border)',
                              }}
                              aria-hidden
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: 'linear-gradient(145deg, #e8f2ec, #f4faf6)',
                                flexShrink: 0,
                                border: '1px solid var(--book-border)',
                              }}
                              aria-hidden
                            />
                          )}
                          <div className="bookPreorder__info">
                            <div className="bookPreorder__name">{m.name}</div>
                            <div className="bookPreorder__price">{vnd.format(Number(m.price))}</div>
                          </div>
                          <div className="bookQty">
                            <button type="button" onClick={() => setQty(m.id, q - 1)} aria-label="Bớt">
                              −
                            </button>
                            <span>{q}</span>
                            <button type="button" onClick={() => setQty(m.id, q + 1)} aria-label="Thêm">
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </section>

          {error ? <p className="bookError">{error}</p> : null}

          <div className="bookMobileOnly">
            <button className="bookSubmit" type="submit" disabled={loading}>
              {loading ? 'Đang gửi…' : 'Gửi yêu cầu đặt bàn'}
            </button>
          </div>
        </form>

        <aside className="bookAside">
          <div className="bookCard bookSummary">
            <h3 className="bookSummary__title">Tóm tắt đặt chỗ</h3>
            <ul className="bookSummary__list">
              <li>
                <strong>Ngày:</strong> {date || '—'}
              </li>
              <li>
                <strong>Giờ:</strong> {time || '—'}
              </li>
              <li>
                <strong>Số khách:</strong> {guestCount}
              </li>
              <li>
                <strong>Bàn:</strong>{' '}
                {selectedTableId === null
                  ? 'Tự động'
                  : selectedTable
                    ? `${selectedTable.name} (${selectedTable.capacity} chỗ)`
                    : '—'}
              </li>
            </ul>
            {selectedTable ? (
              <div className="bookSummary__tablePreview">
                <div className="bookSummary__tableLabel">Góc nhìn bàn đã chọn</div>
                <img
                  className="bookSummary__tableImg"
                  src={selectedTable.image_url ? mediaUrl(selectedTable.image_url) : tablePlaceholder}
                  alt={`Góc nhìn ${selectedTable.name}`}
                />
              </div>
            ) : null}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--book-muted)', marginBottom: 6 }}>
                Món gợi ý trước
              </div>
              <pre className="bookSummary__pre">{preorderSummaryText}</pre>
            </div>
            <div className="bookSummary__total">
              <span>Tạm tính món</span>
              <strong>{vnd.format(preorderTotal)}</strong>
            </div>
            <button className="bookSubmit" type="submit" form="book-form" disabled={loading}>
              {loading ? 'Đang gửi…' : 'Gửi yêu cầu đặt bàn'}
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}
