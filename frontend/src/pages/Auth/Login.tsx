import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, setToken } from '../../lib/api'
import PasswordField from '../../components/PasswordField'
import './AuthPages.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await apiFetch<{ token: string; user: { role?: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(data.token)
      if (data.user?.role === 'ADMIN') {
        window.location.href = '/admin'
        return
      }
      window.location.href = '/'
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="authPage">
      <div className="authPage__aside">
        <p className="authPage__eyebrow">Luxeat</p>
        <h1 className="authPage__title">Chào mừng trở lại</h1>
        <p className="authPage__lead">
          Đăng nhập để xem lịch sử đặt bàn, cập nhật thông tin và tiếp tục trải nghiệm ẩm thực.
        </p>
      </div>

      <div className="authCard">
        <div className="authCard__head">
          <h2 className="authCard__title">Đăng nhập</h2>
          <p className="authCard__subtitle">Nhập email và mật khẩu tài khoản của bạn.</p>
        </div>

        <form className="authForm" onSubmit={onSubmit} noValidate>
          <div className="authField">
            <label htmlFor="login-email" className="authField__label">
              Email
            </label>
            <input
              id="login-email"
              className="authField__input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@email.com"
              disabled={loading}
            />
          </div>

          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            disabled={loading}
            placeholder="••••••••"
          />

          {error ? <p className="authError">{error}</p> : null}

          <button className="authSubmit" type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="authFooter">
          <p>
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
          <p style={{ marginTop: 10 }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
