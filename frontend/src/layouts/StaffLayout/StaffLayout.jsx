import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, ChefHat, BarChart3, LogOut, Menu as MenuIcon, X } from 'lucide-react'
import { apiFetch, setToken, mediaUrl } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import { fetchPublicSettings } from '../../lib/settings'
import NotificationBell from '../../components/NotificationBell.jsx'
import './StaffLayout.css'

export default function StaffLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { confirm } = useNotifications()
  const [me, setMe] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const [brand, setBrand] = useState({ name: 'Nhà hàng', logoUrl: null })

  useEffect(() => { setNavOpen(false) }, [pathname])

  useEffect(() => {
    fetchPublicSettings()
      .then((s) =>
        setBrand({
          name: s.restaurantName?.trim() || 'Nhà hàng',
          logoUrl: s.logoUrl,
        }),
      )
      .catch(() => setBrand({ name: 'Nhà hàng', logoUrl: null }))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    apiFetch('/users/me')
      .then((u) => {
        setMe(u)
        if (u.role === 'ADMIN') {
          navigate('/admin', { replace: true })
          return
        }
        if (u.role !== 'STAFF') {
          navigate('/', { replace: true })
        }
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  async function handleLogout() {
    const ok = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có muốn đăng xuất không?',
      danger: true,
      confirmLabel: 'Đăng xuất',
      cancelLabel: 'Hủy',
      warningText: 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.',
    })
    if (!ok) return
    setToken(null)
    setMe(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="staff-app">
      <header className="staff-topbar">
        <div className="staff-topbar__left">
          <Link to="/staff" className="staff-topbar__brand">
            {brand.logoUrl ? (
              <img
                src={mediaUrl(brand.logoUrl)}
                alt=""
                className="staff-topbar__logo"
              />
            ) : (
              <span className="staff-topbar__mark" aria-hidden />
            )}
            <span>{brand.name}</span>
            <span className="staff-topbar__badge">Nhân viên</span>
          </Link>
          <nav className={`staff-topbar__nav${navOpen ? ' staff-topbar__nav--open' : ''}`} aria-label="Menu nhân viên">
            <NavLink to="/staff" className="staff-topbar__navLink" end>
              <LayoutGrid size={14} />
              Tiếp đón
            </NavLink>
            <NavLink to="/staff/kitchen" className="staff-topbar__navLink">
              <ChefHat size={14} />
              Bếp & gọi món
            </NavLink>
            {/* <NavLink to="/staff/reports" className="staff-topbar__navLink">
              <BarChart3 size={14} />
              Doanh thu
            </NavLink> */}
          </nav>
        </div>
        <div className="staff-topbar__right">
          <NotificationBell />
          <span className="staff-topbar__user" title={me?.email || ''}>
            {me?.fullName || me?.email || '…'}
          </span>
          <button type="button" className="staff-topbar__logout" onClick={handleLogout}>
            <LogOut size={14} />
            Đăng xuất
          </button>
          <button
            type="button"
            className="staff-topbar__hamburger"
            aria-label={navOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>

      <main className="staff-main">
        <Outlet />
      </main>
    </div>
  )
}
