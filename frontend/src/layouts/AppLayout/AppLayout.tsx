import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
import { fetchPublicSettings } from '../../lib/settings'
import './AppLayout.css'

type Me = { id?: string; email?: string; role?: string; fullName?: string; avatarUrl?: string | null }

export default function AppLayout() {
  const [me, setMe] = useState<Me | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  const [brand, setBrand] = useState<{ name: string; logoUrl?: string | null }>({ name: 'Luxeat', logoUrl: null })
  const [publicInfo, setPublicInfo] = useState<{

    address?: string | null
    phone?: string | null
    email?: string | null
    openTime?: string | null
    closeTime?: string | null
    socials?: Array<{ label?: string; url?: string }> | null
  } | null>(null)

  useEffect(() => {
    function loadMe() {
      const t = localStorage.getItem('luxeat_token')
      if (!t) {
        setMe(null)
        return
      }
      apiFetch<Me>('/users/me')
        .then(setMe)
        .catch(() => setMe(null))
    }
    loadMe()
    window.addEventListener('luxeat:me-updated', loadMe)
    return () => window.removeEventListener('luxeat:me-updated', loadMe)
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
          socials: Array.isArray(s.footer?.socials) ? s.footer?.socials : null,
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
          <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
            {brand.logoUrl ? (
              <img className="brand__logo" src={mediaUrl(brand.logoUrl)} alt="" width={50} height={50} />
            ) : (
              <span className="brand__mark" aria-hidden />
            )}
            <span className="brand__text">{brand.name}</span>
          </NavLink>

          <button
            type="button"
            className={`nav__hamburger${menuOpen ? ' nav__hamburger--open' : ''}`}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav ref={navRef} className={`nav${menuOpen ? ' nav--open' : ''}`} aria-label="Điều hướng">
            <NavLink to="/menu" className="nav__link">
              Thực đơn
            </NavLink>
            <NavLink to="/book" className="nav__link">
              Đặt bàn
            </NavLink>
            {me ? (
              <NavLink to="/reservations" className="nav__link">
                Lịch sử
              </NavLink>
            ) : null}
            {me ? (
              <>
                <NavLink to="/profile" className="nav__link nav__link--profile">
                  {me.avatarUrl ? (
                    <img
                      className="nav__avatar"
                      src={mediaUrl(me.avatarUrl)}
                      alt=""
                      width={28}
                      height={28}
                    />
                  ) : null}
                  <span>{me.fullName || me.email}</span>
                </NavLink>
                {me.role === 'ADMIN' ? (
                  <NavLink to="/admin" className="nav__link">
                    Admin
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

          {menuOpen && (
            <div className="nav__backdrop" aria-hidden onClick={() => setMenuOpen(false)} />
          )}
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
                {me ? (
                  <NavLink to="/reservations" className="luxFooter__link">
                    Lịch sử<br />
                  </NavLink>
                ) : null}
              </div>

              <div className="luxFooter__col">
                <div className="luxFooter__h">Liên hệ</div>
                {publicInfo?.address ? (
                  <div className="luxFooter__contactRow">
                    <MapPin size={16} aria-hidden />
                    <span>{publicInfo.address}</span>
                  </div>
                ) : null}
                {publicInfo?.phone ? (
                  <a className="luxFooter__contactRow luxFooter__contactLink" href={`tel:${String(publicInfo.phone).replace(/\s/g, '')}`}>
                    <Phone size={16} aria-hidden />
                    <span>{publicInfo.phone}</span>
                  </a>
                ) : null}
                {publicInfo?.email ? (
                  <a className="luxFooter__contactRow luxFooter__contactLink" href={`mailto:${publicInfo.email}`}>
                    <Mail size={16} aria-hidden />
                    <span>{publicInfo.email}</span>
                  </a>
                ) : null}

                {publicInfo?.socials?.length ? (
                  <div className="luxFooter__socials" aria-label="Mạng xã hội">
                    {publicInfo.socials
                      .filter((x) => x && x.url && x.label)
                      .slice(0, 6)
                      .map((s) => (
                        <a
                          key={`${s.label}-${s.url}`}
                          className="luxFooter__socialBtn"
                          href={String(s.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {String(s.label)}
                        </a>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="luxFooter__col">
                <div className="luxFooter__h">Giờ mở cửa</div>
                <div className="luxFooter__text">
                  {publicInfo?.openTime && publicInfo?.closeTime ? `${publicInfo.openTime} – ${publicInfo.closeTime}` : 'Hàng ngày'}
                </div>
              </div>
            </div>
          </div>

          <div className="luxFooter__bottom">
            <span>© {new Date().getFullYear()} {brand.name}. Đã đăng ký bản quyền.</span>
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
