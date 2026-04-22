import { ok } from '../../utils/response.js'
import { query } from '../../config/db.js'

/** Thống kê doanh thu theo bàn (gộp từ table_sessions và booking_tables). */
export async function revenueByTable(req, res, next) {
  try {
    const { from, to } = req.query || {}
    const fromDate = from ? String(from) : null
    const toDate = to ? String(to) : null

    const where = [`p.status = 'PAID'`, `p.paid_at IS NOT NULL`]
    const params = []
    if (fromDate) { params.push(fromDate); where.push(`p.paid_at >= $${params.length}::date`) }
    if (toDate)   { params.push(toDate);   where.push(`p.paid_at < ($${params.length}::date + INTERVAL '1 day')`) }

    const whereStr = where.join(' AND ')

    // 1) Tổng hợp theo bàn
    const aggRes = await query(
      `
      SELECT
        COALESCE(ts_t.id, bt_t.id)                         AS table_id,
        COALESCE(ts_t.name, bt_t.name, 'Không xác định')   AS table_name,
        COUNT(DISTINCT p.id)::int                           AS invoice_count,
        SUM(p.amount)::numeric                              AS total
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      LEFT JOIN table_sessions ts ON ts.id = o.table_session_id
      LEFT JOIN tables ts_t      ON ts_t.id = ts.table_id
      LEFT JOIN booking_tables bt ON bt.booking_id = o.booking_id
      LEFT JOIN tables bt_t      ON bt_t.id = bt.table_id
      WHERE ${whereStr}
      GROUP BY COALESCE(ts_t.id, bt_t.id),
               COALESCE(ts_t.name, bt_t.name, 'Không xác định')
      ORDER BY SUM(p.amount) DESC NULLS LAST
      `,
      params,
    )

    // 2) Chi tiết từng hóa đơn kèm bàn + món
    const invRes = await query(
      `
      SELECT
        p.id              AS "paymentId",
        p.order_id        AS "orderId",
        p.amount::numeric AS amount,
        p.method,
        p.paid_at         AS "paidAt",
        COALESCE(ts_t.id, bt_t.id)                         AS table_id,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'foodName',  COALESCE(f.name, 'Món #' || oi.food_id::text),
                'quantity',  oi.quantity,
                'unitPrice', oi.price::numeric,
                'lineTotal', (oi.quantity * oi.price)::numeric
              ) ORDER BY oi.id
            )
            FROM order_items oi
            LEFT JOIN foods f ON f.id = oi.food_id
            WHERE oi.order_id = p.order_id
          ),
          '[]'::json
        ) AS items
      FROM payments p
      LEFT JOIN orders o ON o.id = p.order_id
      LEFT JOIN table_sessions ts ON ts.id = o.table_session_id
      LEFT JOIN tables ts_t      ON ts_t.id = ts.table_id
      LEFT JOIN booking_tables bt ON bt.booking_id = o.booking_id
      LEFT JOIN tables bt_t      ON bt_t.id = bt.table_id
      WHERE ${whereStr}
      ORDER BY p.paid_at DESC, p.id DESC
      `,
      params,
    )

    // 3) Ghép invoices vào từng bàn trong JS
    const invByTable = {}
    for (const row of invRes.rows) {
      const key = row.table_id ?? '__unknown__'
      if (!invByTable[key]) invByTable[key] = []
      invByTable[key].push({
        paymentId: row.paymentId,
        orderId:   row.orderId,
        amount:    row.amount,
        method:    row.method,
        paidAt:    row.paidAt,
        items:     row.items || [],
      })
    }

    const result = aggRes.rows.map((t) => ({
      tableId:      t.table_id,
      tableName:    t.table_name,
      invoiceCount: t.invoice_count,
      total:        t.total,
      invoices:     invByTable[t.table_id ?? '__unknown__'] || [],
    }))

    return ok(res, result)
  } catch (e) {
    return next(e)
  }
}

/** Danh sách thanh toán PAID trong khoảng ngày + từng dòng món (cho báo cáo chi tiết). */
export async function revenueInvoices(req, res, next) {
  try {
    const { from, to } = req.query || {}
    const fromDate = from ? String(from) : null
    const toDate = to ? String(to) : null

    const where = [`p.status = 'PAID'`, `p.paid_at IS NOT NULL`]
    const params = []

    if (fromDate) {
      params.push(fromDate)
      where.push(`p.paid_at >= $${params.length}::date`)
    }
    if (toDate) {
      params.push(toDate)
      where.push(`p.paid_at < ($${params.length}::date + INTERVAL '1 day')`)
    }

    const result = await query(
      `
      SELECT
        p.id AS "paymentId",
        p.order_id AS "orderId",
        p.amount::numeric AS amount,
        p.method,
        p.paid_at AS "paidAt",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'foodName', COALESCE(f.name, 'Món #' || oi.food_id::text),
                'quantity', oi.quantity,
                'unitPrice', oi.price::numeric,
                'lineTotal', (oi.quantity * oi.price)::numeric
              ) ORDER BY oi.id
            )
            FROM order_items oi
            LEFT JOIN foods f ON f.id = oi.food_id
            WHERE oi.order_id = p.order_id
          ),
          '[]'::json
        ) AS items
      FROM payments p
      WHERE ${where.join(' AND ')}
      ORDER BY p.paid_at DESC, p.id DESC
    `,
      params,
    )

    return ok(res, result.rows)
  } catch (e) {
    return next(e)
  }
}

export async function revenue(req, res, next) {
  try {
    const { from, to, groupBy = 'day' } = req.query || {}

    const allowedGroup = new Set(['day', 'month', 'quarter', 'year'])
    const grp = allowedGroup.has(String(groupBy)) ? String(groupBy) : 'day'

    const fromDate = from ? String(from) : null
    const toDate = to ? String(to) : null

    const where = []
    const params = []

    where.push("status = 'PAID'")
    where.push('paid_at IS NOT NULL')

    if (fromDate) {
      params.push(fromDate)
      where.push(`paid_at >= $${params.length}::date`)
    }
    if (toDate) {
      params.push(toDate)
      where.push(`paid_at < ($${params.length}::date + INTERVAL '1 day')`)
    }

    const dateExpr =
      grp === 'month'
        ? "DATE_TRUNC('month', paid_at)::date"
        : grp === 'quarter'
          ? "DATE_TRUNC('quarter', paid_at)::date"
          : grp === 'year'
            ? "DATE_TRUNC('year', paid_at)::date"
            : 'DATE(paid_at)'

    const totalRes = await query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE ${where.join(' AND ')}`,
      params,
    )

    const seriesRes = await query(
      `
      SELECT ${dateExpr} AS date, COALESCE(SUM(amount), 0)::numeric AS revenue
      FROM payments
      WHERE ${where.join(' AND ')}
      GROUP BY ${dateExpr}
      ORDER BY ${dateExpr} ASC
    `,
      params,
    )

    return ok(res, {
      from: fromDate,
      to: toDate,
      groupBy: grp,
      total: totalRes.rows[0]?.total ?? '0',
      series: seriesRes.rows,
    })
  } catch (e) {
    return next(e)
  }
}

