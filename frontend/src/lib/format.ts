export function formatCurrency(amount: number | string): string {
  const num = Number(amount)
  if (Number.isNaN(num)) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(num)
    .replace('₫', 'đ')
}

export function formatPercent(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? '+100%' : 'Không có dữ liệu'
  }
  const growth = ((current - previous) / previous) * 100
  const sign = growth > 0 ? '+' : ''
  return `${sign}${growth.toFixed(1)}%`
}
