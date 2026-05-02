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
    const [settingsRes, tablesRes] = await Promise.all([
      query('SELECT * FROM settings ORDER BY id LIMIT 1'),
      query('SELECT COUNT(*)::int AS total FROM tables'),
    ])
    const row = settingsRes.rows[0] || null
    return ok(res, row ? { ...row, total_tables: Number(tablesRes.rows[0]?.total || 0) } : null)
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
      address,
      phone,
      email,
      open_time,
      close_time,
      payment_bank_account,
      payment_bank_code,
      payment_transfer_content,
      payment_qr_template,
      hero_eyebrow,
      hero_lead,
      hero_meta,
      hero_panel_tag,
      home_features_title,
      home_features_desc,
      home_cta_title,
      home_cta_text,
      home_features_json,
    } = req.body || {}

    const phoneValue = phone != null ? String(phone).trim() : ''
    if (phoneValue && !/^(?:\+?84|0)\d{9,10}$/.test(phoneValue.replace(/[.\s-]/g, ''))) {
      throw badRequest('Số điện thoại không hợp lệ')
    }
    const emailValue = email != null ? String(email).trim() : ''
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      throw badRequest('Email không hợp lệ')
    }
    if (open_time && close_time && String(open_time) >= String(close_time)) {
      throw badRequest('Giờ đóng cửa phải sau giờ mở cửa')
    }

    // Đảm bảo row id=1 tồn tại trước.
    await query(`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`)
    const tablesRes = await query('SELECT COUNT(*)::int AS total FROM tables')
    const totalTablesAuto = Number(tablesRes.rows[0]?.total || 0)

    // Build SET động: chỉ cập nhật các cột đã biết — tránh INSERT ON CONFLICT liệt kê cột
    // cứng (lỗi khi DB chưa migrate đủ cột mới).
    const sets = []
    const vals = []
    function col(name, value) {
      vals.push(value)
      sets.push(`${name} = $${vals.length}`)
    }

    col('restaurant_name', restaurant_name ?? null)
    col('banner_urls', Array.isArray(banner_urls) ? banner_urls.map((x) => String(x)).filter(Boolean) : [])
    col('banner_enabled', banner_enabled === undefined ? true : Boolean(banner_enabled))
    col('banner_mode', String(banner_mode || 'SLIDESHOW').toUpperCase())
    col('banner_show_on_home', banner_show_on_home === undefined ? true : Boolean(banner_show_on_home))
    col('banner_show_on_auth', banner_show_on_auth === undefined ? true : Boolean(banner_show_on_auth))
    col('header_cta_label', header_cta_label ?? null)
    col('header_cta_url', header_cta_url ?? null)
    col('footer_tagline', footer_tagline ?? null)
    col('footer_copyright', footer_copyright ?? null)
    col('footer_links', Array.isArray(footer_links) ? footer_links : [])
    col('social_links', Array.isArray(social_links) ? social_links : [])
    col('total_tables', totalTablesAuto)
    col('address', address ?? null)
    col('phone', phone ?? null)
    col('email', email ?? null)
    col('open_time', open_time ?? null)
    col('close_time', close_time ?? null)
    col('payment_bank_account', payment_bank_account != null ? String(payment_bank_account).trim() || null : null)
    col('payment_bank_code', payment_bank_code != null ? String(payment_bank_code).trim() || null : null)
    col('payment_transfer_content', payment_transfer_content != null ? String(payment_transfer_content).trim() || null : null)
    col('payment_qr_template', payment_qr_template != null ? String(payment_qr_template).trim() || null : null)

    // Các cột homepage — chỉ thêm vào SET nếu cột thực sự tồn tại trong DB.
    const homeCols = {
      hero_eyebrow: hero_eyebrow != null ? String(hero_eyebrow).trim() || null : null,
      hero_lead: hero_lead != null ? String(hero_lead).trim() || null : null,
      hero_meta: hero_meta != null ? String(hero_meta).trim() || null : null,
      hero_panel_tag: hero_panel_tag != null ? String(hero_panel_tag).trim() || null : null,
      home_features_title: home_features_title != null ? String(home_features_title).trim() || null : null,
      home_features_desc: home_features_desc != null ? String(home_features_desc).trim() || null : null,
      home_cta_title: home_cta_title != null ? String(home_cta_title).trim() || null : null,
      home_cta_text: home_cta_text != null ? String(home_cta_text).trim() || null : null,
      home_features_json: home_features_json != null ? String(home_features_json).trim() || null : null,
    }
    // Kiểm tra cột nào thực sự tồn tại để tránh lỗi khi schema cũ.
    const existCheck = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'settings'
         AND column_name = ANY($1)`,
      [Object.keys(homeCols)],
    )
    const existSet = new Set(existCheck.rows.map((r) => r.column_name))
    for (const [name, value] of Object.entries(homeCols)) {
      if (existSet.has(name)) col(name, value)
    }

    col('updated_at', new Date())

    const r = await query(
      `UPDATE settings SET ${sets.join(', ')} WHERE id = 1 RETURNING *`,
      vals,
    )
    return ok(res, r.rows[0] ? { ...r.rows[0], total_tables: totalTablesAuto } : null)
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

