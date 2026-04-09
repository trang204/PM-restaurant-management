import { query } from '../config/db.js'

/** Gửi cùng một thông báo tới mọi tài khoản ADMIN và STAFF. */
export async function notifyStaffAdmins(message) {
  const text = String(message || '').trim().slice(0, 2000)
  if (!text) return
  const r = await query(
    `
    SELECT u.id
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE r.name IN ('ADMIN', 'STAFF')
    `,
  )
  for (const row of r.rows) {
    await query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [row.id, text])
  }
}
