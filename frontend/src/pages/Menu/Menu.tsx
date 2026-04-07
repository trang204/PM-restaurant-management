import { useEffect, useMemo, useState } from 'react'
import './Menu.css'
import phoUrl from '../../assets/menu/pho.svg?url'
import bunchaUrl from '../../assets/menu/buncha.svg?url'
import comtamUrl from '../../assets/menu/comtam.svg?url'
import goicuonUrl from '../../assets/menu/goicuon.svg?url'
import trasuaUrl from '../../assets/menu/trasua.svg?url'
import cheUrl from '../../assets/menu/che.svg?url'
import { apiFetch } from '../../lib/api'

type ApiMenuItem = {
  id: string
  name: string
  price: number
  categoryName?: string
  imageUrl?: string
  isActive?: boolean
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
  if (imageUrl && imageUrl.startsWith('http')) return imageUrl
  return comtamUrl
}

export default function Menu() {
  const [items, setItems] = useState<ApiMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch<ApiMenuItem[]>('/menu')
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
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

  const visible = useMemo(() => items.filter((i) => i.isActive !== false), [items])

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

        <div className="menuGrid" role="list">
          {!loading && !error && visible.length === 0 ? (
            <p>Chưa có món. Thêm món trong khu quản trị.</p>
          ) : null}
          {visible.map((item) => (
            <article
              className="menuCard"
              key={item.id}
              role="listitem"
              tabIndex={0}
              aria-label={`${item.name}, giá ${vnd.format(item.price)}`}
            >
              <div className="menuCard__media">
                <img
                  className="menuCard__img"
                  src={resolveImageSrc(String(item.id), item.imageUrl)}
                  alt={item.name}
                  loading="lazy"
                />
                <span className="menuBadge" aria-label={`Danh mục ${item.categoryName || ''}`}>
                  {item.categoryName || 'Món'}
                </span>
              </div>

              <div className="menuCard__body">
                <div className="menuCard__row">
                  <h3 className="menuCard__name">{item.name}</h3>
                  <p className="menuCard__price">{vnd.format(item.price)}</p>
                </div>
                <p className="menuCard__desc">Món từ thực đơn nhà hàng.</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="menuFooter">
        <p className="menuFooter__text">Nguồn dữ liệu: backend REST · GET /api/menu</p>
      </footer>
    </main>
  )
}
