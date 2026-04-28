import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout/AppLayout'
import Menu from './pages/Menu/Menu'
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import Profile from './pages/Profile/Profile'
import BookTable from './pages/Booking/BookTable'
import ReservationHistory from './pages/Booking/ReservationHistory'
import ReservationDetail from './pages/Booking/ReservationDetail'
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx'
import StaffLayout from './layouts/StaffLayout/StaffLayout.jsx'
import StaffDesk from './pages/Staff/StaffDesk.jsx'
import KitchenOrders from './pages/Staff/KitchenOrders.jsx'
import Dashboard from './pages/Admin/Dashboard.jsx'
import BookingManagement from './pages/Admin/BookingManagement.jsx'
import TableManagement from './pages/Admin/TableManagement.jsx'
import TableLayoutEditor from './pages/Admin/TableLayoutEditor.jsx'
import MenuManagement from './pages/Admin/MenuManagement.jsx'
import UserManagement from './pages/Admin/UserManagement.jsx'
import Settings from './pages/Admin/Settings.jsx'
import RevenueReports from './pages/Admin/RevenueReports'
import TableOrder from './pages/TableOrder/TableOrder'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/book" element={<BookTable />} />
        <Route path="/reservations" element={<ReservationHistory />} />
        <Route path="/reservations/:id" element={<ReservationDetail />} />
        <Route path="/order/table/:token" element={<TableOrder />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<BookingManagement />} />
        <Route path="tables" element={<TableManagement />} />
        <Route path="tables/layout" element={<TableLayoutEditor />} />
        <Route path="menu" element={<MenuManagement />} />
        <Route path="users" element={<Navigate to="/admin/users/customers" replace />} />
        <Route path="users/:group" element={<UserManagement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="reports" element={<RevenueReports />} />
        <Route path="kitchen" element={<KitchenOrders />} />
      </Route>

      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<StaffDesk />} />
        <Route path="reports" element={<RevenueReports />} />
        <Route path="kitchen" element={<KitchenOrders />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
