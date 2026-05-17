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
    socialLinks?: { facebook?: string | null; instagram?: string | null; zalo?: string | null } | null
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
          socialLinks: s.socialLinks ?? null,
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
                <NavLink to="/menu" className="luxFooter__link">Thực đơn</NavLink>
                <NavLink to="/book" className="luxFooter__link">Đặt bàn</NavLink>
                {me ? (
                  <NavLink to="/reservations" className="luxFooter__link">Lịch sử</NavLink>
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
              </div>

              <div className="luxFooter__col">
                <div className="luxFooter__h">Giờ mở cửa</div>
                <div className="luxFooter__text">
                  {publicInfo?.openTime && publicInfo?.closeTime ? `${publicInfo.openTime} – ${publicInfo.closeTime}` : 'Hàng ngày'}
                </div>
              </div>

              {(() => {
                const sl = publicInfo?.socialLinks
                const links = [
                  sl?.facebook ? { key: 'facebook', url: sl.facebook, label: 'Facebook',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ color: '#1877F2', flexShrink: 0 }}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> } : null,
                  sl?.instagram ? { key: 'instagram', url: sl.instagram, label: 'Instagram',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ color: '#E1306C', flexShrink: 0 }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> } : null,
                  sl?.zalo ? { key: 'zalo', url: sl.zalo, label: 'Zalo',
                    icon: <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0 }}><rect width="48" height="48" rx="10" fill="#0068FF"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="Arial">Z</text></svg> } : null,
                ].filter(Boolean) as { key: string; url: string; label: string; icon: React.ReactNode }[]

                if (!links.length) return null
                return (
                  <div className="luxFooter__col">
                    <div className="luxFooter__h">Theo dõi chúng tôi</div>
                    {links.map((s) => (
                      <a
                        key={s.key}
                        className="luxFooter__link luxFooter__socialLink"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.icon}
                        {s.label}
                      </a>
                    ))}
                  </div>
                )
              })()}
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
