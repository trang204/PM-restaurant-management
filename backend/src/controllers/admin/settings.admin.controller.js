import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { ok } from '../../utils/response.js'
import { badRequest } from '../../utils/httpError.js'
import { query } from '../../config/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads')

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
      total_tables,
      address,
      phone,
      email,
      open_time,
      close_time,
    } = req.body || {}

    const r = await query(
      `
      INSERT INTO settings (id, restaurant_name, total_tables, address, phone, email, open_time, close_time)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id)
      DO UPDATE SET
        restaurant_name = EXCLUDED.restaurant_name,
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

