import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
import { requiredMessage, validateEmail, validatePassword } from '../../lib/validation'
import PasswordField from '../../components/PasswordField'
import { fetchPublicSettings } from '../../lib/settings'
import './AuthPages.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [brand, setBrand] = useState('Luxeat')
  const [banner, setBanner] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string } | null>(null)

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
    setFieldErr(null)
    setLoading(true)
  
    try {
      const nextEmail = email.trim().toLowerCase()
      const nextPassword = password
  
      const emailErr = validateEmail(nextEmail)
      const passwordErr = validatePassword(nextPassword)
  
      // Hiển thị cả 2 lỗi cùng lúc
      if (emailErr || passwordErr) {
        setFieldErr({
          email: emailErr || undefined,
          password: passwordErr || undefined,
        })
        setLoading(false)
        return
      }
  
      const data = await apiFetch<{ token: string; user: { role?: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: nextEmail,
            password: nextPassword,
          }),
        }
      )
  
      setToken(data.token)
  
      if (data.user?.role === 'ADMIN') {
        window.location.href = '/admin'
        return
      }
  
      if (data.user?.role === 'STAFF') {
        window.location.href = '/staff'
        return
      }
  
      window.location.href = '/'
    } catch (err) {
      const msg = (err as Error).message || 'Đăng nhập thất bại'
  
      if (/email không tồn tại/i.test(msg)) {
        setFieldErr({ email: 'Email không tồn tại' })
      } else if (/sai email hoặc mật khẩu/i.test(msg)) {
        setFieldErr({ password: 'Sai email hoặc mật khẩu' })
      } else {
        setFieldErr({ password: msg })
      }
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
        <p className="authPage__eyebrow">{brand}</p>
        <h1 className="authPage__title">Chào mừng bạn đến với {brand}</h1>
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
              className={`authField__input${fieldErr?.email ? ' authField__input--error' : ''}`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setFieldErr((p) => ({ ...(p || {}), email: undefined }))
                setEmail(e.target.value)
              }}
              onBlur={() => {
                const err = validateEmail(email)
                if (err) setFieldErr((p) => ({ ...(p || {}), email: err }))
              }}
              placeholder="tenban@email.com"
              disabled={loading}
              aria-invalid={Boolean(fieldErr?.email) || undefined}
            />
            {fieldErr?.email ? <span className="authField__error">{fieldErr.email}</span> : null}
          </div>

          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={(v) => {
              setFieldErr((p) => ({ ...(p || {}), password: undefined }))
              setPassword(v)
            }}
            autoComplete="current-password"
            required
            disabled={loading}
            placeholder="••••••••"
            error={fieldErr?.password || null}
          />

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
