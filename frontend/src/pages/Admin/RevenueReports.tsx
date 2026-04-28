import { useEffect, useMemo, useState } from 'react'
import { BarChart3, TableProperties, ChevronDown, ChevronRight, X, Download, TrendingUp, CalendarRange } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiFetch } from '../../lib/api'
import AdminPagination from '../../components/AdminPagination'
import './RevenueReports.css'

/* ─── Types ─── */
type GroupBy = 'day' | 'month' | 'year'
type ReportTab = 'period' | 'table'

type SeriesRow = { date: string; revenue: string | number }
type RevenueRes = {
  from: string | null; to: string | null; groupBy: GroupBy
  total: string | number
  invoiceCount: number
  averageOrderValue: string | number
  previousTotal: string | number
  growthPercent: number
  previousRange: { from: string; to: string } | null
  series: SeriesRow[]
}

type InvoiceLine = {
  foodName: string; quantity: number; unitPrice: string | number; lineTotal: string | number
}
type InvoiceRow = {
  paymentId: number; orderId: number; amount: string | number
  method: string | null; paidAt: string; items: InvoiceLine[]
}
type TableRow = {
  tableId: number | null; tableName: string
  invoiceCount: number; total: string | number; invoices: InvoiceRow[]
}

/* ─── Helpers ─── */
function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function periodBounds(periodStart: string, groupBy: GroupBy): { from: string; to: string } {
  const s = periodStart.slice(0, 10)
  const [Y, M] = s.split('-').map(Number)
  if (!Number.isFinite(Y) || !Number.isFinite(M)) return { from: s, to: s }
  if (groupBy === 'day') return { from: s, to: s }
  if (groupBy === 'month') {
    const last = new Date(Y, M, 0).getDate()
    return { from: ymd(Y, M, 1), to: ymd(Y, M, last) }
  }
  if (groupBy === 'year') return { from: `${Y}-01-01`, to: `${Y}-12-31` }
  const lastMoIndex = (M - 1) + 2
  const lastDay = new Date(Y, lastMoIndex + 1, 0).getDate()
  return { from: ymd(Y, M, 1), to: ymd(Y, lastMoIndex + 1, lastDay) }
}

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatAxisLabel(d: string, groupBy: GroupBy) {
  const s = String(d).slice(0, 10)
  if (groupBy === 'year') return s.slice(0, 4)
  if (groupBy === 'month') {
    const [Y, M] = s.split('-').map(Number)
    if (Number.isFinite(Y) && Number.isFinite(M)) return `T${M}/${Y}`
  }
  return s
}
function formatMoney(n: number) {
  return `${n.toLocaleString('vi-VN')} ₫`
}
function formatPercent(n: number) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(0)}%`
}
function formatDateTimeExport(value: string) {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function methodLabel(m: string | null) {
  if (!m) return '—'
  const u = m.toUpperCase()
  if (u === 'CASH') return 'Tiền mặt'
  if (u === 'BANK' || u === 'TRANSFER' || u === 'BANK_TRANSFER') return 'Chuyển khoản'
  return m
}

function BarChart({ series, groupBy, onDetail }: { series: SeriesRow[]; groupBy: GroupBy; onDetail: (row: SeriesRow) => void }) {
  const max = Math.max(...series.map((row) => Number(row.revenue || 0)), 1)
  return (
    <div className="rev-chart">
      {series.map((row) => {
        const value = Number(row.revenue || 0)
        const height = `${Math.max(12, (value / max) * 100)}%`
        return (
          <button key={String(row.date)} type="button" className="rev-chart__barWrap" onClick={() => onDetail(row)}>
            <span className="rev-chart__value">{formatMoney(value)}</span>
            <span className="rev-chart__bar" style={{ height }} />
            <span className="rev-chart__label">{formatAxisLabel(String(row.date), groupBy)}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Invoice detail card (shared) ─── */
function InvoiceCard({ inv }: { inv: InvoiceRow }) {
  return (
    <li className="rev-report__invoiceCard">
      <div className="rev-report__invoiceMeta">
        <span>Hóa đơn #{inv.orderId} · TT #{inv.paymentId}</span>
        <span className="rev-report__invoiceMetaRight">
          {inv.paidAt
            ? new Date(inv.paidAt).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
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
            <tr><th>Món</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
          </thead>
          <tbody>
            {inv.items.map((it, idx) => (
              <tr key={idx}>
                <td>{it.foodName}</td>
                <td>{it.quantity}</td>
                <td>{formatMoney(Number(it.unitPrice || 0))}</td>
                <td>{formatMoney(Number(it.lineTotal || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rev-report__noItems">Không có chi tiết món.</p>
      )}
    </li>
  )
}

/* ─── Main component ─── */
export default function RevenueReports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('period')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [from, setFrom] = useState(startOfYear)
  const [to, setTo] = useState(todayStr)

  /* Period report state */
  const [data, setData] = useState<RevenueRes | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState<{ label: string; from: string; to: string } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [periodPage, setPeriodPage] = useState(1)
  const [periodPageSize, setPeriodPageSize] = useState(10)

  /* Table report state */
  const [tableData, setTableData] = useState<TableRow[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [tableErr, setTableErr] = useState<string | null>(null)
  const [expandedTable, setExpandedTable] = useState<number | string | null>(null)
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)

  /* Period query */
  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('groupBy', groupBy)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [groupBy, from, to])

  const dateQs = useMemo(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [from, to])

  useEffect(() => {
    if (activeTab !== 'period') return
    let c = false
    setLoading(true); setErr(null)
    apiFetch<RevenueRes>(`/admin/reports/revenue?${qs}`)
      .then((d) => { if (!c) setData(d) })
      .catch((e) => { if (!c) setErr((e as Error).message) })
      .finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [qs, activeTab])

  useEffect(() => {
    if (activeTab !== 'table') return
    let c = false
    setTableLoading(true); setTableErr(null)
    apiFetch<TableRow[]>(`/admin/reports/revenue/by-table?${dateQs}`)
      .then((rows) => { if (!c) setTableData(Array.isArray(rows) ? rows : []) })
      .catch((e) => { if (!c) setTableErr((e as Error).message) })
      .finally(() => { if (!c) setTableLoading(false) })
    return () => { c = true }
  }, [dateQs, activeTab])

  useEffect(() => {
    if (!detailOpen) return
    let c = false
    setDetailLoading(true); setDetailErr(null)
    const q = new URLSearchParams()
    q.set('from', detailOpen.from)
    q.set('to', detailOpen.to)
    apiFetch<InvoiceRow[]>(`/admin/reports/revenue/invoices?${q}`)
      .then((rows) => { if (!c) setInvoices(Array.isArray(rows) ? rows : []) })
      .catch((e) => { if (!c) setDetailErr((e as Error).message) })
      .finally(() => { if (!c) setDetailLoading(false) })
    return () => { c = true }
  }, [detailOpen])

  const total = data?.total != null ? Number(data.total) : 0
  const invoiceCount = Number(data?.invoiceCount || 0)
  const averageOrderValue = Number(data?.averageOrderValue || 0)
  const previousTotal = Number(data?.previousTotal || 0)
  const growthPercent = Number(data?.growthPercent || 0)
  const series = data?.series || []
  const tableTotal = tableData.reduce((s, r) => s + Number(r.total || 0), 0)
  useEffect(() => { setPeriodPage(1) }, [groupBy, from, to, activeTab])
  useEffect(() => { setTablePage(1) }, [from, to, activeTab])
  const pagedSeries = useMemo(() => {
    const start = (periodPage - 1) * periodPageSize
    return series.slice(start, start + periodPageSize)
  }, [series, periodPage, periodPageSize])
  const pagedTableData = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize
    return tableData.slice(start, start + tablePageSize)
  }, [tableData, tablePage, tablePageSize])

  async function exportExcel() {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    const rows = await apiFetch<InvoiceRow[]>(`/admin/reports/revenue/invoices?${q}`)

    const summaryAoA = [
      ['BAO CAO DOANH THU'],
      [],
      ['Khoang thoi gian', `${from || '—'} den ${to || '—'}`],
      ['Nhom xem', groupBy === 'day' ? 'Ngay' : groupBy === 'month' ? 'Thang' : 'Nam'],
      [],
      ['CHI SO TONG QUAN', 'GIA TRI'],
      ['Tong doanh thu', total],
      ['So don', invoiceCount],
      ['Gia tri trung binh', averageOrderValue],
      ['Ky truoc', previousTotal],
      ['Tang truong', Number(growthPercent.toFixed(2)) / 100],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoA)
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 22 }]
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
    ;['B7', 'B9', 'B10'].forEach((cell) => {
      if (summarySheet[cell]) summarySheet[cell].z = '#,##0 [$₫-vi-VN]'
    })
    if (summarySheet.B11) summarySheet.B11.z = '0.00%'

    const seriesSheet = XLSX.utils.json_to_sheet(
      series.map((row, index) => ({
        STT: index + 1,
        'Kỳ báo cáo': formatAxisLabel(String(row.date), groupBy),
        'Ngày gốc': String(row.date).slice(0, 10),
        'Doanh thu (VND)': Number(row.revenue || 0),
      })),
    )
    seriesSheet['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 18 }]
    for (let i = 2; i <= series.length + 1; i += 1) {
      const cell = `D${i}`
      if (seriesSheet[cell]) seriesSheet[cell].z = '#,##0 [$₫-vi-VN]'
    }

    const invoiceSheet = XLSX.utils.json_to_sheet(
      rows.map((row, index) => ({
        STT: index + 1,
        'Mã thanh toán': row.paymentId,
        'Mã đơn': row.orderId,
        'Phương thức': methodLabel(row.method),
        'Thời gian thanh toán': formatDateTimeExport(row.paidAt),
        'Số tiền (VND)': Number(row.amount || 0),
      })),
    )
    invoiceSheet['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
    ]
    for (let i = 2; i <= rows.length + 1; i += 1) {
      const cell = `F${i}`
      if (invoiceSheet[cell]) invoiceSheet[cell].z = '#,##0 [$₫-vi-VN]'
    }

    const detailRows = rows.flatMap((row) =>
      (row.items?.length ? row.items : [{ foodName: 'Không có chi tiết món', quantity: 0, unitPrice: 0, lineTotal: 0 }]).map((item, idx) => ({
        'Mã thanh toán': idx === 0 ? row.paymentId : '',
        'Mã đơn': idx === 0 ? row.orderId : '',
        'Thời gian thanh toán': idx === 0 ? formatDateTimeExport(row.paidAt) : '',
        'Phương thức': idx === 0 ? methodLabel(row.method) : '',
        'Món ăn': item.foodName,
        'Số lượng': Number(item.quantity || 0),
        'Đơn giá (VND)': Number(item.unitPrice || 0),
        'Thành tiền (VND)': Number(item.lineTotal || 0),
      })),
    )
    const itemsSheet = XLSX.utils.json_to_sheet(detailRows)
    itemsSheet['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 24 },
      { wch: 18 },
      { wch: 28 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
    ]
    for (let i = 2; i <= detailRows.length + 1; i += 1) {
      ;['G', 'H'].forEach((col) => {
        const cell = `${col}${i}`
        if (itemsSheet[cell]) itemsSheet[cell].z = '#,##0 [$₫-vi-VN]'
      })
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Tong_quan')
    XLSX.utils.book_append_sheet(wb, seriesSheet, 'Doanh_thu_theo_ky')
    XLSX.utils.book_append_sheet(wb, invoiceSheet, 'Hoa_don')
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'Chi_tiet_mon')
    XLSX.writeFile(wb, `doanh-thu-${from || 'all'}-${to || 'all'}.xlsx`)
  }

  function openPeriodDetail(row: SeriesRow) {
    const { from: pf, to: pt } = periodBounds(String(row.date), groupBy)
    setDetailOpen({ label: formatAxisLabel(String(row.date), groupBy), from: pf, to: pt })
  }

  return (
    <div className="rev-report">
      <header className="rev-report__header">
        <div>
          <h1 className="rev-report__title">Thống kê doanh thu</h1>
          <p className="rev-report__subtitle">
            Xem báo cáo theo kỳ hoặc theo từng bàn — click vào dòng để xem chi tiết hóa đơn và món.
          </p>
        </div>
        <button type="button" className="rev-report__exportBtn" onClick={exportExcel}>
          <Download size={15} />
          Xuất Excel
        </button>
      </header>

      {/* ── Top-level tabs ── */}
      <div className="rev-report__mainTabs">
        <button
          type="button"
          className={`rev-report__mainTab${activeTab === 'period' ? ' rev-report__mainTab--on' : ''}`}
          onClick={() => setActiveTab('period')}
        >
          <BarChart3 size={15} />
          Theo kỳ thời gian
        </button>
        <button
          type="button"
          className={`rev-report__mainTab${activeTab === 'table' ? ' rev-report__mainTab--on' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <TableProperties size={15} />
          Theo bàn
        </button>
      </div>

      {/* ── Filters (shared) ── */}
      <section className="rev-report__filters" aria-label="Bộ lọc">
        {activeTab === 'period' && (
          <div className="rev-report__tabs" role="tablist" aria-label="Nhóm thời gian">
            {([['day', 'Ngày'], ['month', 'Tháng'], ['year', 'Năm']] as const).map(([k, label]) => (
              <button
                key={k} type="button" role="tab"
                aria-selected={groupBy === k}
                className={`rev-report__tab${groupBy === k ? ' rev-report__tab--on' : ''}`}
                onClick={() => setGroupBy(k)}
              >{label}</button>
            ))}
          </div>
        )}
        <div className="rev-report__dates">
          <label className="rev-report__date">
            <span>Từ ngày</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="rev-report__date">
            <span>Đến ngày</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </section>

      {/* ══════════ TAB: PERIOD ══════════ */}
      {activeTab === 'period' && (
        <>
          {loading ? <p className="rev-report__hint">Đang tải…</p> : null}
          {err ? <p className="rev-report__err">{err}</p> : null}

          {!loading && !err ? (
            <section className="rev-report__summary" aria-live="polite">
              <div className="rev-report__summaryGrid">
                <article className="rev-report__kpi">
                  <p className="rev-report__totalLabel">Tổng doanh thu</p>
                  <p className="rev-report__totalValue">{formatMoney(total)}</p>
                </article>
                <article className="rev-report__kpi">
                  <p className="rev-report__totalLabel">Số đơn</p>
                  <p className="rev-report__kpiValue">{invoiceCount}</p>
                </article>
                <article className="rev-report__kpi">
                  <p className="rev-report__totalLabel">Giá trị trung bình</p>
                  <p className="rev-report__kpiValue">{formatMoney(averageOrderValue)}</p>
                </article>
                <article className="rev-report__kpi">
                  <p className="rev-report__totalLabel">So với kỳ trước</p>
                  <p className={`rev-report__kpiValue ${growthPercent >= 0 ? 'rev-report__kpiValue--up' : 'rev-report__kpiValue--down'}`}>
                    {formatPercent(growthPercent)}
                  </p>
                  <p className="rev-report__compareText">
                    {previousTotal > 0 ? `${formatPercent(growthPercent)} so với kỳ trước` : 'Chưa có dữ liệu kỳ trước'}
                  </p>
                </article>
              </div>
            </section>
          ) : null}

          {!loading && !err && series.length > 0 ? (
            <>
              <section className="rev-report__chartCard">
                <div className="rev-report__chartHead">
                  <div>
                    <h2 className="rev-report__sectionTitle">
                      <BarChart3 size={16} />
                      Biểu đồ doanh thu
                    </h2>
                    <p className="rev-report__sectionSub">
                      <CalendarRange size={14} />
                      {from} đến {to}
                    </p>
                  </div>
                  <span className="rev-report__compareBadge">
                    <TrendingUp size={14} />
                    {formatPercent(growthPercent)} so với kỳ trước
                  </span>
                </div>
                <BarChart series={series} groupBy={groupBy} onDetail={openPeriodDetail} />
              </section>
              <div className="rev-report__table-wrap">
              <table className="rev-report__table">
                <thead>
                  <tr><th>Kỳ</th><th>Doanh thu</th><th></th></tr>
                </thead>
                <tbody>
                  {pagedSeries.map((row) => (
                    <tr key={String(row.date)}>
                      <td>{formatAxisLabel(String(row.date), groupBy)}</td>
                      <td><span className="rev-report__cellMoney">{formatMoney(Number(row.revenue || 0))}</span></td>
                      <td className="rev-report__detailCell">
                        <button type="button" className="rev-report__detailBtn" onClick={() => openPeriodDetail(row)}>
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <AdminPagination
                className="rev-report__pagination"
                page={periodPage}
                pageSize={periodPageSize}
                total={series.length}
                onPageChange={setPeriodPage}
                onPageSizeChange={setPeriodPageSize}
              />
            </>
          ) : null}

          {!loading && !err && series.length === 0 ? (
            <p className="rev-report__empty">Chưa có dữ liệu thanh toán trong khoảng đã chọn.</p>
          ) : null}
        </>
      )}

      {/* ══════════ TAB: BY TABLE ══════════ */}
      {activeTab === 'table' && (
        <>
          {tableLoading ? <p className="rev-report__hint">Đang tải…</p> : null}
          {tableErr ? <p className="rev-report__err">{tableErr}</p> : null}

          {!tableLoading && !tableErr ? (
            <section className="rev-report__summary" aria-live="polite">
              <p className="rev-report__totalLabel">Tổng tất cả bàn</p>
              <p className="rev-report__totalValue">{formatMoney(tableTotal)}</p>
            </section>
          ) : null}

          {!tableLoading && !tableErr && tableData.length === 0 ? (
            <p className="rev-report__empty">Chưa có dữ liệu thanh toán trong khoảng đã chọn.</p>
          ) : null}

          {!tableLoading && !tableErr && tableData.length > 0 ? (
            <>
              <div className="rev-report__tableGroup">
                {pagedTableData.map((tr) => {
                  const key = tr.tableId ?? tr.tableName
                  const isExpanded = expandedTable === key
                  return (
                    <div key={key} className="rev-report__tableBlock">
                      <button
                        type="button"
                        className={`rev-report__tableBlockHead${isExpanded ? ' rev-report__tableBlockHead--open' : ''}`}
                        onClick={() => setExpandedTable(isExpanded ? null : key)}
                      >
                        <div className="rev-report__tableBlockLeft">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <TableProperties size={15} />
                          <span className="rev-report__tableBlockName">{tr.tableName}</span>
                          <span className="rev-report__tableBlockBadge">{tr.invoiceCount} hóa đơn</span>
                        </div>
                        <span className="rev-report__tableBlockTotal">{formatMoney(Number(tr.total || 0))}</span>
                      </button>

                      {isExpanded && (
                        <div className="rev-report__tableBlockBody">
                          {Array.isArray(tr.invoices) && tr.invoices.length > 0 ? (
                            <ul className="rev-report__invoiceList">
                              {tr.invoices.map((inv) => (
                                <InvoiceCard key={inv.paymentId} inv={inv} />
                              ))}
                            </ul>
                          ) : (
                            <p className="rev-report__noItems" style={{ padding: '14px 18px' }}>
                              Không có chi tiết hóa đơn cho bàn này.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <AdminPagination
                className="rev-report__pagination"
                page={tablePage}
                pageSize={tablePageSize}
                total={tableData.length}
                onPageChange={setTablePage}
                onPageSizeChange={setTablePageSize}
              />
            </>
          ) : null}
        </>
      )}

      {/* ── Period detail modal ── */}
      {detailOpen ? (
        <div
          className="rev-report__backdrop"
          role="dialog" aria-modal="true" aria-labelledby="rev-detail-title"
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
                <X size={16} />
              </button>
            </div>

            {detailLoading ? <p className="rev-report__hint">Đang tải…</p> : null}
            {detailErr ? <p className="rev-report__err">{detailErr}</p> : null}
            {!detailLoading && !detailErr && invoices.length === 0 ? (
              <p className="rev-report__empty">Không có hóa đơn trong kỳ này.</p>
            ) : null}
            {!detailLoading && !detailErr && invoices.length > 0 ? (
              <ul className="rev-report__invoiceList">
                {invoices.map((inv) => <InvoiceCard key={inv.paymentId} inv={inv} />)}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
