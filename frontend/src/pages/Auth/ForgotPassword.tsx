import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import './AuthPages.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setLoading(true)
    try {
      const data = await apiFetch<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMsg(data?.message || 'Đã gửi yêu cầu.')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="authPage">
      <div className="authPage__aside">
        <p className="authPage__eyebrow">Hỗ trợ</p>
        <h1 className="authPage__title">Quên mật khẩu</h1>
        <p className="authPage__lead">
          Nhập email đã đăng ký. Nếu tài khoản tồn tại, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.
        </p>
      </div>

      <div className="authCard">
        <div className="authCard__head">
          <h2 className="authCard__title">Khôi phục truy cập</h2>
          <p className="authCard__subtitle">Chúng tôi sẽ xử lý yêu cầu theo email bạn cung cấp.</p>
        </div>

        <form className="authForm" onSubmit={onSubmit}>
          <div className="authField">
            <label htmlFor="forgot-email" className="authField__label">
              Email
            </label>
            <input
              id="forgot-email"
              className="authField__input"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@email.com"
              disabled={loading}
            />
          </div>

          {err ? <p className="authError">{err}</p> : null}
          {msg ? <p className="authSuccess">{msg}</p> : null}

          <button className="authSubmit" type="submit" disabled={loading}>
            {loading ? 'Đang gửi…' : 'Gửi liên kết'}
          </button>
        </form>

        <div className="authFooter">
          <p>
            <Link to="/login">← Quay lại đăng nhập</Link>
          </p>
          <p style={{ marginTop: 10 }}>
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
