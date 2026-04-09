import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './RevenueReports.css'

type GroupBy = 'day' | 'month' | 'quarter' | 'year'

type SeriesRow = { date: string; revenue: string | number }

type RevenueRes = {
  from: string | null
  to: string | null
  groupBy: GroupBy
  total: string | number
  series: SeriesRow[]
}

type InvoiceLine = {
  foodName: string
  quantity: number
  unitPrice: string | number
  lineTotal: string | number
}

type InvoiceRow = {
  paymentId: number
  orderId: number
  amount: string | number
  method: string | null
  paidAt: string
  items: InvoiceLine[]
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Biên khoảng [from, to] (ngày) trùng cách lọc `paid_at` ở backend, theo một dòng biểu đồ báo cáo. */
function periodBounds(periodStart: string, groupBy: GroupBy): { from: string; to: string } {
  const s = periodStart.slice(0, 10)
  const [Y, M, _d] = s.split('-').map(Number)
  if (!Number.isFinite(Y) || !Number.isFinite(M)) return { from: s, to: s }

  if (groupBy === 'day') {
    return { from: s, to: s }
  }

  if (groupBy === 'month') {
    const last = new Date(Y, M, 0).getDate()
    return { from: ymd(Y, M, 1), to: ymd(Y, M, last) }
  }

  if (groupBy === 'year') {
    return { from: `${Y}-01-01`, to: `${Y}-12-31` }
  }

  // quarter: periodStart = ngày đầu quý (theo DATE_TRUNC của PostgreSQL)
  const firstMoIndex = M - 1
  const lastMoIndex = firstMoIndex + 2
  const lastDay = new Date(Y, lastMoIndex + 1, 0).getDate()
  return {
    from: ymd(Y, M, 1),
    to: ymd(Y, lastMoIndex + 1, lastDay),
  }
}

function startOfYear() {
  const d = new Date()
  return `${d.getFullYear()}-01-01`
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatAxisLabel(d: string, groupBy: GroupBy) {
  const s = String(d).slice(0, 10)
  if (groupBy === 'year') return s.slice(0, 4)
  if (groupBy === 'quarter' || groupBy === 'month') return s
  return s
}

function formatMoney(n: number) {
  return `${n.toLocaleString('vi-VN')} ₫`
}

export default function RevenueReports() {
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [from, setFrom] = useState(startOfYear)
  const [to, setTo] = useState(todayStr)
  const [data, setData] = useState<RevenueRes | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState<{
    label: string
    from: string
    to: string
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('groupBy', groupBy)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [groupBy, from, to])

  useEffect(() => {
    let c = false
    setLoading(true)
    setErr(null)
    apiFetch<RevenueRes>(`/admin/reports/revenue?${qs}`)
      .then((d) => {
        if (!c) setData(d)
      })
      .catch((e) => {
        if (!c) setErr((e as Error).message)
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [qs])

  const total = data?.total != null ? Number(data.total) : 0
  const series = data?.series || []

  useEffect(() => {
    if (!detailOpen) return
    let c = false
    setDetailLoading(true)
    setDetailErr(null)
    const q = new URLSearchParams()
    q.set('from', detailOpen.from)
    q.set('to', detailOpen.to)
    apiFetch<InvoiceRow[]>(`/admin/reports/revenue/invoices?${q}`)
      .then((rows) => {
        if (!c) setInvoices(Array.isArray(rows) ? rows : [])
      })
      .catch((e) => {
        if (!c) setDetailErr((e as Error).message)
      })
      .finally(() => {
        if (!c) setDetailLoading(false)
      })
    return () => {
      c = true
    }
  }, [detailOpen])

  function openPeriodDetail(row: SeriesRow) {
    const { from: pf, to: pt } = periodBounds(String(row.date), groupBy)
    setDetailOpen({
      label: formatAxisLabel(String(row.date), groupBy),
      from: pf,
      to: pt,
    })
  }

  function methodLabel(m: string | null) {
    if (!m) return '—'
    const u = m.toUpperCase()
    if (u === 'CASH') return 'Tiền mặt'
    if (u === 'CARD' || u === 'VNPAY' || u === 'MOMO') return m
    return m
  }

  return (
    <div className="rev-report">
      <header className="rev-report__header">
        <div>
          <h1 className="rev-report__title">Thống kê doanh thu</h1>
          <p className="rev-report__subtitle">
            Tổng doanh thu theo ngày / tháng / quý / năm (từ các khoản thanh toán đã hoàn tất). Click một dòng để xem chi tiết từng hóa đơn và món.
          </p>
        </div>
      </header>

      <section className="rev-report__filters" aria-label="Bộ lọc">
        <div className="rev-report__tabs" role="tablist" aria-label="Nhóm thời gian">
          {(
            [
              ['day', 'Theo ngày'],
              ['month', 'Theo tháng'],
              ['quarter', 'Theo quý'],
              ['year', 'Theo năm'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={groupBy === k}
              className={`rev-report__tab${groupBy === k ? ' rev-report__tab--on' : ''}`}
              onClick={() => setGroupBy(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rev-report__dates">
          <label className="rev-report__date">
            <span>Từ</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="rev-report__date">
            <span>Đến</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </section>

      {loading ? <p className="rev-report__hint">Đang tải…</p> : null}
      {err ? <p className="rev-report__err">{err}</p> : null}

      {!loading && !err ? (
        <section className="rev-report__summary" aria-live="polite">
          <p className="rev-report__totalLabel">Tổng trong khoảng</p>
          <p className="rev-report__totalValue">{formatMoney(total)}</p>
        </section>
      ) : null}

      {!loading && !err && series.length > 0 ? (
        <div className="rev-report__table-wrap">
          <table className="rev-report__table">
            <thead>
              <tr>
                <th>Kỳ</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {series.map((row) => (
                <tr
                  key={String(row.date)}
                  className="rev-report__rowClick"
                  tabIndex={0}
                  role="button"
                  aria-label={`Xem chi tiết hóa đơn kỳ ${formatAxisLabel(String(row.date), groupBy)}`}
                  onClick={() => openPeriodDetail(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openPeriodDetail(row)
                    }
                  }}
                >
                  <td>{formatAxisLabel(String(row.date), groupBy)}</td>
                  <td>
                    <span className="rev-report__cellMoney">{formatMoney(Number(row.revenue || 0))}</span>
                    <span className="rev-report__cellHint">Chi tiết →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !err && series.length === 0 ? (
        <p className="rev-report__empty">Chưa có dữ liệu thanh toán trong khoảng đã chọn.</p>
      ) : null}

      {detailOpen ? (
        <div
          className="rev-report__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rev-detail-title"
          onClick={() => setDetailOpen(null)}
        >
          <div className="rev-report__modal" onClick={(e) => e.stopPropagation()}>
            <div className="rev-report__modalHead">
              <div>
                <h2 id="rev-detail-title" className="rev-report__modalTitle">
                  Chi tiết hóa đơn — kỳ {detailOpen.label}
                </h2>
                <p className="rev-report__modalSub">
                  {detailOpen.from === detailOpen.to
                    ? `Ngày ${detailOpen.from}`
                    : `Từ ${detailOpen.from} đến ${detailOpen.to}`}
                </p>
              </div>
              <button type="button" className="rev-report__modalClose" onClick={() => setDetailOpen(null)}>
                Đóng
              </button>
            </div>

            {detailLoading ? <p className="rev-report__hint">Đang tải…</p> : null}
            {detailErr ? <p className="rev-report__err">{detailErr}</p> : null}

            {!detailLoading && !detailErr && invoices.length === 0 ? (
              <p className="rev-report__empty">Không có hóa đơn trong kỳ này.</p>
            ) : null}

            {!detailLoading && !detailErr && invoices.length > 0 ? (
              <ul className="rev-report__invoiceList">
                {invoices.map((inv) => (
                  <li key={inv.paymentId} className="rev-report__invoiceCard">
                    <div className="rev-report__invoiceMeta">
                      <span>
                        Hóa đơn #{inv.orderId} · Thanh toán #{inv.paymentId}
                      </span>
                      <span className="rev-report__invoiceMetaRight">
                        {inv.paidAt
                          ? new Date(inv.paidAt).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="rev-report__invoiceMeta rev-report__invoiceMeta--second">
                      <span>{methodLabel(inv.method)}</span>
                      <strong>{formatMoney(Number(inv.amount || 0))}</strong>
                    </div>
                    {Array.isArray(inv.items) && inv.items.length > 0 ? (
                      <table className="rev-report__itemsTable">
                        <thead>
                          <tr>
                            <th>Món</th>
                            <th>SL</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.items.map((it, idx) => (
                            <tr key={`${inv.paymentId}-${idx}`}>
                              <td>{it.foodName}</td>
                              <td>{it.quantity}</td>
                              <td>{formatMoney(Number(it.unitPrice || 0))}</td>
                              <td>{formatMoney(Number(it.lineTotal || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="rev-report__noItems">Không có dòng món (chỉ có tổng thanh toán).</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
