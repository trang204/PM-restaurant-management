import React, { useEffect, useState, useMemo } from 'react'
import { Search, SearchX, Receipt } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import AdminPagination from '../../components/AdminPagination'
import { formatCurrency } from '../../lib/format'
import './PaymentHistory.css'

type InvoiceLine = {
  foodName: string; quantity: number; unitPrice: string | number; lineTotal: string | number
}
type InvoiceRow = {
  paymentId: number; orderId: number; amount: string | number
  method: string | null; paidAt: string; items: InvoiceLine[]
  transactionCode?: string | null
  cashierId?: number | null
  cashierName?: string | null
  note?: string | null
  tax?: string | number | null
  discount?: string | number | null
  surcharge?: string | number | null
}

function methodLabel(m: string | null) {
  if (!m) return '—'
  const u = m.toUpperCase()
  if (u === 'CASH') return 'Tiền mặt'
  if (u === 'BANK' || u === 'TRANSFER' || u === 'BANK_TRANSFER') return 'Chuyển khoản'
  return m
}

export default function PaymentHistory() {
  const [data, setData] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch<InvoiceRow[]>('/admin/reports/revenue/invoices')
      .then(rows => {
        if (!cancelled) setData(Array.isArray(rows) ? rows : [])
      })
      .catch(e => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    let res = data
    if (q.trim()) {
      const qs = q.trim().toLowerCase()
      res = res.filter(r => 
        String(r.paymentId).includes(qs) || 
        String(r.orderId).includes(qs) ||
        (r.transactionCode && r.transactionCode.toLowerCase().includes(qs))
      )
    }
    return res
  }, [data, q])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return visible.slice(start, start + pageSize)
  }, [visible, page, pageSize])

  return (
    <div className="payment-history">
      <header className="payment-history__header">
        <h1 className="payment-history__title">Lịch sử thanh toán</h1>
      </header>
      
      <div className="payment-history__controls">
        <div className="payment-history__search">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo mã TT, mã đơn hoặc mã giao dịch..." 
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="payment-history__card">
        {loading ? (
          <p style={{ padding: 20 }}>Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="payment-history__err">{error}</p>
        ) : visible.length === 0 ? (
          <div className="payment-history__empty">
            <SearchX size={48} />
            <p>Không tìm thấy hóa đơn thanh toán nào.</p>
          </div>
        ) : (
          <>
            <div className="payment-history__table-wrap">
              <table className="payment-history__table">
                <thead>
                  <tr>
                    <th>Mã TT</th>
                    <th>Mã đơn</th>
                    <th>Thời gian</th>
                    <th>Phương thức</th>
                    <th>Thu ngân</th>
                    <th>Mã giao dịch</th>
                    <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                    <th style={{ textAlign: 'center' }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => {
                    const isExpanded = expandedId === row.paymentId
                    return (
                      <React.Fragment key={row.paymentId}>
                        <tr className={isExpanded ? 'payment-history__row--expanded' : ''}>
                          <td><strong>#{row.paymentId}</strong></td>
                          <td>#{row.orderId}</td>
                          <td>
                            {row.paidAt 
                              ? new Date(row.paidAt).toLocaleString('vi-VN') 
                              : '—'}
                          </td>
                          <td>
                            <span className="payment-history__methodBadge">
                              {methodLabel(row.method)}
                            </span>
                          </td>
                          <td>{row.cashierName || 'Hệ thống'}</td>
                          <td>{row.transactionCode || '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <strong className="payment-history__money">
                              {formatCurrency(Number(row.amount || 0))}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button"
                              className="payment-history__toggleBtn"
                              onClick={() => setExpandedId(isExpanded ? null : row.paymentId)}
                            >
                              {isExpanded ? 'Đóng' : 'Xem'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="payment-history__detailRow">
                            <td colSpan={8}>
                              <div className="payment-history__detailInner">
                                <h4>Chi tiết món</h4>
                                {Array.isArray(row.items) && row.items.length > 0 ? (
                                  <table className="payment-history__itemsTable">
                                    <thead>
                                      <tr>
                                        <th>Tên món</th>
                                        <th>SL</th>
                                        <th>Đơn giá</th>
                                        <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.items.map((it, idx) => (
                                        <tr key={idx}>
                                          <td>{it.foodName}</td>
                                          <td>{it.quantity}</td>
                                          <td>{formatCurrency(Number(it.unitPrice || 0))}</td>
                                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                            {formatCurrency(Number(it.lineTotal || 0))}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p>Không có chi tiết món.</p>
                                )}
                                
                                <div className="payment-history__metaGrid">
                                  <div><span>Thuế VAT:</span> <strong>{row.tax ? formatCurrency(Number(row.tax)) : '0 đ'}</strong></div>
                                  <div><span>Giảm giá:</span> <strong>{row.discount ? `-${formatCurrency(Number(row.discount))}` : '0 đ'}</strong></div>
                                  <div><span>Phụ thu:</span> <strong>{row.surcharge ? formatCurrency(Number(row.surcharge)) : '0 đ'}</strong></div>
                                  <div><span>Ghi chú:</span> <strong>{row.note || 'Không có'}</strong></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <AdminPagination
              className="payment-history__pagination"
              page={page}
              pageSize={pageSize}
              total={visible.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  )
}
