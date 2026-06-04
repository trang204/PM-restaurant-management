import { query } from './src/config/db.js'

async function run() {
  const res = await query(`
    SELECT u.email, r.name as role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'ADMIN'
    LIMIT 5
  `)
  console.log("Admin Users:", res.rows)
  process.exit(0)
}

run()
