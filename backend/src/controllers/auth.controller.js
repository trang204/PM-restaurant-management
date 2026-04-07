import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { badRequest } from '../utils/httpError.js'
import { ok, created } from '../utils/response.js'

/** Memory users — dùng chung với admin/users. */
export const demoUsers = new Map()

const _adminHash = bcrypt.hashSync('admin123', 10)
demoUsers.set('admin@luxeat.local', {
  id: 'admin_1',
  email: 'admin@luxeat.local',
  fullName: 'Quản trị viên',
  passwordHash: _adminHash,
  role: 'ADMIN',
})

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_secret'
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role || 'CUSTOMER',
      fullName: user.fullName || '',
    },
    secret,
    { expiresIn: '7d' },
  )
}

export async function register(req, res, next) {
  try {
    const { email, password, fullName } = req.body || {}
    if (!email || !password) throw badRequest('email và password là bắt buộc')
    if (demoUsers.has(email)) throw badRequest('Email đã tồn tại')

    const passwordHash = await bcrypt.hash(String(password), 10)
    const user = {
      id: `u_${Date.now()}`,
      email: String(email),
      fullName: String(fullName || ''),
      passwordHash,
      role: 'CUSTOMER',
    }
    demoUsers.set(user.email, user)

    const token = signToken(user)
    return created(res, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, token })
  } catch (e) {
    return next(e)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) throw badRequest('email và password là bắt buộc')

    const user = demoUsers.get(String(email))
    if (!user) throw badRequest('Sai email hoặc mật khẩu')

    const okPass = await bcrypt.compare(String(password), user.passwordHash)
    if (!okPass) throw badRequest('Sai email hoặc mật khẩu')

    const token = signToken(user)
    return ok(res, { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, token })
  } catch (e) {
    return next(e)
  }
}

export async function logout(req, res, next) {
  try {
    // JWT stateless: FE chỉ cần xoá token
    return ok(res, { message: 'Logged out' })
  } catch (e) {
    return next(e)
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {}
    if (!email) throw badRequest('email là bắt buộc')
    // Base: trả về ok để FE dựng flow
    return ok(res, { message: 'Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.' })
  } catch (e) {
    return next(e)
  }
}

export async function resetPassword(req, res, next) {
  try {
    // Base: chưa triển khai token reset
    return ok(res, { message: 'Reset password (base) chưa kích hoạt.' })
  } catch (e) {
    return next(e)
  }
}

