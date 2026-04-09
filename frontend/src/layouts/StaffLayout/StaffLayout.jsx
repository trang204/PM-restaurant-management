import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, ChefHat, BarChart3, LogOut } from 'lucide-react'
import { apiFetch, setToken } from '../../lib/api'
import NotificationBell from '../../components/NotificationBell.jsx'
import './StaffLayout.css'

export default function StaffLayout() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)

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
            <span>Luxeat</span>
            <span className="staff-topbar__badge">Nhân viên</span>
          </Link>
          <nav className="staff-topbar__nav" aria-label="Menu nhân viên">
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
        </div>
      </header>

      <main className="staff-main">
        <Outlet />
      </main>
    </div>
  )
}
