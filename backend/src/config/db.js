import pg from 'pg'

const { Pool } = pg

/**
 * Prefer DATABASE_URL. You can also set PG* env vars supported by `pg`.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

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

