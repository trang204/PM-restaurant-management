import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { apiFetch, setToken } from '../../lib/api'
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
        <Link to="/staff" className="staff-topbar__brand">
          <span className="staff-topbar__mark" aria-hidden />
          <span>Luxeat</span>
          <span className="staff-topbar__badge">Nhân viên</span>
        </Link>
        <div className="staff-topbar__right">
          <span className="staff-topbar__user" title={me?.email || ''}>
            {me?.fullName || me?.email || '…'}
          </span>
          <button type="button" className="staff-topbar__logout" onClick={handleLogout}>
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
