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

  return (
    <div className="rev-report">
      <header className="rev-report__header">
        <div>
          <h1 className="rev-report__title">Thống kê doanh thu</h1>
          <p className="rev-report__subtitle">
            Tổng doanh thu theo ngày / tháng / quý / năm (từ các khoản thanh toán đã hoàn tất).
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
                <tr key={String(row.date)}>
                  <td>{formatAxisLabel(String(row.date), groupBy)}</td>
                  <td>{formatMoney(Number(row.revenue || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !err && series.length === 0 ? (
        <p className="rev-report__empty">Chưa có dữ liệu thanh toán trong khoảng đã chọn.</p>
      ) : null}
    </div>
  )
}
