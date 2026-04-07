import { ok } from '../../utils/response.js'
import { query } from '../../config/db.js'

export async function revenue(req, res, next) {
  try {
    const { from, to, groupBy = 'day' } = req.query || {}

    const allowedGroup = new Set(['day', 'month'])
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

    const dateExpr = grp === 'month' ? "DATE_TRUNC('month', paid_at)::date" : 'DATE(paid_at)'

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

