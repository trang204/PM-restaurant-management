import { Navigate, useParams } from 'react-router-dom'

/** Deep link `/reservations/:id` → lịch sử + mở popup chi tiết qua query `detail`. */
export default function ReservationsIdRedirect() {
  const { id } = useParams()
  if (!id) return <Navigate to="/reservations" replace />
  return <Navigate to={`/reservations?detail=${encodeURIComponent(id)}`} replace />
}
