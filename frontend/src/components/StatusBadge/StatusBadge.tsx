import './StatusBadge.css'

export type StatusType = 
  | 'HOLD'
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'PAID'
  | 'UNPAID'
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'MAINTENANCE'
  | 'ACTIVE'
  | 'INACTIVE'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const norm = String(status || '').toUpperCase()
  let colorClass = 'status-badge--default'
  let displayLabel = label || norm

  if (norm === 'HOLD') {
    colorClass = 'status-badge--default'
    if (!label) displayLabel = 'Chờ Xác nhận'
  } else if (norm === 'PENDING') {
    colorClass = 'status-badge--yellow'
    if (!label) displayLabel = 'Chờ xử lý'
  } else if (norm === 'CONFIRMED') {
    colorClass = 'status-badge--blue'
    if (!label) displayLabel = 'Đã xác nhận'
  } else if (norm === 'CHECKED_IN') {
    colorClass = 'status-badge--purple'
    if (!label) displayLabel = 'Đã nhận bàn'
  } else if (norm === 'COMPLETED' || norm === 'PAID' || norm === 'AVAILABLE' || norm === 'ACTIVE') {
    colorClass = 'status-badge--green'
    if (!label) {
      if (norm === 'COMPLETED') displayLabel = 'Hoàn thành'
      if (norm === 'PAID') displayLabel = 'Đã thanh toán'
      if (norm === 'AVAILABLE') displayLabel = 'Sẵn sàng'
      if (norm === 'ACTIVE') displayLabel = 'Hoạt động'
    }
  } else if (norm === 'CANCELLED' || norm === 'UNPAID' || norm === 'UNAVAILABLE' || norm === 'MAINTENANCE' || norm === 'INACTIVE') {
    colorClass = 'status-badge--red'
    if (!label) {
      if (norm === 'CANCELLED') displayLabel = 'Đã hủy'
      if (norm === 'UNPAID') displayLabel = 'Chưa thanh toán'
      if (norm === 'UNAVAILABLE') displayLabel = 'Không khả dụng'
      if (norm === 'MAINTENANCE') displayLabel = 'Đang bảo trì'
      if (norm === 'INACTIVE') displayLabel = 'Đã khóa'
    }
  }

  return (
    <span className={`status-badge ${colorClass} ${className}`}>
      {displayLabel}
    </span>
  )
}
