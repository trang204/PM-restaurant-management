import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
import { requiredMessage, validateEmail, validatePhone, normalizePhone, validatePassword } from '../../lib/validation'
import PasswordField from '../../components/PasswordField'
import { fetchPublicSettings } from '../../lib/settings'
import './AuthPages.css'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<{ fullName?: string; email?: string; phone?: string; password?: string; confirmPassword?: string } | null>(null)
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
    setError(null)
    setFieldErr(null)

    const nextFullName = fullName.trim()
    const emailErr = validateEmail(email)
    const passwordErr = validatePassword(password)
    if (passwordErr) {
      setFieldErr({ password: passwordErr })
      return
    }
    if (!nextFullName) {
      setFieldErr({ fullName: requiredMessage('Họ và tên') })
      return
    }
    if (emailErr) {
      setFieldErr({ email: emailErr })
      return
    }
    const phoneRaw = phone.trim()
    const phoneErr = validatePhone(phoneRaw)
    if (phoneErr) {
      setFieldErr({ phone: phoneErr })
      return
    }
    if (!password) {
      setFieldErr({ password: requiredMessage('Mật khẩu') })
      return
    }
    if (!confirmPassword) {
      setFieldErr({ confirmPassword: requiredMessage('Xác nhận mật khẩu') })
      return
    }
    if (password !== confirmPassword) {
      setFieldErr({ confirmPassword: 'Mật khẩu xác nhận không khớp.' })
      return
    }
    if (password.length < 6) {
      setFieldErr({ password: 'Mật khẩu tối thiểu 6 ký tự' })
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<{ token: string; user?: { role?: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: nextFullName,
          fullName: nextFullName,
          email: email.trim().toLowerCase(),
          password,
          phone: phoneRaw ? normalizePhone(phoneRaw) : undefined,
        }),
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
      <div
        className={`authPage__aside${banner ? ' authPage__aside--banner' : ''}`}
        style={banner ? { backgroundImage: `url(${banner})` } : undefined}
      >
        <p className="authPage__eyebrow">Tài khoản mới</p>
        <h1 className="authPage__title">Tạo tài khoản {brand}</h1>
        <p className="authPage__lead">
          Một bước đăng ký — lưu lịch sử đặt bàn, nhận ưu đãi và quản lý thông tin cá nhân an toàn.
        </p>
      </div>

      <div className="authCard">
        <div className="authCard__head">
          <h2 className="authCard__title">Đăng ký</h2>
          <p className="authCard__subtitle">Điền thông tin bên dưới. Bạn có thể bật/tắt hiển thị mật khẩu bằng biểu tượng mắt.</p>
        </div>

        <form className="authForm" onSubmit={onSubmit} noValidate>
          <div className="authField">
            <label htmlFor="reg-name" className="authField__label">
              Họ và tên
            </label>
            <input
              id="reg-name"
              className={`authField__input${fieldErr?.fullName ? ' authField__input--error' : ''}`}
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => {
                setFieldErr((prev) => ({ ...(prev || {}), fullName: undefined }))
                setFullName(e.target.value)
              }}
              placeholder="Nguyễn Văn A"
              disabled={loading}
              aria-invalid={Boolean(fieldErr?.fullName) || undefined}
            />
            {fieldErr?.fullName ? <span className="authField__error">{fieldErr.fullName}</span> : null}
          </div>

          <div className="authField">
            <label htmlFor="reg-email" className="authField__label">
              Email
            </label>
            <input
              id="reg-email"
              className={`authField__input${fieldErr?.email ? ' authField__input--error' : ''}`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setFieldErr((prev) => ({ ...(prev || {}), email: undefined }))
                setEmail(e.target.value)
              }}
              onBlur={() => {
                const emailErr = validateEmail(email)
                if (emailErr) setFieldErr((prev) => ({ ...(prev || {}), email: emailErr }))
              }}
              placeholder="tenban@email.com"
              disabled={loading}
              aria-invalid={Boolean(fieldErr?.email) || undefined}
            />
            {fieldErr?.email ? <span className="authField__error">{fieldErr.email}</span> : null}
          </div>

          <div className="authField">
            <label htmlFor="reg-phone" className="authField__label">
              Số điện thoại
            </label>
            <input
              id="reg-phone"
              className={`authField__input${fieldErr?.phone ? ' authField__input--error' : ''}`}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setFieldErr((prev) => ({ ...(prev || {}), phone: undefined }))
                setPhone(e.target.value)
              }}
              onBlur={() => {
                if (phone.trim()) {
                  const err = validatePhone(phone)
                  if (err) setFieldErr((prev) => ({ ...(prev || {}), phone: err }))
                }
              }}
              placeholder="0901 234 567"
              disabled={loading}
              aria-invalid={Boolean(fieldErr?.phone) || undefined}
            />
            {fieldErr?.phone ? <span className="authField__error">{fieldErr.phone}</span> : null}
          </div>

          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={(value) => {
              setFieldErr((prev) => ({ ...(prev || {}), password: undefined }))
              setPassword(value)
            }}
            autoComplete="new-password"
            required
            disabled={loading}
            placeholder="Tối thiểu 6 ký tự"
            error={fieldErr?.password || null}
          />

          <PasswordField
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={(value) => {
              setFieldErr((prev) => ({ ...(prev || {}), confirmPassword: undefined }))
              setConfirmPassword(value)
            }}
            autoComplete="new-password"
            required
            disabled={loading}
            placeholder="Nhập lại mật khẩu"
            error={fieldErr?.confirmPassword || null}
          />

          <p className="authHint">Mật khẩu có thể hiện hoặc ẩn bằng nút bên phải ô nhập.</p>

          {error ? <p className="authError">{error}</p> : null}

          <button className="authSubmit" type="submit" disabled={loading}>
            {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
        </form>

        <div className="authFooter">
          <p>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
