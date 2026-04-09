import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  TableProperties,
  ChefHat,
  BarChart3,
  UtensilsCrossed,
  Users,
  Settings,
  LogOut,
  Home,
} from 'lucide-react'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
import { fetchPublicSettings } from '../../lib/settings'
import NotificationBell from '../../components/NotificationBell.jsx'
import './AdminLayout.css'

const adminTree = [
  {
    type: 'link',
    to: '/admin',
    label: 'Tổng quan',
    end: true,
    icon: <LayoutDashboard size={16} />,
  },
  {
    type: 'group',
    id: 'van-hanh',
    label: 'Vận hành',
    children: [
      { to: '/admin/bookings', label: 'Đặt bàn', icon: <CalendarDays size={15} /> },
      { to: '/admin/tables', label: 'Quản lý bàn', icon: <TableProperties size={15} /> },
      { to: '/admin/kitchen', label: 'Bếp & gọi món', icon: <ChefHat size={15} /> },
      { to: '/admin/reports', label: 'Doanh thu', icon: <BarChart3 size={15} /> },
    ],
  },
  {
    type: 'group',
    id: 'thuc-don',
    label: 'Thực đơn',
    children: [
      { to: '/admin/menu', label: 'Món ăn', icon: <UtensilsCrossed size={15} /> },
    ],
  },
  {
    type: 'group',
    id: 'he-thong',
    label: 'Hệ thống',
    children: [
      { to: '/admin/users/customers', label: 'Người dùng', icon: <Users size={15} /> },
      { to: '/admin/settings', label: 'Cài đặt', icon: <Settings size={15} /> },
    ],
  },
]

function pathOpensGroup(pathname) {
  const s = new Set()
  if (
    pathname.startsWith('/admin/bookings') ||
    pathname.startsWith('/admin/tables') ||
    pathname.startsWith('/admin/reports') ||
    pathname.startsWith('/admin/kitchen')
  )
    s.add('van-hanh')
  if (pathname.startsWith('/admin/menu')) s.add('thuc-don')
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/settings')) s.add('he-thong')
  return s
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openGroups, setOpenGroups] = useState(() => new Set(['van-hanh', 'thuc-don', 'he-thong']))
  const [me, setMe] = useState(null)
  const [brand, setBrand] = useState({ name: 'Luxeat', logoUrl: null })

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
        if (u.role !== 'ADMIN') {
          if (u.role === 'STAFF') navigate('/staff', { replace: true })
          else navigate('/')
        }
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  useEffect(() => {
    fetchPublicSettings()
      .then((s) => setBrand({ name: s.restaurantName?.trim() || 'Luxeat', logoUrl: s.logoUrl }))
      .catch(() => setBrand({ name: 'Luxeat', logoUrl: null }))
  }, [])

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
          {brand.logoUrl ? (
            <img
              className="admin-sidebar__brand-logo"
              src={mediaUrl(brand.logoUrl)}
              alt=""
              width={34}
              height={34}
            />
          ) : (
            <span className="admin-sidebar__brand-mark" aria-hidden />
          )}
          <span className="admin-sidebar__brand-text">{brand.name} Admin</span>
        </NavLink>

        <nav className="admin-sidebar__nav admin-tree" aria-label="Menu điều hướng">
          <ul className="admin-tree__root">
            {adminTree.map((node) => {
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
                      {node.icon}
                      {node.label}
                    </NavLink>
                  </li>
                )
              }

              const isOpen = openGroups.has(node.id)
              const childActive = node.children.some(
                (c) => pathname === c.to || pathname.startsWith(`${c.to}/`),
              )

              return (
                <li key={node.id} className="admin-tree__item admin-tree__item--root">
                  <button
                    type="button"
                    className={`admin-tree__branch${childActive ? ' admin-tree__branch--child-active' : ''}`}
                    onClick={() => toggleGroup(node.id)}
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`admin-tree__chevron${isOpen ? ' admin-tree__chevron--open' : ''}`}
                      aria-hidden
                    />
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
                            {child.icon}
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
          <NavLink
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'rgba(158,144,128,0.6)',
              textDecoration: 'none',
              fontSize: '0.78rem',
              fontWeight: 500,
            }}
          >
            <Home size={13} />
            Trang chủ
          </NavLink>
        </div>
      </aside>

      <div className="admin-body">
        <header className="admin-topbar">
          <div className="admin-topbar__spacer" />
          <div className="admin-topbar__actions">
            <NotificationBell />
            <span className="admin-topbar__name">{me?.fullName || me?.email || '...'}</span>
            <div className="admin-topbar__avatar" title={me?.email || 'Admin'} aria-hidden>
              {(me?.email || 'A').slice(0, 2).toUpperCase()}
            </div>
            <button type="button" className="admin-topbar__logout" onClick={handleLogout}>
              <LogOut size={14} />
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
