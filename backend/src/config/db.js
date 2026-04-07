import pg from 'pg'

const { Pool } = pg

/**
 * Kết nối PostgreSQL bằng biến môi trường riêng (không dùng DATABASE_URL).
 * Xem: https://node-postgres.com/apis/pool
 */
export const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD ?? '',
  database: process.env.PGDATABASE || 'postgres',
})

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Lỗi PostgreSQL không mong đợi', err)
})

/**
 * @param {string} sql
 * @param {any[]=} params
 */
export async function query(sql, params = []) {
  return pool.query(sql, params)
}
