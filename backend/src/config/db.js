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

export async function ensureDbSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone VARCHAR(20),
      avatar_url TEXT,
      role_id INT REFERENCES roles(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      restaurant_name VARCHAR(150),
      logo_url TEXT,
      banner_urls TEXT[] DEFAULT '{}'::text[],
      banner_enabled BOOLEAN DEFAULT TRUE,
      banner_mode VARCHAR(20) DEFAULT 'SLIDESHOW',
      banner_show_on_home BOOLEAN DEFAULT TRUE,
      banner_show_on_auth BOOLEAN DEFAULT TRUE,
      header_cta_label VARCHAR(80),
      header_cta_url TEXT,
      footer_tagline TEXT,
      footer_copyright TEXT,
      footer_links JSONB DEFAULT '[]'::jsonb,
      social_links JSONB DEFAULT '[]'::jsonb,
      total_tables INT,
      address TEXT,
      phone VARCHAR(20),
      email VARCHAR(100),
      open_time TIME,
      close_time TIME,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50),
      capacity INT NOT NULL,
      status VARCHAR(32) DEFAULT 'AVAILABLE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS foods (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      price DECIMAL(14,2) NOT NULL,
      description TEXT,
      image_url TEXT,
      category_id INT REFERENCES categories(id),
      status VARCHAR(20) DEFAULT 'AVAILABLE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      booking_date DATE NOT NULL,
      booking_time TIME NOT NULL,
      guests INT,
      status VARCHAR(20) DEFAULT 'PENDING',
      hold_expires_at TIMESTAMP,
      note TEXT,
      guest_name VARCHAR(100),
      guest_phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booking_tables (
      id SERIAL PRIMARY KEY,
      booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
      table_id INT REFERENCES tables(id)
    );

    CREATE TABLE IF NOT EXISTS table_sessions (
      id SERIAL PRIMARY KEY,
      table_id INT NOT NULL REFERENCES tables(id),
      booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
      qr_token VARCHAR(96) UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      booking_id INT REFERENCES bookings(id),
      table_session_id INT REFERENCES table_sessions(id),
      status VARCHAR(20) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT REFERENCES orders(id) ON DELETE CASCADE,
      food_id INT REFERENCES foods(id),
      quantity INT NOT NULL,
      price DECIMAL(14,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      order_id INT REFERENCES orders(id),
      amount DECIMAL(14,2),
      method VARCHAR(50),
      status VARCHAR(20),
      paid_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Seed roles tối thiểu để auth/register không lỗi.
  await query(
    `INSERT INTO roles (name)
     SELECT x.name
     FROM (VALUES ('ADMIN'), ('STAFF'), ('CUSTOMER')) AS x(name)
     WHERE NOT EXISTS (SELECT 1 FROM roles)`,
  )

  // Đảm bảo settings id=1 tồn tại (admin/settings và public/settings dựa vào 1 row).
  await query(`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`)

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

  /** DB cũ: status quá ngắn hoặc ENUM thiếu nhãn CLOSED → đóng bàn không lưu được. */
  const stCol = await query(
    `
    SELECT data_type, udt_name, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tables'
      AND column_name = 'status'
    LIMIT 1
    `,
  )
  if (stCol.rows.length) {
    const row = stCol.rows[0]
    const len = row.character_maximum_length
    if (
      (row.data_type === 'character varying' || row.data_type === 'character') &&
      len != null &&
      Number(len) > 0 &&
      Number(len) < 10
    ) {
      await query(`ALTER TABLE tables ALTER COLUMN status TYPE VARCHAR(32)`)
    }
    if (row.data_type === 'USER-DEFINED' && row.udt_name && /^[a-z_][a-z0-9_]*$/i.test(String(row.udt_name))) {
      const typ = String(row.udt_name)
      try {
        await query(`ALTER TYPE ${typ} ADD VALUE IF NOT EXISTS 'CLOSED'`)
      } catch {
        try {
          await query(`ALTER TYPE ${typ} ADD VALUE 'CLOSED'`)
        } catch {
          /* đã có giá trị hoặc PG cũ — bỏ qua */
        }
      }
    }
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
