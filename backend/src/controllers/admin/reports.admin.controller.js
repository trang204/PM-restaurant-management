import { ok } from '../../utils/response.js'
import { query } from '../../config/db.js'

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
        o.id AS "orderId",
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
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
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

