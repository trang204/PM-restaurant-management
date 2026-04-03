import { ok, created } from '../utils/response.js'
import { notFound } from '../utils/httpError.js'

const tables = [
  { id: 't1', name: 'Bàn 01', capacity: 2, status: 'AVAILABLE', imageUrl: '', zone: 'A' },
  { id: 't2', name: 'Bàn 02', capacity: 4, status: 'AVAILABLE', imageUrl: '', zone: 'A' },
  { id: 't3', name: 'Bàn 03', capacity: 6, status: 'RESERVED', imageUrl: '', zone: 'B' },
]

export async function listTables(req, res, next) {
  try {
    return ok(res, tables)
  } catch (e) {
    return next(e)
  }
}

export async function getTable(req, res, next) {
  try {
    const t = tables.find((x) => x.id === req.params.id)
    if (!t) throw notFound('Không tìm thấy bàn')
    return ok(res, t)
  } catch (e) {
    return next(e)
  }
}

export async function createTable(req, res, next) {
  try {
    const t = { id: `t_${Date.now()}`, status: 'AVAILABLE', ...req.body }
    tables.push(t)
    return created(res, t)
  } catch (e) {
    return next(e)
  }
}

export async function updateTable(req, res, next) {
  try {
    const idx = tables.findIndex((x) => x.id === req.params.id)
    if (idx === -1) throw notFound('Không tìm thấy bàn')
    tables[idx] = { ...tables[idx], ...req.body }
    return ok(res, tables[idx])
  } catch (e) {
    return next(e)
  }
}

export async function deleteTable(req, res, next) {
  try {
    const idx = tables.findIndex((x) => x.id === req.params.id)
    if (idx === -1) throw notFound('Không tìm thấy bàn')
    const removed = tables.splice(idx, 1)[0]
    return ok(res, removed)
  } catch (e) {
    return next(e)
  }
}

