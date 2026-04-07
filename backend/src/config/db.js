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
