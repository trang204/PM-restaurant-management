import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout/AppLayout'
import Menu from './pages/Menu/Menu'
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import Profile from './pages/Profile/Profile'
import BookTable from './pages/Booking/BookTable'
import ReservationHistory from './pages/Booking/ReservationHistory'
import ReservationDetail from './pages/Booking/ReservationDetail'
import AdminLayout from './layouts/AdminLayout/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminReservations from './pages/Admin/Reservations'
import AdminMenuItems from './pages/Admin/MenuItems'
import AdminCategories from './pages/Admin/Categories'
import AdminTables from './pages/Admin/Tables'
import AdminUsers from './pages/Admin/Users'
import AdminReports from './pages/Admin/Reports'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/book" element={<BookTable />} />
        <Route path="/reservations" element={<ReservationHistory />} />
        <Route path="/reservations/:id" element={<ReservationDetail />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="menu-items" element={<AdminMenuItems />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="tables" element={<AdminTables />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
