import bcrypt from 'bcrypt'
import { ok, created } from '../../utils/response.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { demoUsers } from '../auth.controller.js'

function userById(id) {
  for (const u of demoUsers.values()) {
    if (String(u.id) === String(id)) return u
  }
  return null
}

function toPublic(u) {
  if (!u) return null
  const { passwordHash: _p, ...rest } = u
  return rest
}

export async function list(req, res, next) {
  try {
    const rows = [...demoUsers.values()].map((u) => toPublic(u))
    return ok(res, rows)
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body || {}
    if (!email || !password) throw badRequest('email và password là bắt buộc')
    if (demoUsers.has(String(email))) throw badRequest('Email đã tồn tại')

    const passwordHash = await bcrypt.hash(String(password), 10)
    const user = {
      id: `u_${Date.now()}`,
      email: String(email),
      fullName: String(fullName || ''),
      passwordHash,
      role: role === 'ADMIN' || role === 'CUSTOMER' ? role : 'CUSTOMER',
    }
    demoUsers.set(user.email, user)
    return created(res, toPublic(user))
  } catch (e) {
    return next(e)
  }
}

export async function updateRole(req, res, next) {
  try {
    const { role } = req.body || {}
    if (!role) throw badRequest('role là bắt buộc')
    const u = userById(req.params.id)
    if (!u) throw notFound('Không tìm thấy người dùng')
    if (role !== 'ADMIN' && role !== 'CUSTOMER') throw badRequest('role không hợp lệ')
    u.role = role
    return ok(res, toPublic(u))
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const u = userById(req.params.id)
    if (!u) throw notFound('Không tìm thấy người dùng')
    if (u.email === 'admin@luxeat.local') throw badRequest('Không xóa tài khoản admin mặc định')
    demoUsers.delete(u.email)
    return ok(res, { id: req.params.id, deleted: true })
  } catch (e) {
    return next(e)
  }
}
