export const USER_STATUS = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Bị khóa',
}

export const TABLE_STATUS = {
  AVAILABLE: 'Còn trống',
  OCCUPIED: 'Đang dùng',
  IN_USE: 'Đang dùng',
  'IN USE': 'Đang dùng',
  RESERVED: 'Đang giữ',
  CLOSED: 'Bảo trì',
}

export const RESERVATION_STATUS = {
  PENDING: 'Chờ xác nhận',
  HOLD: 'Đang giữ bàn',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã vào bàn',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
}

export const KITCHEN_STATUS = {
  PENDING: 'Đang chờ bếp',
  SERVING: 'Đang phục vụ',
  DONE: 'Đã xong',
  CANCELLED: 'Đã hủy',
  ACKNOWLEDGED: 'Đã nhận làm',
  SERVED: 'Đã lên món',
}

export const PAYMENT_STATUS = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
}

const ALL_STATUS_LABELS: Record<string, string> = {
  ...USER_STATUS,
  ...TABLE_STATUS,
  ...RESERVATION_STATUS,
  ...KITCHEN_STATUS,
  ...PAYMENT_STATUS,
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã xuất bản',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn thành',
  PROCESSING: 'Đang xử lý',
  PAID: 'Đã thanh toán',
  UNPAID: 'Chưa thanh toán',
  CONFIRMED: 'Đã xác nhận',
  AVAILABLE: 'Còn trống',
  OCCUPIED: 'Đang sử dụng',
  RESERVED: 'Đã đặt',
}

export function getStatusLabel(status: string | null | undefined, type?: 'user' | 'table' | 'reservation' | 'kitchen' | 'payment'): string {
  if (!status) return '—'
  const key = String(status).trim().toUpperCase()
  if (type === 'user') return USER_STATUS[key as keyof typeof USER_STATUS] || ALL_STATUS_LABELS[key] || status
  if (type === 'table') return TABLE_STATUS[key as keyof typeof TABLE_STATUS] || ALL_STATUS_LABELS[key] || status
  if (type === 'reservation') return RESERVATION_STATUS[key as keyof typeof RESERVATION_STATUS] || ALL_STATUS_LABELS[key] || status
  if (type === 'kitchen') return KITCHEN_STATUS[key as keyof typeof KITCHEN_STATUS] || ALL_STATUS_LABELS[key] || status
  if (type === 'payment') return PAYMENT_STATUS[key as keyof typeof PAYMENT_STATUS] || ALL_STATUS_LABELS[key] || status
  return ALL_STATUS_LABELS[key] || status
}
