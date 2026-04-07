import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { apiFetch, setToken } from '../../lib/api'
import './AdminLayout.css'

/** Cấu trúc menu cây: link đơn hoặc nhóm có con */
const tree = [
  { type: 'link', to: '/admin', label: 'Tổng quan', end: true },
  {
    type: 'group',
    id: 'van-hanh',
    label: 'Vận hành',
    children: [
      { to: '/admin/bookings', label: 'Đặt bàn' },
      { to: '/admin/tables', label: 'Bàn' },
    ],
  },
  {
    type: 'group',
    id: 'thuc-don',
    label: 'Thực đơn',
    children: [{ to: '/admin/menu', label: 'Món ăn' }],
  },
  {
    type: 'group',
    id: 'he-thong',
    label: 'Hệ thống',
    children: [
      { to: '/admin/users', label: 'Người dùng' },
      { to: '/admin/settings', label: 'Cài đặt' },
    ],
  },
]

function pathOpensGroup(pathname) {
  const s = new Set()
  if (pathname.startsWith('/admin/bookings') || pathname.startsWith('/admin/tables')) s.add('van-hanh')
  if (pathname.startsWith('/admin/menu')) s.add('thuc-don')
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/settings')) s.add('he-thong')
  return s
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openGroups, setOpenGroups] = useState(() => new Set(['van-hanh', 'thuc-don', 'he-thong']))
  const [me, setMe] = useState(null)

  useEffect(() => {
    setOpenGroups((prev) => {
      const n = new Set(prev)
      pathOpensGroup(pathname).forEach((id) => n.add(id))
      return n
    })
  }, [pathname])

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      navigate('/login')
      return
    }
    apiFetch('/users/me')
      .then((u) => {
        setMe(u)
        if (u.role !== 'ADMIN') navigate('/')
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  function toggleGroup(id) {
    setOpenGroups((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function handleLogout() {
    setToken(null)
    setMe(null)
    navigate('/login')
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar" aria-label="Điều hướng quản trị">
        <NavLink to="/" className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark" aria-hidden />
          <span className="admin-sidebar__brand-text">Luxeat Admin</span>
        </NavLink>

        <nav className="admin-sidebar__nav admin-tree" aria-label="Menu cây">
          <ul className="admin-tree__root">
            {tree.map((node) => {
              if (node.type === 'link') {
                return (
                  <li key={node.to} className="admin-tree__item admin-tree__item--root">
                    <NavLink
                      to={node.to}
                      end={node.end}
                      className={({ isActive }) =>
                        `admin-tree__link${isActive ? ' admin-tree__link--active' : ''}`
                      }
                    >
                      {node.label}
                    </NavLink>
                  </li>
                )
              }

              const isOpen = openGroups.has(node.id)
              const childActive = node.children.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`))

              return (
                <li key={node.id} className="admin-tree__item admin-tree__item--root">
                  <button
                    type="button"
                    className={`admin-tree__branch${childActive ? ' admin-tree__branch--child-active' : ''}`}
                    onClick={() => toggleGroup(node.id)}
                    aria-expanded={isOpen}
                  >
                    <span className={`admin-tree__chevron${isOpen ? ' admin-tree__chevron--open' : ''}`} aria-hidden />
                    <span className="admin-tree__branch-label">{node.label}</span>
                  </button>
                  {isOpen ? (
                    <ul className="admin-tree__children">
                      {node.children.map((child) => (
                        <li key={child.to} className="admin-tree__item">
                          <NavLink
                            to={child.to}
                            className={({ isActive }) =>
                              `admin-tree__link admin-tree__link--leaf${isActive ? ' admin-tree__link--active' : ''}`
                            }
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="admin-sidebar__footer">
          <span className="admin-sidebar__version">API</span>
        </div>
      </aside>

      <div className="admin-body">
        <header className="admin-topbar">
          <div className="admin-topbar__spacer" />
          <div className="admin-topbar__actions">
            <span className="admin-topbar__name">{me?.fullName || me?.email || '...'}</span>
            <div className="admin-topbar__avatar" title="Admin" aria-hidden>
              {(me?.email || 'A').slice(0, 2).toUpperCase()}
            </div>
            <button type="button" className="admin-topbar__logout" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
