import { createServer } from './app.js'
import { ensureDbSchema, query } from './config/db.js'

// ─── Kiểm tra biến môi trường bắt buộc ───────────────────────────────────────
function validateEnv() {
  const errors = []

  const appSecret = process.env.APP_SECRET?.trim()
  if (!appSecret || appSecret.length < 32) {
    errors.push('APP_SECRET: chưa đặt hoặc quá ngắn (tối thiểu 32 ký tự). Thêm vào file .env.')
  }

  const jwtSecret = process.env.JWT_SECRET?.trim()
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET: chưa đặt hoặc quá ngắn (tối thiểu 32 ký tự). Thêm vào file .env.')
  }
  if (jwtSecret === 'your_secret' || jwtSecret === 'secret' || jwtSecret === 'changeme') {
    errors.push('JWT_SECRET: đang dùng giá trị mặc định không an toàn. Hãy đổi thành chuỗi ngẫu nhiên mạnh.')
  }

  if (errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('\n❌  Không thể khởi động backend — thiếu cấu hình bảo mật:\n')
    for (const e of errors) {
      // eslint-disable-next-line no-console
      console.error(`   • ${e}`)
    }
    // eslint-disable-next-line no-console
    console.error('\nTham khảo file .env.example để biết cách cấu hình.\n')
    process.exit(1)
  }
}

validateEnv()

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

async function start() {
  try {
    await ensureDbSchema()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ensureDbSchema failed:', e)
    process.exit(1)
  }
  if (HOST) {
    app.listen(PORT, HOST, onListening)
  } else {
    app.listen(PORT, onListening)
  }
}

start()
