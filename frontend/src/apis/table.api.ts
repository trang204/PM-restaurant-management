// ─── Table & Zone API ─────────────────────────────────────────────────────────
import { apiFetch, publicApiFetch, getToken, API_BASE } from './base'

export type Table = {
  id: number
  name?: string | null
  capacity: number
  status: string
  status_note?: string | null
  image_url?: string | null
  zone?: string | null
  created_at?: string | null
}

export type Zone = {
  id: number
  name: string
}

// removed
// ─── Public ───────────────────────────────────────────────────────────────────

export async function getPublicTables(): Promise<Table[]> {
  return publicApiFetch<Table[]>('/tables')
}

export async function getPublicZones(): Promise<Zone[]> {
  return publicApiFetch<Zone[]>('/zones')
}

// ─── Authenticated ────────────────────────────────────────────────────────────

export async function listTables(): Promise<Table[]> {
  return apiFetch<Table[]>('/tables')
}

export async function listZones(): Promise<Zone[]> {
  return apiFetch<Zone[]>('/zones')
}

export async function createZone(name: string): Promise<Zone> {
  return apiFetch<Zone>('/zones', { method: 'POST', body: JSON.stringify({ name }) })
}

export async function deleteZone(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/zones/${id}`, { method: 'DELETE' })
}

export async function createTable(payload: {
  name?: string
  capacity: number
  zone?: string
  status?: string
}): Promise<Table> {
  return apiFetch<Table>('/tables', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateTable(
  id: number,
  payload: {
    name?: string
    capacity?: number
    zone?: string
    status?: string
    layout?: Record<string, unknown>
  },
): Promise<Table> {
  return apiFetch<Table>(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteTable(id: number): Promise<{ id: number; deleted: boolean }> {
  return apiFetch<{ id: number; deleted: boolean }>(`/tables/${id}`, { method: 'DELETE' })
}

export async function adminCloseTable(
  id: number,
  payload: { reason?: string },
): Promise<{ id: number; status: string }> {
  return apiFetch<{ id: number; status: string }>(`/admin/tables/${id}/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminReopenTable(id: number): Promise<{ id: number; status: string }> {
  return apiFetch<{ id: number; status: string }>(`/admin/tables/${id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function uploadTableImage(
  tableId: number,
  file: File,
): Promise<{ id: number; image_url: string }> {
  const token = getToken()
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/tables/${tableId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = await res.json().catch(() => null)
  if (!json) throw new Error('Invalid API response')
  if (json.success) return json.data as { id: number; image_url: string }
  throw new Error(json.error?.message || 'Upload ảnh thất bại')
}

// removed
