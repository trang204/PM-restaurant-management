import { useEffect, useMemo, useState } from 'react'
import './Menu.css'
import phoUrl from '../../assets/menu/pho.svg?url'
import bunchaUrl from '../../assets/menu/buncha.svg?url'
import comtamUrl from '../../assets/menu/comtam.svg?url'
import goicuonUrl from '../../assets/menu/goicuon.svg?url'
import trasuaUrl from '../../assets/menu/trasua.svg?url'
import cheUrl from '../../assets/menu/che.svg?url'
import { apiFetch, mediaUrl } from '../../lib/api'

type ApiMenuItem = {
  id: string | number
  name: string
  price: number
  description?: string | null
  image_url?: string | null
  category_id?: number | null
  category_name?: string | null
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
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([apiFetch<ApiMenuItem[]>('/menu'), apiFetch<CategoryRow[]>('/menu/categories')])
      .then(([data, cats]) => {
        if (cancelled) return
        setItems(Array.isArray(data) ? data : [])
        setCategories(Array.isArray(cats) ? cats : [])
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

  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return items.filter((i) => {
      if (activeCat !== 'all' && Number(i.category_id) !== Number(activeCat)) return false
      if (!qq) return true
      const name = String(i.name || '').toLowerCase()
      const desc = String(i.description || '').toLowerCase()
      return name.includes(qq) || desc.includes(qq)
    })
  }, [items, activeCat, q])

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Thực đơn hôm nay</p>
          <h1 className="menuHero__title">Món ngon — giá rõ ràng</h1>
          <p className="menuHero__subtitle">
            Dữ liệu lấy từ API <code>/api/menu</code>. Giá hiển thị theo VND.
          </p>
        </div>
        <div className="menuHero__meta" aria-label="Thông tin nhanh">
          <div className="menuPill">
            <span className="menuPill__label">Giờ mở cửa</span>
            <span className="menuPill__value">08:00 – 22:00</span>
          </div>
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
          <p className="menuSection__hint">
            {loading ? 'Đang tải...' : error ? `Lỗi: ${error}` : `${visible.length} món`}
          </p>
        </div>

        <div className="menuLayout">
          <aside className="menuSide" aria-label="Danh mục món ăn">
            <div className="menuSide__search">
              <input
                className="menuSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm món…"
                type="search"
              />
            </div>
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
              <p>Chưa có món phù hợp. Thử đổi danh mục hoặc từ khóa.</p>
            ) : null}
            <div className="menuGrid" role="list">
              {visible.map((item) => (
                <article
                  className="menuCard"
                  key={String(item.id)}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${item.name}, giá ${vnd.format(item.price)}`}
                >
                  <div className="menuCard__media">
                    <img
                      className="menuCard__img"
                      src={resolveImageSrc(String(item.id), item.image_url || undefined)}
                      alt={item.name}
                      loading="lazy"
                    />
                    <span className="menuBadge" aria-label={`Danh mục ${item.category_name || ''}`}>
                      {item.category_name || 'Món'}
                    </span>
                  </div>

                  <div className="menuCard__body">
                    <div className="menuCard__row">
                      <h3 className="menuCard__name">{item.name}</h3>
                      <p className="menuCard__price">{vnd.format(item.price)}</p>
                    </div>
                    <p className="menuCard__desc">{item.description || 'Món từ thực đơn nhà hàng.'}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="menuFooter">
        <p className="menuFooter__text">Nguồn dữ liệu: backend REST · GET /api/menu</p>
      </footer>
    </main>
  )
}
