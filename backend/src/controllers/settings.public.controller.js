import { ok } from '../utils/response.js'
import { query } from '../config/db.js'

/** Thông tin hiển thị công khai (trang chủ, footer, QR). */
export async function getPublicSettings(req, res, next) {
  try {
    const r = await query(
      `
      SELECT
        restaurant_name, logo_url, banner_urls,
        banner_enabled, banner_mode, banner_show_on_home, banner_show_on_auth,
        header_cta_label, header_cta_url,
        footer_tagline, footer_copyright, footer_links, social_links,
        address, phone, email, open_time, close_time
      FROM settings
      ORDER BY id
      LIMIT 1
    `,
    )
    const s = r.rows[0] || {}
    return ok(res, {
      restaurantName: s.restaurant_name ?? null,
      logoUrl: s.logo_url ?? null,
      bannerUrls: Array.isArray(s.banner_urls) ? s.banner_urls.filter(Boolean) : [],
      banner: {
        enabled: Boolean(s.banner_enabled ?? true),
        mode: String(s.banner_mode || 'SLIDESHOW').toUpperCase(),
        showOnHome: Boolean(s.banner_show_on_home ?? true),
        showOnAuth: Boolean(s.banner_show_on_auth ?? true),
      },
      header: {
        ctaLabel: s.header_cta_label ?? null,
        ctaUrl: s.header_cta_url ?? null,
      },
      footer: {
        tagline: s.footer_tagline ?? null,
        copyright: s.footer_copyright ?? null,
        links: Array.isArray(s.footer_links) ? s.footer_links : [],
        socials: Array.isArray(s.social_links) ? s.social_links : [],
      },
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
