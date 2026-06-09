import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  TableProperties,
  ChevronDown,
  ChevronRight,
  X,
  TrendingUp,
  Banknote,
  Receipt,
  SearchX
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { apiFetch } from '../../lib/api'
import AdminPagination from '../../components/AdminPagination'
import { formatCurrency, formatPercent } from '../../lib/format'
import './RevenueReports.css'
import { useNotifications } from '../../context/NotificationsContext'

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
  growthPercent: number // From backend, but we will recalculate on frontend for exact safety
  previousRange: { from: string; to: string } | null
  series: SeriesRow[]
}

type InvoiceLine = {
  foodName: string; quantity: number; unitPrice: string | number; lineTotal: string | number
}
type InvoiceRow = {
  paymentId: number; orderId: number; amount: string | number
  method: string | null; paidAt: string; items: InvoiceLine[]
  tableName?: string | null
  transactionCode?: string | null
  cashierId?: number | null
  cashierName?: string | null
  note?: string | null
  tax?: string | number | null
  discount?: string | number | null
  surcharge?: string | number | null
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
  return s.split('-').reverse().join('/')
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

/* ─── Components ─── */
function CustomTooltip({ active, payload, label, groupBy }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rev-chart__tooltip">
        <p className="rev-chart__tooltipDate">{formatAxisLabel(label, groupBy)}</p>
        <p className="rev-chart__tooltipValue">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

function SkeletonCard() {
  return <div className="rev-skeleton rev-skeleton--card" />
}
function SkeletonChart() {
  return <div className="rev-skeleton rev-skeleton--chart" />
}

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
        <strong className="rev-report__moneyBold">{formatCurrency(Number(inv.amount || 0))}</strong>
      </div>
      {Array.isArray(inv.items) && inv.items.length > 0 ? (
        <table className="rev-report__itemsTable">
          <thead>
            <tr><th>Món</th><th>SL</th><th>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th></tr>
          </thead>
          <tbody>
            {inv.items.map((it, idx) => (
              <tr key={idx}>
                <td>{it.foodName}</td>
                <td>{it.quantity}</td>
                <td>{formatCurrency(Number(it.unitPrice || 0))}</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(Number(it.lineTotal || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rev-report__noItems">Không có chi tiết món.</p>
      )}

      {/* Chi tiết phụ thu, giảm giá, thuế, người thu tiền, mã giao dịch */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 10, padding: '8px 12px', background: '#faf8f5', borderRadius: 8, fontSize: '0.82rem', color: '#555', border: '1px dashed #e2d9cc' }}>
        <div>
          <span>Người thu tiền: </span><strong>{inv.cashierName || 'Hệ thống'}</strong>
        </div>
        <div>
          <span>Mã giao dịch: </span><strong>{inv.transactionCode || '—'}</strong>
        </div>
        {inv.tax && Number(inv.tax) > 0 ? (
          <div>
            <span>Thuế VAT: </span><strong>{formatCurrency(Number(inv.tax))}</strong>
          </div>
        ) : null}
        {inv.discount && Number(inv.discount) > 0 ? (
          <div>
            <span>Giảm giá: </span><strong style={{ color: '#c0392b' }}>-{formatCurrency(Number(inv.discount))}</strong>
          </div>
        ) : null}
        {inv.surcharge && Number(inv.surcharge) > 0 ? (
          <div>
            <span>Phụ thu: </span><strong>{formatCurrency(Number(inv.surcharge))}</strong>
          </div>
        ) : null}
        {inv.note ? (
          <div style={{ gridColumn: 'span 2', borderTop: '1px dotted #e2d9cc', paddingTop: 6, marginTop: 2 }}>
            <span>Ghi chú: </span><strong>{inv.note}</strong>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/* ─── Main component ─── */
export default function RevenueReports() {
  const { toast } = useNotifications()
  const [activeTab, setActiveTab] = useState<ReportTab>('period')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
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

  /* Queries */
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

  /* Effects */

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

  /* Derived State */
  const total = data?.total != null ? Number(data.total) : 0
  const invoiceCount = Number(data?.invoiceCount || 0)
  const averageOrderValue = Number(data?.averageOrderValue || 0)
  const previousTotal = Number(data?.previousTotal || 0)
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

  const chartData = useMemo(() => {
    return series.map(s => ({
      ...s,
      dateFormatted: formatAxisLabel(s.date, groupBy),
      revenueValue: Number(s.revenue)
    }))
  }, [series, groupBy])

  function validateDate(fVal = from, tVal = to){
    if (!fVal || !tVal) return true
    if (new Date(fVal) > new Date(tVal)) {
      toast('Ngày bắt đầu phải nhỏ hơn ngày kết thúc', { variant: 'error' })
      return false
    }
    return true
  }
  /* Quick Filters */
  function setQuickFilter(days: number) {
    const t = new Date()
    setTo(todayStr())
    if (days === 0) {
      setFrom(todayStr())
    } else {
      const f = new Date()
      f.setDate(t.getDate() - days)
      setFrom(ymd(f.getFullYear(), f.getMonth() + 1, f.getDate()))
    }
  }

  /* Export Excel using ExcelJS */
  async function exportExcel() {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    
    let currentTable: TableRow | undefined = undefined
    if (activeTab === 'table' && expandedTable) {
      q.set('tableId', String(expandedTable))
      currentTable = tableData.find(t => (t.tableId ?? t.tableName) === expandedTable)
    }

    const rows = await apiFetch<InvoiceRow[]>(`/admin/reports/revenue/invoices?${q}`)

    const wb = new ExcelJS.Workbook()
    
    // Header Style
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } } as ExcelJS.FillPattern,
      alignment: { vertical: 'middle', horizontal: 'center' } as Partial<ExcelJS.Alignment>
    }
    const currencyFormat = '#,##0 "đ"'

    // 1. TỔNG QUAN SHEET
    const ws1 = wb.addWorksheet('Tong_quan')
    ws1.columns = [
      { header: 'CHỈ SỐ TỔNG QUAN', key: 'metric', width: 25 },
      { header: 'GIÁ TRỊ', key: 'value', width: 25 }
    ]
    ws1.getRow(1).eachCell(c => { c.font = headerStyle.font; c.fill = headerStyle.fill; c.alignment = headerStyle.alignment })
    
    ws1.addRow({ metric: 'Khoảng thời gian', value: `${from || '—'} đến ${to || '—'}` })
    
    let exportTotal = total
    let exportCount = invoiceCount
    let exportAvg = averageOrderValue
    let exportPrevTotal: number | null = previousTotal

    if (activeTab === 'table') {
      if (currentTable) {
        ws1.addRow({ metric: 'Bàn báo cáo', value: currentTable.tableName })
        exportTotal = Number(currentTable.total || 0)
        exportCount = currentTable.invoiceCount || 0
        exportAvg = exportCount > 0 ? exportTotal / exportCount : 0
        exportPrevTotal = null // No previous total available for a specific table
      } else {
        exportTotal = tableTotal
        exportCount = tableData.reduce((s, r) => s + r.invoiceCount, 0)
        exportAvg = exportCount > 0 ? exportTotal / exportCount : 0
        exportPrevTotal = null
      }
    }

    ws1.addRow({ metric: 'Tổng doanh thu', value: exportTotal }).getCell('value').numFmt = currencyFormat
    ws1.addRow({ metric: 'Số đơn', value: exportCount })
    ws1.addRow({ metric: 'Giá trị trung bình', value: exportAvg }).getCell('value').numFmt = currencyFormat
    
    if (exportPrevTotal !== null) {
      ws1.addRow({ metric: 'Kỳ trước', value: exportPrevTotal }).getCell('value').numFmt = currencyFormat
      ws1.addRow({ metric: 'Tăng trưởng', value: formatPercent(exportTotal, exportPrevTotal) })
    }

    // 2. BIỂU ĐỒ SHEET
    if (activeTab === 'period') {
      const ws2 = wb.addWorksheet('Doanh_thu_theo_ky')
      ws2.columns = [
        { header: 'STT', key: 'stt', width: 10 },
        { header: 'Kỳ báo cáo', key: 'ky', width: 20 },
        { header: 'Ngày gốc', key: 'ngay', width: 15 },
        { header: 'Doanh thu', key: 'doanhthu', width: 20 }
      ]
      ws2.getRow(1).eachCell(c => { c.font = headerStyle.font; c.fill = headerStyle.fill; c.alignment = headerStyle.alignment })
      series.forEach((s, i) => {
        const row = ws2.addRow({
          stt: i + 1,
          ky: formatAxisLabel(String(s.date), groupBy),
          ngay: String(s.date).slice(0, 10),
          doanhthu: Number(s.revenue)
        })
        row.getCell('doanhthu').numFmt = currencyFormat
      })
    } else {
      const ws2 = wb.addWorksheet('Doanh_thu_theo_ban')
      ws2.columns = [
        { header: 'STT', key: 'stt', width: 10 },
        { header: 'Tên bàn', key: 'tenban', width: 20 },
        { header: 'Số hóa đơn', key: 'sohd', width: 15 },
        { header: 'Doanh thu', key: 'doanhthu', width: 20 }
      ]
      ws2.getRow(1).eachCell(c => { c.font = headerStyle.font; c.fill = headerStyle.fill; c.alignment = headerStyle.alignment })
      let displayTableData = tableData
      if (currentTable) displayTableData = [currentTable]
      
      displayTableData.forEach((tr, i) => {
        const row = ws2.addRow({
          stt: i + 1,
          tenban: tr.tableName,
          sohd: tr.invoiceCount,
          doanhthu: Number(tr.total)
        })
        row.getCell('doanhthu').numFmt = currencyFormat
      })
    }

    // 3. HÓA ĐƠN SHEET
    const ws3 = wb.addWorksheet('Hoa_don')
    ws3.columns = [
      { header: 'STT', key: 'stt', width: 10 },
      { header: 'Mã TT', key: 'matt', width: 15 },
      { header: 'Mã đơn', key: 'madon', width: 15 },
      { header: 'Bàn', key: 'ban', width: 20 },
      { header: 'Phương thức', key: 'pt', width: 20 },
      { header: 'Thời gian TT', key: 'time', width: 20 },
      { header: 'Số tiền', key: 'tien', width: 20 }
    ]
    ws3.getRow(1).eachCell(c => { c.font = headerStyle.font; c.fill = headerStyle.fill; c.alignment = headerStyle.alignment })
    rows.forEach((r, i) => {
      const row = ws3.addRow({
        stt: i + 1,
        matt: r.paymentId,
        madon: r.orderId,
        ban: r.tableName || '—',
        pt: methodLabel(r.method),
        time: formatDateTimeExport(r.paidAt),
        tien: Number(r.amount)
      })
      row.getCell('tien').numFmt = currencyFormat
    })

    // 4. CHI TIẾT MÓN SHEET
    const ws4 = wb.addWorksheet('Chi_tiet_mon')
    ws4.columns = [
      { header: 'Mã TT', key: 'matt', width: 15 },
      { header: 'Mã đơn', key: 'madon', width: 15 },
      { header: 'Bàn', key: 'ban', width: 20 },
      { header: 'Thời gian TT', key: 'time', width: 20 },
      { header: 'Phương thức', key: 'pt', width: 20 },
      { header: 'Món ăn', key: 'mon', width: 30 },
      { header: 'Số lượng', key: 'sl', width: 15 },
      { header: 'Đơn giá', key: 'gia', width: 20 },
      { header: 'Thành tiền', key: 'thanh', width: 20 }
    ]
    ws4.getRow(1).eachCell(c => { c.font = headerStyle.font; c.fill = headerStyle.fill; c.alignment = headerStyle.alignment })
    rows.forEach(r => {
      const items = r.items?.length ? r.items : [{ foodName: 'Không có chi tiết', quantity: 0, unitPrice: 0, lineTotal: 0 }]
      items.forEach((item, idx) => {
        const row = ws4.addRow({
          matt: idx === 0 ? r.paymentId : '',
          madon: idx === 0 ? r.orderId : '',
          ban: idx === 0 ? (r.tableName || '—') : '',
          time: idx === 0 ? formatDateTimeExport(r.paidAt) : '',
          pt: idx === 0 ? methodLabel(r.method) : '',
          mon: item.foodName,
          sl: Number(item.quantity),
          gia: Number(item.unitPrice),
          thanh: Number(item.lineTotal)
        })
        row.getCell('gia').numFmt = currencyFormat
        row.getCell('thanh').numFmt = currencyFormat
      })
    })

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    let filename = 'doanh-thu'
    if (currentTable) {
      filename += `-ban-${currentTable.tableName.replace(/\s+/g, '-').toLowerCase()}`
    }
    
    if (from && to && from === to) {
      filename += `-ngay-${from}`
    } else if (from && to && from.substring(0, 7) === to.substring(0, 7)) {
      // Same month
      const [y, m, dFrom] = from.split('-')
      const [y2, m2, dTo] = to.split('-')
      if (dFrom === '01' && Number(dTo) >= 28) { // basic check for full month
        filename += `-thang-${m}-${y}`
      } else {
        filename += `-${from}-den-${to}`
      }
    } else if (from && to && from.substring(0, 4) === to.substring(0, 4) && from.endsWith('-01-01') && to.endsWith('-12-31')) {
      filename += `-nam-${from.substring(0, 4)}`
    } else {
      filename += `-${from || 'all'}-den-${to || 'all'}`
    }
    
    saveAs(blob, `${filename}.xlsx`)
  }

  function openPeriodDetail(row: SeriesRow) {
    const { from: pf, to: pt } = periodBounds(String(row.date), groupBy)
    setDetailOpen({ label: formatAxisLabel(String(row.date), groupBy), from: pf, to: pt })
  }

  return (
    <div className="rev-report">
      <header className="rev-report__header">
        <div>
          <h1 className="rev-report__title">Báo Cáo Doanh Thu</h1>
        </div>
        <button type="button" className="rev-report__exportBtn" onClick={exportExcel}>
          Xuất báo cáo Excel
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
      <section className="rev-report__filtersCard" aria-label="Bộ lọc">
        <div className="rev-report__filterRow">
          <div className="rev-report__quickFilters">
            <button className="rev-report__quickBtn" onClick={() => setQuickFilter(0)}>Hôm nay</button>
            <button className="rev-report__quickBtn" onClick={() => setQuickFilter(6)}>7 ngày qua</button>
            <button className="rev-report__quickBtn" onClick={() => setQuickFilter(29)}>30 ngày qua</button>
          </div>
          
          {activeTab === 'period' && (
            <div className="rev-report__tabs">
              {(['day', 'month', 'year'] as GroupBy[]).map((k) => (
                <button
                  key={k} type="button"
                  className={`rev-report__tab${groupBy === k ? ' rev-report__tab--on' : ''}`}
                  onClick={() => {
                    setGroupBy(k)
                    const now = new Date()
                    const Y = now.getFullYear()
                    const M = now.getMonth() + 1
                    if (k === 'month') {
                      const last = new Date(Y, M, 0).getDate()
                      setFrom(ymd(Y, M, 1))
                      setTo(ymd(Y, M, last))
                    } else if (k === 'year') {
                      setFrom(`${Y}-01-01`)
                      setTo(`${Y}-12-31`)
                    }
                  }}
                >
                  {k === 'day' ? 'Ngày' : k === 'month' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="rev-report__dates">
          <label className="rev-report__date">
            <span>Từ ngày</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} onBlur={(e) => validateDate(e.target.value, to)} />
          </label>
          <div className="rev-report__dateSep">-</div>
          <label className="rev-report__date">
            <span>Đến ngày</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} onBlur={(e) => validateDate(from, e.target.value)} />
          </label>
        </div>
      </section>

      {/* ══════════ TAB: PERIOD ══════════ */}
      {activeTab === 'period' && (
        <>
          {err ? <p className="rev-report__err">{err}</p> : null}

          <section className="rev-report__summaryGrid">
            <article className="rev-report__kpi">
              <div className="rev-report__kpiIcon"><Banknote size={20} /></div>
              <div className="rev-report__kpiContent">
                <p className="rev-report__kpiLabel">Tổng doanh thu</p>
                {loading ? <SkeletonCard /> : <p className="rev-report__kpiValue">{formatCurrency(total)}</p>}
              </div>
            </article>
            <article className="rev-report__kpi">
              <div className="rev-report__kpiIcon" style={{ color: '#0ea5e9', background: '#e0f2fe' }}><Receipt size={20} /></div>
              <div className="rev-report__kpiContent">
                <p className="rev-report__kpiLabel">Số hóa đơn</p>
                {loading ? <SkeletonCard /> : <p className="rev-report__kpiValue">{invoiceCount}</p>}
              </div>
            </article>
            <article className="rev-report__kpi">
              <div className="rev-report__kpiIcon" style={{ color: '#8b5cf6', background: '#ede9fe' }}><BarChart3 size={20} /></div>
              <div className="rev-report__kpiContent">
                <p className="rev-report__kpiLabel">Giá trị trung bình</p>
                {loading ? <SkeletonCard /> : <p className="rev-report__kpiValue">{formatCurrency(averageOrderValue)}</p>}
              </div>
            </article>
            <article className="rev-report__kpi">
              <div className="rev-report__kpiIcon" style={{ color: '#10b981', background: '#d1fae5' }}><TrendingUp size={20} /></div>
              <div className="rev-report__kpiContent">
                <p className="rev-report__kpiLabel">Tăng trưởng</p>
                {loading ? <SkeletonCard /> : (
                  <>
                    <p className={`rev-report__kpiValue ${(total - previousTotal) >= 0 ? 'rev-report__kpiValue--up' : 'rev-report__kpiValue--down'}`}>
                      {formatPercent(total, previousTotal)}
                    </p>
                    <p className="rev-report__compareText">So với {formatCurrency(previousTotal)} kỳ trước</p>
                  </>
                )}
              </div>
            </article>
          </section>

          <section className="rev-report__chartCard">
            <div className="rev-report__chartHead">
              <div>
                <h2 className="rev-report__sectionTitle">
                  <BarChart3 size={16} /> Biểu đồ doanh thu
                </h2>
                <p className="rev-report__sectionSub">Theo dõi biến động doanh thu theo thời gian</p>
              </div>
            </div>
            
            {loading ? (
              <SkeletonChart />
            ) : series.length > 0 ? (
              <div className="rev-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D9CC" />
                    <XAxis 
                      dataKey="dateFormatted" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#7A7069', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => `${(v / 1000).toLocaleString('vi-VN')}k`}
                      tick={{ fill: '#7A7069', fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip groupBy={groupBy} />} cursor={{ fill: 'rgba(184,147,90,0.1)' }} />
                    <Bar 
                      dataKey="revenueValue" 
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill="#B8935A" className="rev-chart-bar-cell" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rev-report__emptyState">
                <SearchX size={48} />
                <p>Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            )}
          </section>

          {!loading && !err && series.length > 0 && (
            <div className="rev-report__chartCard">
              <h2 className="rev-report__sectionTitle" style={{ marginBottom: 16 }}>Bảng chi tiết</h2>
              <div className="rev-report__table-wrap">
                <table className="rev-report__table">
                  <thead>
                    <tr><th>Kỳ báo cáo</th><th>Doanh thu</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {pagedSeries.map((row) => (
                      <tr key={String(row.date)}>
                        <td>{formatAxisLabel(String(row.date), groupBy)}</td>
                        <td><strong className="rev-report__moneyBold">{formatCurrency(Number(row.revenue || 0))}</strong></td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="rev-report__detailBtn" onClick={() => openPeriodDetail(row)}>
                            Xem
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
            </div>
          )}
        </>
      )}

      {/* ══════════ TAB: BY TABLE ══════════ */}
      {activeTab === 'table' && (
        <>
          {tableErr ? <p className="rev-report__err">{tableErr}</p> : null}

          <section className="rev-report__summaryGrid">
            <article className="rev-report__kpi" style={{ gridColumn: '1 / -1' }}>
              <div className="rev-report__kpiIcon"><TableProperties size={20} /></div>
              <div className="rev-report__kpiContent">
                <p className="rev-report__kpiLabel">Tổng doanh thu các bàn</p>
                {tableLoading ? <SkeletonCard /> : <p className="rev-report__kpiValue">{formatCurrency(tableTotal)}</p>}
              </div>
            </article>
          </section>

          {tableLoading ? (
            <SkeletonChart />
          ) : tableData.length === 0 ? (
            <div className="rev-report__emptyState">
              <SearchX size={48} />
              <p>Không có dữ liệu thanh toán trong khoảng đã chọn</p>
            </div>
          ) : (
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
                        <span className="rev-report__tableBlockTotal">{formatCurrency(Number(tr.total || 0))}</span>
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
          )}
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
                  Chi tiết hóa đơn — {detailOpen.label}
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
            
            <div className="rev-report__modalBody">
              {detailLoading ? <p className="rev-report__hint">Đang tải…</p> : null}
              {detailErr ? <p className="rev-report__err">{detailErr}</p> : null}
              {!detailLoading && !detailErr && invoices.length === 0 ? (
                <div className="rev-report__emptyState">
                  <SearchX size={32} />
                  <p>Không có hóa đơn trong kỳ này.</p>
                </div>
              ) : null}
              {!detailLoading && !detailErr && invoices.length > 0 ? (
                <ul className="rev-report__invoiceList">
                  {invoices.map((inv) => <InvoiceCard key={inv.paymentId} inv={inv} />)}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
