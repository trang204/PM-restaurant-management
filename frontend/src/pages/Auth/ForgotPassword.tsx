import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mediaUrl, publicApiFetch } from '../../lib/api'
import { requiredMessage } from '../../lib/validation'
import { fetchPublicSettings } from '../../lib/settings'
import './AuthPages.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [brand, setBrand] = useState('Luxeat')
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicSettings()
      .then((s) => {
        setBrand(s.restaurantName?.trim() || 'Luxeat')
        const enabled = Boolean(s.banner?.enabled ?? true)
        const showOnAuth = Boolean(s.banner?.showOnAuth ?? true)
        const urls = Array.isArray(s.bannerUrls) ? s.bannerUrls : []
        if (enabled && showOnAuth && urls.length) setBanner(mediaUrl(urls[0]))
        else setBanner(null)
      })
      .catch(() => {
        setBrand('Luxeat')
        setBanner(null)
      })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setFieldErr(null)
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail) {
      setFieldErr({ email: requiredMessage('Email') })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setFieldErr({ email: 'Email không hợp lệ' })
      return
    }
    setLoading(true)
    try {
      const data = await publicApiFetch<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: nextEmail }),
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
      <div
        className={`authPage__aside${banner ? ' authPage__aside--banner' : ''}`}
        style={banner ? { backgroundImage: `url(${banner})` } : undefined}
      >
        <p className="authPage__eyebrow">Hỗ trợ</p>
        <h1 className="authPage__title">Quên mật khẩu ({brand})</h1>
        <p className="authPage__lead">
          Nhập email đã đăng ký. Nếu tài khoản tồn tại, hệ thống sẽ gửi email kèm liên kết để bạn đổi mật khẩu.
        </p>
      </div>

      <div className="authCard">
        <div className="authCard__head">
          <h2 className="authCard__title">Khôi phục truy cập</h2>
          <p className="authCard__subtitle">Chúng tôi sẽ gửi email khôi phục đến tài khoản đã liên kết.</p>
        </div>

        <form className="authForm" onSubmit={onSubmit} noValidate>
          <div className="authField">
            <label htmlFor="forgot-email" className="authField__label">
              Email
            </label>
            <input
              id="forgot-email"
              className={`authField__input${fieldErr?.email ? ' authField__input--error' : ''}`}
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setFieldErr((prev) => ({ ...(prev || {}), email: undefined }))
                setEmail(e.target.value)
              }}
              placeholder="tenban@email.com"
              disabled={loading}
              aria-invalid={Boolean(fieldErr?.email) || undefined}
            />
            {fieldErr?.email ? <span className="authField__error">{fieldErr.email}</span> : null}
          </div>

          {err ? <p className="authError">{err}</p> : null}
          {msg ? <p className="authSuccess">{msg}</p> : null}

          <button className="authSubmit" type="submit" disabled={loading}>
            {loading ? 'Đang gửi…' : 'Gửi email khôi phục'}
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
