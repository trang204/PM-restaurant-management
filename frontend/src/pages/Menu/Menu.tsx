import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import './Menu.css'
import phoUrl from '../../assets/menu/pho.svg?url'
import bunchaUrl from '../../assets/menu/buncha.svg?url'
import comtamUrl from '../../assets/menu/comtam.svg?url'
import goicuonUrl from '../../assets/menu/goicuon.svg?url'
import trasuaUrl from '../../assets/menu/trasua.svg?url'
import cheUrl from '../../assets/menu/che.svg?url'
import { apiFetch, mediaUrl } from '../../lib/api'
import { Link } from 'react-router-dom'

type ApiMenuItem = {
  id: string | number
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  status?: string | null
  category_id?: number | null
  category_name?: string | null
}

function isUnavailableItem(item: ApiMenuItem) {
  return String(item.status || 'AVAILABLE').toUpperCase() === 'UNAVAILABLE'
}

const LOCAL_IMG: Record<string, string> = {
  'pho-bo': phoUrl,
  'bun-cha': bunchaUrl,
  'com-tam': comtamUrl,
  'goi-cuon': goicuonUrl,
  'tra-sua': trasuaUrl,
  'che-khuc-bach': cheUrl,
}

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function resolveImageSrc(id: string, imageUrl?: string) {
  if (LOCAL_IMG[id]) return LOCAL_IMG[id]
  if (imageUrl) return mediaUrl(imageUrl)
  return comtamUrl
}

type CategoryRow = { id: number; name: string }

export default function Menu() {
  const [items, setItems] = useState<ApiMenuItem[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [activeCat, setActiveCat] = useState<number | 'all'>('all')
  /** all | in_stock | out_of_stock */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [q, setQ] = useState('')
  const [myTable, setMyTable] = useState<null | { tableName: string; url: string }>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publicInfo, setPublicInfo] = useState<{ openTime?: string | null; closeTime?: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiFetch<ApiMenuItem[]>('/menu'),
      apiFetch<CategoryRow[]>('/menu/categories'),
      import('../../lib/settings').then(m => m.fetchPublicSettings())
    ])
      .then(([data, cats, settings]) => {
        if (cancelled) return
        setItems(Array.isArray(data) ? data : [])
        setCategories(Array.isArray(cats) ? cats : [])
        setPublicInfo({
          openTime: settings.openTime,
          closeTime: settings.closeTime,
        })
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Explicit load so we can refresh on button click
  const load = async () => {
    setLoading(true)
    try {
      const [data, cats] = await Promise.all([apiFetch<ApiMenuItem[]>('/menu'), apiFetch<CategoryRow[]>('/menu/categories')])
      setItems(Array.isArray(data) ? data : [])
      setCategories(Array.isArray(cats) ? cats : [])
      setError(null)
    } catch (e) {
      setError((e as Error)?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      setMyTable(null)
      return
    }
    apiFetch<Record<string, unknown>>('/table-session/me')
      .then((d) => {
        if (d?.tableName && d?.tableOrderToken) {
          setMyTable({ tableName: String(d.tableName), url: `/order/table/${encodeURIComponent(String(d.tableOrderToken))}` })
        } else {
          setMyTable(null)
        }
      })
      .catch(() => setMyTable(null))
  }, [])

  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return items.filter((i) => {
      if (activeCat !== 'all' && Number(i.category_id) !== Number(activeCat)) return false
      const out = isUnavailableItem(i)
      if (availability === 'in_stock' && out) return false
      if (availability === 'out_of_stock' && !out) return false
      if (!qq) return true
      const name = String(i.name || '').toLowerCase()
      const desc = String(i.description || '').toLowerCase()
      return name.includes(qq) || desc.includes(qq)
    })
  }, [items, activeCat, q, availability])

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Thực đơn hôm nay</p>
          <h1 className="menuHero__title">Món ngon — giá rõ ràng</h1>
          <p className="menuHero__subtitle">Chọn danh mục hoặc tìm món bạn yêu thích.</p>
        </div>
        <div className="menuHero__meta" aria-label="Thông tin nhanh">
          <div className="menuPill">
            <span className="menuPill__label">Giờ mở cửa</span>
            <span className="menuPill__value">
              {publicInfo?.openTime && publicInfo?.closeTime ? `${publicInfo.openTime} – ${publicInfo.closeTime}` : 'Hàng ngày'}
            </span>
          </div>
          {myTable ? (
            <div className="menuPill">
              <span className="menuPill__label">Bàn của bạn</span>
              <span className="menuPill__value">
                <strong>{myTable.tableName}</strong> ·{' '}
                <Link to={myTable.url} className="menuPill__link">
                  Gọi món
                </Link>
              </span>
            </div>
          ) : null}
          <div className="menuPill">
            <span className="menuPill__label">Cập nhật</span>
            <span className="menuPill__value">Theo nhà hàng</span>
          </div>
        </div>
      </header>

      <section className="menuSection" aria-labelledby="menu-heading">
        <div className="menuSection__header">
          <h2 id="menu-heading" className="menuSection__title">
            Thực đơn
          </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p className="menuSection__hint" style={{ margin: 0 }}>
                {loading ? 'Đang tải...' : error ? `Lỗi: ${error}` : `${visible.length} món`}
              </p>
              <button type="button" className="menuRefreshBtn" onClick={load} disabled={loading}>
                <RefreshCw size={16} />
                {loading ? 'Đang tải…' : 'Làm mới'}
              </button>
            </div>
        </div>

        <div className="menuLayout">
          <aside className="menuSide" aria-label="Danh mục món ăn">
            <div className="menuSide__search">
              <input
                className="menuSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên món"
                type="search"
                aria-label="Tìm theo tên món"
              />
            </div>
            {/* <div className="menuSide__status" role="group" aria-labelledby="menu-availability-label">
              <p id="menu-availability-label" className="menuStatus__label">
                Trạng thái
              </p>
              <div className="menuStatus__chips">
                <button
                  type="button"
                  className={`menuStatus__chip${availability === 'all' ? ' menuStatus__chip--on' : ''}`}
                  onClick={() => setAvailability('all')}
                  aria-pressed={availability === 'all'}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`menuStatus__chip${availability === 'in_stock' ? ' menuStatus__chip--on' : ''}`}
                  onClick={() => setAvailability('in_stock')}
                  aria-pressed={availability === 'in_stock'}
                >
                  Còn món
                </button>
                <button
                  type="button"
                  className={`menuStatus__chip${availability === 'out_of_stock' ? ' menuStatus__chip--on' : ''}`}
                  onClick={() => setAvailability('out_of_stock')}
                  aria-pressed={availability === 'out_of_stock'}
                >
                  Hết món
                </button>
              </div>
            </div> */}
            <nav className="menuCats">
              <button
                type="button"
                className={`menuCat${activeCat === 'all' ? ' menuCat--on' : ''}`}
                onClick={() => setActiveCat('all')}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`menuCat${activeCat === c.id ? ' menuCat--on' : ''}`}
                  onClick={() => setActiveCat(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          </aside>

          <div className="menuMain">
            {!loading && !error && visible.length === 0 ? (
              <p>Chưa có món phù hợp.</p>
            ) : null}
            <div className="menuGrid" role="list">
              {visible.map((item) => {
                const out = isUnavailableItem(item)
                return (
                <article
                  className={`menuCard${out ? ' menuCard--out' : ''}`}
                  key={String(item.id)}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${item.name}, ${out ? 'Hết món' : 'Còn món'}, giá ${vnd.format(item.price)}`}
                >
                  <div className="menuCard__media">
                    <img
                      className="menuCard__img"
                      src={resolveImageSrc(String(item.id), item.image_url || undefined)}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        if (e.currentTarget.src !== comtamUrl) {
                          e.currentTarget.src = comtamUrl
                        }
                      }}
                    />
                    <span className="menuBadge" aria-label={`Danh mục ${item.category_name || ''}`}>
                      {item.category_name || 'Món'}
                    </span>
                    {out ? (
                      <span className="menuStockTag" aria-hidden>
                        Hết món
                      </span>
                    ) : null}
                  </div>

                  <div className="menuCard__body">
                    <div className="menuCard__row">
                      <h3 className="menuCard__name">{item.name}</h3>
                      <p className="menuCard__price">{vnd.format(item.price)}</p>
                    </div>
                    <p className="menuCard__desc">{item.description || 'Món từ thực đơn nhà hàng.'}</p>
                  </div>
                </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="menuFooter" />
    </main>
  )
}
