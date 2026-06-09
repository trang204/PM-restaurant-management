import React, { useEffect, useState, useMemo } from 'react'
import { Search, SearchX, Receipt } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import AdminPagination from '../../components/AdminPagination'
import { formatCurrency } from '../../lib/format'
import DetailModal from '../../components/DetailModal/DetailModal'
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
  
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null)

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
                    return (
                      <tr key={row.paymentId}>
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
                            onClick={() => setSelectedInvoice(row)}
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
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

            {selectedInvoice && (
              <DetailModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                title={`Chi tiết thanh toán #${selectedInvoice.paymentId}`}
                subtitle={`Đơn hàng #${selectedInvoice.orderId} - ${selectedInvoice.paidAt ? new Date(selectedInvoice.paidAt).toLocaleString('vi-VN') : '—'}`}
                width={700}
              >
                <DetailModal.Card title="Chi tiết món">
                  {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                    <DetailModal.Table>
                      <thead>
                        <tr>
                          <th>Tên món</th>
                          <th>SL</th>
                          <th>Đơn giá</th>
                          <th style={{ textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((it, idx) => (
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
                    </DetailModal.Table>
                  ) : (
                    <p>Không có chi tiết món.</p>
                  )}
                </DetailModal.Card>

                <DetailModal.Card title="Tổng quan">
                  <DetailModal.Row label="Thuế VAT" value={selectedInvoice.tax ? formatCurrency(Number(selectedInvoice.tax)) : '0 đ'} />
                  <DetailModal.Row label="Giảm giá" value={selectedInvoice.discount ? `-${formatCurrency(Number(selectedInvoice.discount))}` : '0 đ'} />
                  <DetailModal.Row label="Phụ thu" value={selectedInvoice.surcharge ? formatCurrency(Number(selectedInvoice.surcharge)) : '0 đ'} />
                  <DetailModal.Row label="Ghi chú" value={selectedInvoice.note || 'Không có'} />
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(Number(selectedInvoice.amount || 0))}</span>
                  </div>
                </DetailModal.Card>
              </DetailModal>
            )}
          </>
        )}
      </div>
    </div>
  )
}
