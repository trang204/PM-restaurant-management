// ─── Ingredient API ───────────────────────────────────────────────────────────
import { apiFetch } from './base'

export type Ingredient = {
  id: number
  name: string
  unit: string
  stock_quantity: number
  min_stock_alert: number
  created_at?: string | null
}

export type IngredientUnit = {
  id: number
  name: string
}

export type IngredientImport = {
  id: number
  ingredient_id: number
  quantity: number
  note?: string | null
  import_date: string
}

export async function adminListIngredients(): Promise<Ingredient[]> {
  return apiFetch<Ingredient[]>('/admin/ingredients')
}

export async function adminListIngredientUnits(): Promise<IngredientUnit[]> {
  return apiFetch<IngredientUnit[]>('/admin/ingredients/units')
}

export async function adminCreateIngredient(payload: {
  name: string
  unit: string
  stock_quantity?: number
  min_stock_alert?: number
}): Promise<Ingredient> {
  return apiFetch<Ingredient>('/admin/ingredients', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateIngredient(
  id: number,
  payload: {
    name?: string
    unit?: string
    stock_quantity?: number
    min_stock_alert?: number
  },
): Promise<Ingredient> {
  return apiFetch<Ingredient>(`/admin/ingredients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteIngredient(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/admin/ingredients/${id}`, {
    method: 'DELETE',
  })
}

export async function adminImportIngredient(
  id: number,
  payload: { quantity: number; note?: string },
): Promise<IngredientImport> {
  return apiFetch<IngredientImport>(`/admin/ingredients/${id}/import`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminGetIngredientImports(id: number): Promise<IngredientImport[]> {
  return apiFetch<IngredientImport[]>(`/admin/ingredients/${id}/imports`)
}

export async function adminGetRecentImports(limit = 5): Promise<IngredientImport[]> {
  return apiFetch<IngredientImport[]>(`/admin/ingredients/imports/recent?limit=${limit}`)
}

export async function adminCreateIngredientUnit(name: string): Promise<IngredientUnit> {
  return apiFetch<IngredientUnit>('/admin/ingredients/units', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function adminDeleteIngredientUnit(
  id: number,
): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/admin/ingredients/units/${id}`, {
    method: 'DELETE',
  })
}
