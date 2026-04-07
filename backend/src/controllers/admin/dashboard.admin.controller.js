import { ok } from '../../utils/response.js'
import { query } from '../../config/db.js'

export async function stats(req, res, next) {
  try {
    const [
      bookingsTotal,
      revenueTotal,
      usersTotal,
      tablesTotal,
      revenueByDate,
    ] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM bookings'),
      query(
        `
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM payments
        WHERE status = 'PAID'
      `,
      ),
      query('SELECT COUNT(*)::int AS total FROM users'),
      query('SELECT COUNT(*)::int AS total FROM tables'),
      query(
        `
        SELECT
          DATE(paid_at) AS date,
          COALESCE(SUM(amount), 0)::numeric AS revenue
        FROM payments
        WHERE status = 'PAID' AND paid_at IS NOT NULL
        GROUP BY DATE(paid_at)
        ORDER BY DATE(paid_at) DESC
        LIMIT 30
      `,
      ),
    ])

    return ok(res, {
      totalBookings: bookingsTotal.rows[0]?.total ?? 0,
      totalRevenue: revenueTotal.rows[0]?.total ?? '0',
      totalUsers: usersTotal.rows[0]?.total ?? 0,
      totalTables: tablesTotal.rows[0]?.total ?? 0,
      revenueByDate: revenueByDate.rows,
    })
  } catch (e) {
    return next(e)
  }
}

