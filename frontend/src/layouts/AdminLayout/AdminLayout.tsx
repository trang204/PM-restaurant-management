import { NavLink, Outlet } from 'react-router-dom'
import './AdminLayout.css'

const links = [
  { to: '/admin', label: 'Tổng quan' },
  { to: '/admin/reservations', label: 'Đơn đặt bàn' },
  { to: '/admin/menu-items', label: 'Món ăn' },
  { to: '/admin/categories', label: 'Danh mục' },
  { to: '/admin/tables', label: 'Bàn' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/reports', label: 'Thống kê' },
]

export default function AdminLayout() {
  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <NavLink to="/" className="adminBrand">
          Luxeat Admin
        </NavLink>
        <nav className="adminNav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="adminNav__link" end={l.to === '/admin'}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="adminMain">
        <Outlet />
      </main>
    </div>
  )
}

