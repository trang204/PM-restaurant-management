import { createServer } from './app.js'
import { query } from './config/db.js'

const app = createServer()

const PORT = Number(process.env.PORT || 5000)
const HOST = process.env.HOST?.trim() || undefined

function onListening() {
  // eslint-disable-next-line no-console
  console.log(
    HOST ? `Server running on http://${HOST}:${PORT}` : `Server running on port ${PORT}`,
  )

  // Auto-cancel HOLD bookings after 15 minutes
  setInterval(async () => {
    try {
      const expired = await query(
        `
        SELECT id
        FROM bookings
        WHERE status = 'HOLD'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at <= NOW()
        LIMIT 200
      `,
      )
      if (!expired.rows.length) return

      const ids = expired.rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n))
      if (!ids.length) return

      // release tables (if they were RESERVED by holds)
      await query(
        `
        UPDATE tables t
        SET status = 'AVAILABLE'
        WHERE t.id IN (
          SELECT bt.table_id FROM booking_tables bt WHERE bt.booking_id = ANY($1::int[])
        )
          AND t.status = 'RESERVED'
      `,
        [ids],
      )

      await query('DELETE FROM booking_tables WHERE booking_id = ANY($1::int[])', [ids])
      await query(
        `UPDATE bookings SET status = 'CANCELLED', hold_expires_at = NULL WHERE id = ANY($1::int[])`,
        [ids],
      )
    } catch {
      // ignore in background job
    }
  }, 60_000)
}

if (HOST) {
  app.listen(PORT, HOST, onListening)
} else {
  app.listen(PORT, onListening)
}
