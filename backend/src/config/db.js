import pg from 'pg'

const { Pool } = pg

/** Ưu tiên DATABASE_URL; không có thì dùng PGHOST, PGPORT, ... */
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || '127.0.0.1',
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD ?? '',
      database: process.env.PGDATABASE || 'postgres',
    }

export const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PostgreSQL error', err)
})

/**
 * @param {string} sql
 * @param {any[]=} params
 */
export async function query(sql, params = []) {
  return pool.query(sql, params)
}

/**
 * Một transaction thật trên cùng một client (tránh BEGIN/COMMIT lệch connection khi dùng pool.query).
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

/** Cập nhật cột thiếu trên DB cũ (tránh 500 khi SELECT thêm cột mới). Không dùng IF NOT EXISTS để tránh NOTICE mỗi lần start. */
export async function ensureDbSchema() {
  const r = await query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tables'
      AND column_name = 'status_note'
    LIMIT 1
    `,
  )
  if (!r.rows.length) {
    await query(`ALTER TABLE tables ADD COLUMN status_note TEXT`)
  }

  const ti = await query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tables'
      AND column_name = 'image_url'
    LIMIT 1
    `,
  )
  if (!ti.rows.length) {
    await query(`ALTER TABLE tables ADD COLUMN image_url TEXT`)
  }

  const u = await query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'avatar_url'
    LIMIT 1
    `,
  )
  if (!u.rows.length) {
    await query(`ALTER TABLE users ADD COLUMN avatar_url TEXT`)
  }

  const oi = await query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'kitchen_status'
    LIMIT 1
    `,
  )
  if (!oi.rows.length) {
    await query(`ALTER TABLE order_items ADD COLUMN kitchen_status VARCHAR(20) DEFAULT 'PENDING'`)
    await query(`ALTER TABLE order_items ADD COLUMN kitchen_ack_at TIMESTAMP`)
  }

  // Cột cài đặt thanh toán chuyển khoản (SePay QR).
  const paymentCols = [
    ['payment_bank_account', 'TEXT'],
    ['payment_bank_code', 'TEXT'],
    ['payment_transfer_content', 'TEXT'],
    ['payment_qr_template', 'TEXT'],
  ]
  for (const [col, type] of paymentCols) {
    const pc = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name=$1 LIMIT 1`,
      [col],
    )
    if (!pc.rows.length) {
      await query(`ALTER TABLE settings ADD COLUMN ${col} ${type}`)
    }
  }

  // Các cột nội dung trang chủ (hero, features, CTA).
  const homeCols = [
    ['hero_eyebrow',        'TEXT'],
    ['hero_lead',           'TEXT'],
    ['hero_meta',           'TEXT'],
    ['hero_panel_tag',      'TEXT'],
    ['home_features_title', 'TEXT'],
    ['home_features_desc',  'TEXT'],
    ['home_cta_title',      'TEXT'],
    ['home_cta_text',       'TEXT'],
    ['home_features_json',  'TEXT'],
  ]
  for (const [col, type] of homeCols) {
    const hc = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name=$1 LIMIT 1`,
      [col],
    )
    if (!hc.rows.length) {
      await query(`ALTER TABLE settings ADD COLUMN ${col} ${type}`)
    }
  }

  // Giá VND thường > 99.999.999 — DECIMAL(10,2) gây overflow; nâng lên 14 chữ số tổng.
  const moneyCols = [
    ['foods', 'price'],
    ['order_items', 'price'],
    ['payments', 'amount'],
  ]
  for (const [table, column] of moneyCols) {
    const pr = await query(
      `
      SELECT numeric_precision AS p
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      LIMIT 1
    `,
      [table, column],
    )
    if (!pr.rows.length) continue
    const prec = Number(pr.rows[0].p)
    if (Number.isFinite(prec) && prec < 14) {
      await query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE DECIMAL(14, 2)`)
    }
  }
}
