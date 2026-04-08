import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { ok } from '../../utils/response.js'
import { badRequest } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads')

/** Chuẩn hóa đường dẫn banner (FE gửi full URL đã encodeURI, DB lưu /uploads/... gốc). */
function normalizeBannerPath(u) {
  const raw = String(u || '').trim()
  if (!raw) return ''
  let p = raw
  if (/^https?:\/\//i.test(p)) {
    try {
      const parsed = new URL(p)
      p = parsed.pathname + parsed.search
    } catch {
      return raw
    }
  }
  if (!p.startsWith('/')) p = `/${p}`
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

export async function getSettings(req, res, next) {
  try {
    const r = await query('SELECT * FROM settings ORDER BY id LIMIT 1')
    return ok(res, r.rows[0] || null)
  } catch (e) {
    return next(e)
  }
}

export async function updateSettings(req, res, next) {
  try {
    const {
      restaurant_name,
      banner_urls,
      banner_enabled,
      banner_mode,
      banner_show_on_home,
      banner_show_on_auth,
      header_cta_label,
      header_cta_url,
      footer_tagline,
      footer_copyright,
      footer_links,
      social_links,
      total_tables,
      address,
      phone,
      email,
      open_time,
      close_time,
    } = req.body || {}

    const r = await query(
      `
      INSERT INTO settings (
        id, restaurant_name, banner_urls,
        banner_enabled, banner_mode, banner_show_on_home, banner_show_on_auth,
        header_cta_label, header_cta_url,
        footer_tagline, footer_copyright, footer_links, social_links,
        total_tables, address, phone, email, open_time, close_time
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id)
      DO UPDATE SET
        restaurant_name = EXCLUDED.restaurant_name,
        banner_urls = EXCLUDED.banner_urls,
        banner_enabled = EXCLUDED.banner_enabled,
        banner_mode = EXCLUDED.banner_mode,
        banner_show_on_home = EXCLUDED.banner_show_on_home,
        banner_show_on_auth = EXCLUDED.banner_show_on_auth,
        header_cta_label = EXCLUDED.header_cta_label,
        header_cta_url = EXCLUDED.header_cta_url,
        footer_tagline = EXCLUDED.footer_tagline,
        footer_copyright = EXCLUDED.footer_copyright,
        footer_links = EXCLUDED.footer_links,
        social_links = EXCLUDED.social_links,
        total_tables = EXCLUDED.total_tables,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        open_time = EXCLUDED.open_time,
        close_time = EXCLUDED.close_time,
        updated_at = NOW()
      RETURNING *
    `,
      [
        restaurant_name ?? null,
        Array.isArray(banner_urls) ? banner_urls.map((x) => String(x)).filter(Boolean) : [],
        banner_enabled === undefined ? true : Boolean(banner_enabled),
        String(banner_mode || 'SLIDESHOW').toUpperCase(),
        banner_show_on_home === undefined ? true : Boolean(banner_show_on_home),
        banner_show_on_auth === undefined ? true : Boolean(banner_show_on_auth),
        header_cta_label ?? null,
        header_cta_url ?? null,
        footer_tagline ?? null,
        footer_copyright ?? null,
        Array.isArray(footer_links) ? footer_links : [],
        Array.isArray(social_links) ? social_links : [],
        total_tables ?? null,
        address ?? null,
        phone ?? null,
        email ?? null,
        open_time ?? null,
        close_time ?? null,
      ],
    )
    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function uploadBanners(req, res, next) {
  try {
    const files = Array.isArray(req.files) ? req.files : []
    if (!files.length) throw badRequest('banner là bắt buộc')

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const urls = []
    for (const f of files) {
      const safeName = `${Date.now()}_${Math.random().toString(16).slice(2)}_${f.originalname}`.replaceAll('..', '')
      const fullPath = path.join(UPLOAD_DIR, safeName)
      await fs.writeFile(fullPath, f.buffer)
      urls.push(`/uploads/${safeName}`)
    }

    const cur = await query('SELECT banner_urls FROM settings WHERE id = 1')
    const existing = Array.isArray(cur.rows[0]?.banner_urls) ? cur.rows[0].banner_urls : []
    const nextUrls = [...existing, ...urls]

    const r = await query(
      `
      INSERT INTO settings (id, banner_urls)
      VALUES (1, $1)
      ON CONFLICT (id)
      DO UPDATE SET banner_urls = EXCLUDED.banner_urls, updated_at = NOW()
      RETURNING *
    `,
      [nextUrls],
    )

    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function removeBanner(req, res, next) {
  try {
    const rawInput = req.body?.url ?? req.query?.url
    const target = normalizeBannerPath(rawInput)
    if (!target) throw badRequest('url là bắt buộc')

    const cur = await query('SELECT banner_urls FROM settings WHERE id = 1')
    const existing = Array.isArray(cur.rows[0]?.banner_urls) ? cur.rows[0].banner_urls : []
    const nextUrls = existing.filter((x) => normalizeBannerPath(x) !== target)

    const r = await query(
      `
      INSERT INTO settings (id, banner_urls)
      VALUES (1, $1)
      ON CONFLICT (id)
      DO UPDATE SET banner_urls = EXCLUDED.banner_urls, updated_at = NOW()
      RETURNING *
    `,
      [nextUrls],
    )

    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

export async function uploadLogo(req, res, next) {
  try {
    const file = req.file
    if (!file) throw badRequest('logo là bắt buộc')

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const safeName = `${Date.now()}_${file.originalname}`.replaceAll('..', '')
    const fullPath = path.join(UPLOAD_DIR, safeName)
    await fs.writeFile(fullPath, file.buffer)

    const logoUrl = `/uploads/${safeName}`

    const r = await query(
      `
      INSERT INTO settings (id, logo_url)
      VALUES (1, $1)
      ON CONFLICT (id)
      DO UPDATE SET logo_url = EXCLUDED.logo_url, updated_at = NOW()
      RETURNING *
    `,
      [logoUrl],
    )

    return ok(res, r.rows[0])
  } catch (e) {
    return next(e)
  }
}

