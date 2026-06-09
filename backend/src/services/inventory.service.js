import { query } from '../config/db.js'

/**
 * Deduct ingredients based on food items ordered.
 * Automatically marks foods as UNAVAILABLE if their ingredient stock
 * drops to or below the min_stock_alert.
 * 
 * @param {import('pg').PoolClient} client - The database client (within a transaction)
 * @param {number} foodId - The ID of the food item ordered
 * @param {number} quantityOrdered - The quantity of the food item ordered
 */
export async function deductIngredientsForFood(client, foodId, quantityOrdered) {
  if (!foodId || !quantityOrdered || quantityOrdered <= 0) return

  // 1. Get required ingredients
  const fiRes = await client.query(
    'SELECT ingredient_id, quantity_needed FROM food_ingredients WHERE food_id = $1',
    [foodId]
  )
  
  if (!fiRes.rows.length) return

  for (const fi of fiRes.rows) {
    const deductAmount = Number(fi.quantity_needed) * Number(quantityOrdered)
    if (deductAmount === 0) continue

    // 2. Deduct inventory
    const updRes = await client.query(
      `UPDATE ingredients
       SET stock_quantity = stock_quantity - $1
       WHERE id = $2
       RETURNING id, stock_quantity, min_stock_alert`,
      [deductAmount, fi.ingredient_id]
    )

    // 3. Auto-disable foods if stock <= alert
    const ing = updRes.rows[0]
    if (ing && Number(ing.stock_quantity) <= Number(ing.min_stock_alert)) {
      await client.query(
        `UPDATE foods f
         SET status = 'UNAVAILABLE'
         FROM food_ingredients fi
         WHERE f.id = fi.food_id AND fi.ingredient_id = $1 AND f.status = 'AVAILABLE'`,
        [ing.id]
      )
    }
  }
}
