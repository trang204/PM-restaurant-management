import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl, publicApiFetch } from '../../lib/api'
import { requiredMessage, validatePhone, normalizePhone } from '../../lib/validation'
import './BookTable.css'



type Table = { id: string; name: string; capacity: number; status: string; zone?: string | null; image_url?: string }

/** Thông báo validation bàn (đồng bộ với backend reservations) */
const TABLE_ERR_CAPACITY = 'Bàn không đủ chỗ'
const TABLE_ERR_IN_USE = 'Bàn đang được sử dụng'
const TABLE_ERR_TABLE_TOO_LARGE = 'Bàn quá lớn so với số khách'
const MAX_TABLE_RATIO = 2
/** Đặt bàn online: tối đa số khách */
const MAX_BOOKING_GUESTS = 99
const GUEST_ERR_MAX = `Không quá ${MAX_BOOKING_GUESTS} người`
/** Số món hiển thị ở chế độ thu gọn */
const PREORDER_PREVIEW_COUNT = 5

function isTableAvailable(t: Table) {
  const s = String(t.status || '').toUpperCase()
  return s === 'AVAILABLE' || s === ''
}  

function tableStatusLabel(status: string) {
  const s = String(status || '').toUpperCase()
  if (s === 'AVAILABLE' || s === '') return 'Còn trống'
  if (s === 'OCCUPIED' || s === 'IN_USE' || s === 'IN USE') return 'Đang dùng'
  if (s === 'RESERVED') return 'Đang giữ'
  if (s === 'CLOSED') return 'Bảo trì'
  return 'Đang dùng'
}

/**
 * null = hợp lệ; ngược lại là thông báo hiển thị cho khách.
 * Điều kiện hợp lệ: guestN <= capacity <= guestN * MAX_TABLE_RATIO
 * Ví dụ: 2 khách → bàn 2–4 chỗ OK, bàn 5+ chỗ bị từ chối.
 */
function tableBookingValidationError(t: Table, guestN: number): string | null {
  if (!isTableAvailable(t)) return TABLE_ERR_IN_USE
  const cap = Number(t.capacity)
  if (!Number.isFinite(cap)) return TABLE_ERR_IN_USE
  if (guestN > cap) return TABLE_ERR_CAPACITY
  if (cap > guestN * MAX_TABLE_RATIO) return TABLE_ERR_TABLE_TOO_LARGE
  return null
}

function isTableSelectable(t: Table, guestN: number) {
  return tableBookingValidationError(t, guestN) === null
}
type MenuRow = {
  id: string | number
  name: string
  price: number
  categoryName?: string
  category_name?: string
  image_url?: string
  status?: string
}

function menuRowId(m: Pick<MenuRow, 'id'>): string {
  return String(m.id)
}

function isMenuInStock(m: MenuRow) {
  return String(m.status || 'AVAILABLE').toUpperCase() !== 'UNAVAILABLE'
}

function menuCategory(m: MenuRow) {
  return m.categoryName || m.category_name || 'Món ăn'
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

function getTableDisplayName(t: Table) {
  const baseName = t.name || `Bàn ${t.id}`
  return t.zone ? `${baseName} (${t.zone})` : baseName
}

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
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<string | null>(null) // null = Tất cả, '' = Mặc định
  const [zonesData, setZonesData] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      return
    }
    apiFetch<any>('/users/me')
      .then((d) => {
        if (d?.fullName) setFullName(String(d.fullName))
        if (d?.phone) setPhone(String(d.phone))
      })
      .catch((e) => {
        // Ignore errors, allow guest booking if token is invalid
        console.warn('Failed to fetch user profile:', e)
      })
  }, [])
  
  useEffect(() => {
    let c = false
    publicApiFetch<Table[]>('/tables')
      .then((t) => {
        if (c) return
        setTables(Array.isArray(t) ? t : [])
      })
      .catch(() => {
        if (!c) setTables([])
      })
    return () => {
      c = true
    }
  }, [])

  useEffect(() => {
    let c = false
    setMenuLoading(true)
    setMenuError(null)
    publicApiFetch<MenuRow[]>('/menu')
      .then((m) => {
        if (c) return
        const rows = Array.isArray(m) ? m : []
        setMenu(rows.filter((x) => x.id != null && String(x.id).trim() !== '' && isMenuInStock(x)))
        setMenuError(null)
      })
      .catch((e) => {
        if (!c) {
          setMenu([])
          setMenuError((e as Error).message || 'Không tải được thực đơn')
        }
      })
      .finally(() => {
        if (!c) setMenuLoading(false)
      })
    return () => {
      c = true
    }
  }, [])

  useEffect(() => {
    publicApiFetch<{ id: number; name: string }[]>('/zones')
      .then((d) => setZonesData(Array.isArray(d) ? d : []))
      .catch(() => {})
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
      const q = qtyByMenuId[menuRowId(m)] ?? 0
      if (q > 0) sum += Number(m.price) * q
    }
    return sum
  }, [menu, qtyByMenuId])

  const selectedTable = tables.find((t) => String(t.id) === (selectedTableId ?? ''))
  const autoSuggestedTable = useMemo(() => {
    const cands = tables
      .filter((t) => tableBookingValidationError(t, guestCount) === null)
      .sort((a, b) => Number(a.capacity) - Number(b.capacity))
    return cands[0] || null
  }, [tables, guestCount])

  const effectivePreferredTableId =
    selectedTableId === null ? (autoSuggestedTable?.id != null ? String(autoSuggestedTable.id) : null) : selectedTableId

  /** Danh sách zone duy nhất (theo zonesData từ server) */
  const availableZones = useMemo(() => zonesData, [zonesData])

  /** Kiểm tra có bàn thuộc "Mặc định" (zone null/empty) không */
  const hasDefaultZone = useMemo(() => tables.some((t) => !t.zone), [tables])

  /** Bàn sau khi lọc theo zone */
  const tablesInZone = useMemo(() => {
    if (selectedZone === null) return tables          // Tất cả
    if (selectedZone === '') return tables.filter((t) => !t.zone)  // Mặc định
    return tables.filter((t) => String(t.zone || '').trim() === selectedZone)
  }, [tables, selectedZone])

  useEffect(() => {
    if (selectedTableId == null) {
      setFieldErrors((prev) => (prev.table ? { ...prev, table: '' } : prev))
      return
    }
    const t = tables.find((x) => String(x.id) === selectedTableId)
    if (!t) {
      setSelectedTableId(null)
      return
    }
    const msg = tableBookingValidationError(t, guestCount)
    if (msg) {
      setSelectedTableId(null)
      setFieldErrors((prev) => ({ ...prev, table: '' }))
    } else {
      setFieldErrors((prev) => (prev.table ? { ...prev, table: '' } : prev))
    }
  }, [guestCount, selectedTableId, tables])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const nextErrors: Record<string, string> = {}
    if (!fullName.trim()) nextErrors.fullName = requiredMessage('Họ và tên')
    // Validate SĐT bằng hàm dùng chung
    const phoneErr = validatePhone(phone)
    if (phoneErr) nextErrors.phone = phoneErr
    if (!date) nextErrors.date = requiredMessage('Ngày')
    if (!time) nextErrors.time = requiredMessage('Giờ')
    if (guestCount > MAX_BOOKING_GUESTS) nextErrors.guestCount = GUEST_ERR_MAX
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const tid = effectivePreferredTableId
    if (tid) {
      const t = tables.find((x) => String(x.id) === String(tid))
      if (t) {
        const tableMsg = tableBookingValidationError(t, guestCount)
        if (tableMsg) {
          setFieldErrors({ ...nextErrors, table: tableMsg })
          return
        }
      }
    }

    setLoading(true)
    try {
      const body = {
        fullName,
        phone: normalizePhone(phone),
        date,
        time,
        guestCount,
        preorderItems,
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
        } catch (holdErr) {
          setError((holdErr as Error).message || TABLE_ERR_IN_USE)
        }
      }
      navigate(`/reservations/${id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function setQty(id: string | number, q: number) {
    const k = String(id)
    setQtyByMenuId((prev) => ({ ...prev, [k]: Math.max(0, q) }))
  }

  function bumpGuest(delta: number) {
    setGuestCount((g) => Math.max(1, Math.min(MAX_BOOKING_GUESTS, g + delta)))
    setFieldErrors((prev) => (prev.guestCount ? { ...prev, guestCount: '' } : prev))
  }

  const preorderSummaryText = useMemo(() => {
    if (!preorderItems.length) return 'Chưa chọn món'
    const lines: string[] = []
    for (const { menuItemId, quantity } of preorderItems) {
      const m = menu.find((x) => menuRowId(x) === String(menuItemId))
      if (m) lines.push(`${m.name} ×${quantity}`)
    }
    return lines.length ? lines.join('\n') : '—'
  }, [preorderItems, menu])

  return (
    <main className="bookPage">
      <header className="bookHero">
        <div className="bookHero__copy">
          <p className="bookHero__eyebrow">Đặt chỗ</p>
          <h1 className="bookHero__title">Trải nghiệm đặt bàn hiện đại</h1>
          <p className="bookHero__lead">
            Lựa chọn thời gian, vị trí bàn và món ăn trước để nhà hàng chuẩn bị tốt nhất cho buổi gặp của bạn.
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
            <span className="bookHero__stat-val">{tables.filter((t) => isTableSelectable(t, guestCount)).length}</span>
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
                  maxLength={10}
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
                  <button type="button" onClick={() => bumpGuest(1)} aria-label="Tăng" disabled={guestCount >= MAX_BOOKING_GUESTS}>
                    +
                  </button>
                </div>
                {fieldErrors.guestCount ? <small className="bookField__error">{fieldErrors.guestCount}</small> : null}
              </label>
            </div>
          </section>

          <section className="bookCard">
            <div className="bookCard__head">
              <span className="bookStep">3</span>
              <div className="bookCard__titles">
                <h2>Chọn bàn ưu tiên</h2>
              </div>
            </div>

            {/* Zone chips */}
            {(availableZones.length > 0 || hasDefaultZone) ? (
              <div className="bookZones" role="group" aria-label="Lọc theo khu vực">
                <button
                  type="button"
                  className={`bookZoneChip${selectedZone === null ? ' bookZoneChip--active' : ''}`}
                  onClick={() => { setSelectedZone(null); setSelectedTableId(null) }}
                >
                  Tất cả
                </button>
                {availableZones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={`bookZoneChip${selectedZone === z.name ? ' bookZoneChip--active' : ''}`}
                    onClick={() => { setSelectedZone(z.name); setSelectedTableId(null) }}
                  >
                    {z.name}
                  </button>
                ))}
                {hasDefaultZone && (
                  <button
                    type="button"
                    className={`bookZoneChip${selectedZone === '' ? ' bookZoneChip--active' : ''}`}
                    onClick={() => { setSelectedZone(''); setSelectedTableId(null) }}
                  >
                    Mặc định
                  </button>
                )}
              </div>
            ) : null}

            <div className="bookTables">
              <button
                type="button"
                className={`bookTableBtn${selectedTableId === null ? ' bookTableBtn--active' : ''}`}
                onClick={() => {
                  setFieldErrors((prev) => ({ ...prev, table: '' }))
                  setError(null)
                  setSelectedTableId(null)
                }}
              >
                <span className="bookTableBtn__name">Tự động</span>
                <span className="bookTableBtn__meta">
                  {autoSuggestedTable
                    ? `Hệ thống gợi ý: ${getTableDisplayName(autoSuggestedTable)} (${autoSuggestedTable.capacity} chỗ)`
                    : 'Hệ thống chọn bàn phù hợp số khách'}
                </span>
                <span className="bookTableBtn__badge">Gợi ý</span>
              </button>
              {tablesInZone.map((t) => {
                const selMsg = tableBookingValidationError(t, guestCount)
                const canPick = isTableSelectable(t, guestCount)
                const img = t.image_url ? mediaUrl(t.image_url) : tablePlaceholder
                const tid = String(t.id)
                const statusLabel = tableStatusLabel(t.status)
                const badgeLabel = selMsg
                  ? selMsg === TABLE_ERR_IN_USE
                    ? statusLabel
                    : selMsg === TABLE_ERR_TABLE_TOO_LARGE
                      ? 'Bàn quá lớn'
                      : 'Không đủ chỗ'
                  : statusLabel
                return (
                  <button
                    key={tid}
                    type="button"
                    disabled={!canPick}
                    title={!canPick && selMsg ? selMsg : undefined}
                    className={`bookTableBtn${selectedTableId === tid ? ' bookTableBtn--active' : ''}${!canPick ? ' bookTableBtn--invalid' : ''}`}
                    onClick={() => {
                      if (!canPick) return
                      setFieldErrors((prev) => ({ ...prev, table: '' }))
                      setError(null)
                      setSelectedTableId(tid)
                    }}
                  >
                    <span className="bookTableBtn__imageWrap" aria-hidden>
                      <img className="bookTableBtn__image" src={img} alt="" />
                    </span>
                    <span className="bookTableBtn__name">{getTableDisplayName(t)}</span>
                    <span className="bookTableBtn__meta">{t.capacity} chỗ ngồi</span>
                    <span className="bookTableBtn__badge">{badgeLabel}</span>
                  </button>
                )
              })}
            </div>
            {fieldErrors.table ? <p className="bookField__error bookField__error--block">{fieldErrors.table}</p> : null}
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
            <div className="bookPreorder">
              {menuLoading ? (
                <p style={{ margin: 0, color: 'var(--book-muted)', fontSize: '0.9rem' }}>Đang tải thực đơn…</p>
              ) : menuError ? (
                <p className="bookError" style={{ margin: 0, fontSize: '0.9rem' }}>
                  {menuError}
                </p>
              ) : menu.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--book-muted)', fontSize: '0.9rem' }}>
                  Hiện không có món còn phục vụ để gọi trước. Vui lòng thử lại sau.
                </p>
              ) : (() => {
                // Flatten toàn bộ món theo thứ tự category, sau đó slice nếu thu gọn
                const allItems: { cat: string; m: MenuRow }[] = []
                for (const [cat, items] of menuByCategory.entries()) {
                  for (const m of items) allItems.push({ cat, m })
                }
                const visibleItems = preorderExpanded ? allItems : allItems.slice(0, PREORDER_PREVIEW_COUNT)
                const hiddenCount = allItems.length - visibleItems.length

                // Nhóm lại các món đang hiển thị theo category
                const visibleByCategory = new Map<string, MenuRow[]>()
                for (const { cat, m } of visibleItems) {
                  if (!visibleByCategory.has(cat)) visibleByCategory.set(cat, [])
                  visibleByCategory.get(cat)!.push(m)
                }

                return (
                  <>
                    {Array.from(visibleByCategory.entries()).map(([cat, items]) => (
                      <div key={cat}>
                        <h3 className="bookPreorder__group-title">{cat}</h3>
                        {items.map((m) => {
                          const mid = menuRowId(m)
                          const q = qtyByMenuId[mid] ?? 0
                          const img = m.image_url ? mediaUrl(m.image_url) : ''
                          return (
                            <div key={mid} className="bookPreorder__row">
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
                    ))}
                    {!preorderExpanded && hiddenCount > 0 && (
                      <p className="bookPreorder__hint">
                        … và {hiddenCount} món khác.
                        {/* <button
                          type="button"
                          className="bookPreorder__hintBtn"
                          onClick={() => setPreorderExpanded(true)}
                        >
                          Xem menu đầy đủ
                        </button> */}
                      </p>
                    )}
                  </>
                )
              })()}
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
                    ? `${getTableDisplayName(selectedTable)} (${selectedTable.capacity} chỗ)`
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
