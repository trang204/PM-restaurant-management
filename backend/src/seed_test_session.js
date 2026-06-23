import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function run() {
  try {
    // 1. Get first active food item
    const foodRes = await pool.query('SELECT * FROM foods LIMIT 2');
    if (foodRes.rows.length === 0) {
      console.error('No foods in database. Please seed or add foods first.');
      return;
    }
    const food1 = foodRes.rows[0];
    const food2 = foodRes.rows[1] || food1;

    // 2. Get or create a table
    let tableId;
    const tableRes = await pool.query('SELECT id FROM tables LIMIT 1');
    if (tableRes.rows.length === 0) {
      const insTable = await pool.query("INSERT INTO tables (name, capacity, status) VALUES ('Bàn Test 1', 4, 'FREE') RETURNING id");
      tableId = insTable.rows[0].id;
    } else {
      tableId = tableRes.rows[0].id;
    }

    // 3. Clear existing active sessions on this table
    await pool.query("UPDATE table_sessions SET status = 'CLOSED' WHERE table_id = $1", [tableId]);

    // 4. Create active table session
    const token = 'testtoken123';
    const sessRes = await pool.query(
      `INSERT INTO table_sessions (table_id, qr_token, status)
       VALUES ($1, $2, 'ACTIVE') RETURNING id`,
      [tableId, token]
    );
    const sessionId = sessRes.rows[0].id;

    // 5. Create order with status 'SERVING'
    const orderRes = await pool.query(
      `INSERT INTO orders (table_session_id, status)
       VALUES ($1, 'SERVING') RETURNING id`,
      [sessionId]
    );
    const orderId = orderRes.rows[0].id;

    // 6. Insert order items
    await pool.query(
      `INSERT INTO order_items (order_id, food_id, quantity, price, kitchen_status)
       VALUES ($1, $2, 2, $3, 'PENDING'), ($1, $4, 1, $5, 'PENDING')`,
      [orderId, food1.id, food1.price, food2.id, food2.price]
    );

    console.log(`Successfully created test session!`);
    console.log(`Token: ${token}`);
    console.log(`URL to test: http://localhost:5173/order/table/${token}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
