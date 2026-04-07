import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'

export default function AppLayout() {
  return (
    <div className="appShell">
      <header className="appHeader">
        <div className="appHeader__inner">
          <NavLink to="/" className="brand">
            <span className="brand__mark" aria-hidden />
            <span className="brand__text">Luxeat</span>
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
            <NavLink to="/login" className="nav__link nav__cta">
              Đăng nhập
            </NavLink>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="appFooter">
        <div className="appFooter__inner">
          <span>© {new Date().getFullYear()} Luxeat · Ẩm thực và đặt bàn</span>
          <div className="appFooter__links">
            <NavLink to="/menu" className="appFooter__link appFooter__link--muted">
              Thực đơn
            </NavLink>
            <NavLink to="/book" className="appFooter__link appFooter__link--muted">
              Đặt bàn
            </NavLink>
            <NavLink to="/admin" className="appFooter__link">
              Khu quản trị
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  )
}

