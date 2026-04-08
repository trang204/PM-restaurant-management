import BookingManagement from '../Admin/BookingManagement.jsx'

/** Trang duy nhất trong khu nhân viên: gán bàn, xác nhận, check-in, QR gọi món. */
export default function StaffDesk() {
  return <BookingManagement staffMode />
}
