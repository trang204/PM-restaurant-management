import { ok } from '../utils/response.js'
import { query } from '../config/db.js'

/** Thông tin hiển thị công khai (trang chủ, footer, QR). */
export async function getPublicSettings(req, res, next) {
  try {
    const r = await query(
      `
      SELECT restaurant_name, logo_url, address, phone, email, open_time, close_time
      FROM settings
      ORDER BY id
      LIMIT 1
    `,
    )
    const s = r.rows[0] || {}
    return ok(res, {
      restaurantName: s.restaurant_name ?? null,
      logoUrl: s.logo_url ?? null,
      address: s.address ?? null,
      phone: s.phone ?? null,
      email: s.email ?? null,
      openTime: s.open_time != null ? String(s.open_time).slice(0, 5) : null,
      closeTime: s.close_time != null ? String(s.close_time).slice(0, 5) : null,
    })
  } catch (e) {
    return next(e)
  }
}
