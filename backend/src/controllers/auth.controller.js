import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { badRequest, unauthorized } from '../utils/httpError.js'
import { ok, created } from '../utils/response.js'
import { query } from '../config/db.js'

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_secret'
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      fullName: user.name || '',
    },
    secret,
    { expiresIn },
  )
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function register(req, res, next) {
  try {
    const { name, fullName, email, password, phone } = req.body || {}
    const emailNorm = normalizeEmail(email)
    if (!emailNorm || !password) throw badRequest('email và password là bắt buộc')

    const exists = await query('SELECT id FROM users WHERE email = $1', [emailNorm])
    if (exists.rows.length) throw badRequest('Email đã tồn tại')

    const roleRes = await query('SELECT id FROM roles WHERE name = $1', ['CUSTOMER'])
    const roleId = roleRes.rows[0]?.id || null
    if (!roleId) throw badRequest('Thiếu role CUSTOMER trong bảng roles')

    const passwordHash = await bcrypt.hash(String(password), 10)
    const userName = String(name || fullName || '').trim()
    if (!userName) throw badRequest('name là bắt buộc')

    const inserted = await query(
      `
      INSERT INTO users (name, email, password, phone, role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, phone, role_id, created_at
    `,
      [userName, emailNorm, passwordHash, phone ? String(phone) : null, roleId],
    )

    const roleNameRes = await query('SELECT name FROM roles WHERE id = $1', [roleId])
    const roleName = roleNameRes.rows[0]?.name || 'CUSTOMER'

    const user = {
      id: inserted.rows[0].id,
      name: inserted.rows[0].name,
      email: inserted.rows[0].email,
      phone: inserted.rows[0].phone,
      role: roleName,
      createdAt: inserted.rows[0].created_at,
    }

    const token = signToken(user)
    return created(res, { user, token })
  } catch (e) {
    return next(e)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {}
    const emailNorm = normalizeEmail(email)
    if (!emailNorm || !password) throw badRequest('email và password là bắt buộc')

    const { rows } = await query(
      `
      SELECT
        u.id, u.name, u.email, u.phone, u.password,
        r.name AS role
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
    `,
      [emailNorm],
    )

    const row = rows[0]
    if (!row) throw unauthorized('Email không tồn tại')

    const okPass = await bcrypt.compare(String(password), String(row.password))
    if (!okPass) throw unauthorized('Sai email hoặc mật khẩu')

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role || 'CUSTOMER',
    }

    const token = signToken(user)
    return ok(res, { user, token })
  } catch (e) {
    return next(e)
  }
}

export async function logout(req, res, next) {
  try {
    return ok(res, { message: 'Logged out' })
  } catch (e) {
    return next(e)
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {}
    if (!email) throw badRequest('email là bắt buộc')
    return ok(res, { message: 'Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.' })
  } catch (e) {
    return next(e)
  }
}

export async function resetPassword(req, res, next) {
  try {
    return ok(res, { message: 'Reset password (base) chưa kích hoạt.' })
  } catch (e) {
    return next(e)
  }
}
