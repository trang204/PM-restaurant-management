import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
import { fetchPublicSettings } from '../../lib/settings'
import './AppLayout.css'

type Me = { id?: string; email?: string; role?: string; fullName?: string }

export default function AppLayout() {
  const [me, setMe] = useState<Me | null>(null)
  const [brand, setBrand] = useState<{ name: string; logoUrl?: string | null }>({ name: 'Luxeat', logoUrl: null })
  const [publicInfo, setPublicInfo] = useState<{
    address?: string | null
    phone?: string | null
    email?: string | null
    openTime?: string | null
    closeTime?: string | null
  } | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('luxeat_token')
    if (!t) {
      setMe(null)
      return
    }
    apiFetch<Me>('/users/me')
      .then(setMe)
      .catch(() => setMe(null))
  }, [])

  useEffect(() => {
    fetchPublicSettings()
      .then((s) => {
        setBrand({ name: s.restaurantName?.trim() || 'Luxeat', logoUrl: s.logoUrl })
        setPublicInfo({
          address: s.address,
          phone: s.phone,
          email: s.email,
          openTime: s.openTime,
          closeTime: s.closeTime,
        })
      })
      .catch(() => {
        setBrand({ name: 'Luxeat', logoUrl: null })
        setPublicInfo(null)
      })
  }, [])

  function logout() {
    setToken(null)
    setMe(null)
    window.location.href = '/'
  }

  return (
    <div className="appShell">
      <header className="appHeader">
        <div className="appHeader__inner">
          <NavLink to="/" className="brand">
            {brand.logoUrl ? (
              <img className="brand__logo" src={mediaUrl(brand.logoUrl)} alt="" width={38} height={38} />
            ) : (
              <span className="brand__mark" aria-hidden />
            )}
            <span className="brand__text">{brand.name}</span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/menu" className="nav__link">
              Thực đơn
            </NavLink>
            <NavLink to="/book" className="nav__link">
              Đặt bàn
            </NavLink>
            <NavLink to="/reservations" className="nav__link">
              Lịch sử
            </NavLink>
            {me ? (
              <>
                <NavLink to="/profile" className="nav__link">
                  {me.fullName || me.email}
                </NavLink>
                {me.role === 'ADMIN' ? (
                  <NavLink to="/admin" className="nav__link">
                    Quản trị
                  </NavLink>
                ) : null}
                {me.role === 'STAFF' ? (
                  <NavLink to="/staff" className="nav__link nav__cta">
                    Khu nhân viên
                  </NavLink>
                ) : null}
                <button type="button" className="nav__link nav__cta" onClick={logout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <NavLink to="/register" className="nav__link">
                  Đăng ký
                </NavLink>
                <NavLink to="/login" className="nav__link nav__cta">
                  Đăng nhập
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="appFooter">
        <div className="luxFooter">
          <div className="luxFooter__top">
            <div className="luxFooter__brand">
              <NavLink to="/" className="luxFooter__brandLink">
                {brand.logoUrl ? (
                  <img className="luxFooter__logo" src={mediaUrl(brand.logoUrl)} alt="" width={44} height={44} />
                ) : (
                  <span className="luxFooter__mark" aria-hidden />
                )}
                <div>
                  <div className="luxFooter__name">{brand.name}</div>
                  <div className="luxFooter__tag">Đặt bàn · Quản lý nhà hàng · Gọi món tại bàn</div>
                </div>
              </NavLink>
            </div>

            <div className="luxFooter__cols">
              <div className="luxFooter__col">
                <div className="luxFooter__h">Điều hướng</div>
                <NavLink to="/menu" className="luxFooter__link">
                  Thực đơn<br />
                </NavLink>
                <NavLink to="/book" className="luxFooter__link">
                  Đặt bàn<br />
                </NavLink>
                <NavLink to="/reservations" className="luxFooter__link">
                  Lịch sử<br />
                </NavLink>
              </div>

              <div className="luxFooter__col">
                <div className="luxFooter__h">Liên hệ</div>
                {publicInfo?.address ? <div className="luxFooter__text">{publicInfo.address}</div> : null}
                {publicInfo?.phone ? (
                  <a className="luxFooter__link" href={`tel:${String(publicInfo.phone).replace(/\s/g, '')}`}>
                    {publicInfo.phone}
                  </a>
                ) : null}
                {publicInfo?.email ? (
                  <a className="luxFooter__link" href={`mailto:${publicInfo.email}`}>
                    {publicInfo.email}
                  </a>
                ) : null}
              </div>

              <div className="luxFooter__col">
                <div className="luxFooter__h">Giờ mở cửa</div>
                <div className="luxFooter__text">
                  {publicInfo?.openTime && publicInfo?.closeTime ? `${publicInfo.openTime} – ${publicInfo.closeTime}` : 'Hàng ngày'}
                </div>
                <div className="luxFooter__ctaRow">
                  <NavLink to="/book" className="luxFooter__cta">
                    Đặt bàn ngay
                  </NavLink>
                </div>
              </div>
            </div>
          </div>

          <div className="luxFooter__bottom">
            <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
            <div className="luxFooter__bottomLinks">
              {me?.role === 'ADMIN' ? (
                <NavLink to="/admin" className="luxFooter__miniLink">
                </NavLink>
              ) : null}
              {me?.role === 'STAFF' ? (
                <NavLink to="/staff" className="luxFooter__miniLink">
                  Nhân viên
                </NavLink>
              ) : null}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
