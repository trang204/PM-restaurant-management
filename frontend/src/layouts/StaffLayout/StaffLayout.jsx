import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, ChefHat, BarChart3, LogOut, Menu as MenuIcon, X } from 'lucide-react'
import { apiFetch, setToken } from '../../lib/api'
import { fetchPublicSettings } from '../../lib/settings'
import NotificationBell from '../../components/NotificationBell.jsx'
import './StaffLayout.css'

export default function StaffLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [me, setMe] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const [brandName, setBrandName] = useState('Nhà hàng')

  useEffect(() => { setNavOpen(false) }, [pathname])

  useEffect(() => {
    fetchPublicSettings()
      .then((s) => setBrandName(s.restaurantName?.trim() || 'Nhà hàng'))
      .catch(() => {})
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

  function handleLogout() {
    setToken(null)
    setMe(null)
    navigate('/login', { replace: true })
  }

  return (
    <div className="staff-app">
      <header className="staff-topbar">
        <div className="staff-topbar__left">
          <Link to="/staff" className="staff-topbar__brand">
            <span className="staff-topbar__mark" aria-hidden />
            <span>{brandName}</span>
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
            <NavLink to="/staff/reports" className="staff-topbar__navLink">
              <BarChart3 size={14} />
              Doanh thu
            </NavLink>
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
