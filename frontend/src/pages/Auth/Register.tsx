import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
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

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu nên có ít nhất 6 ký tự.')
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<{ token: string; user?: { role?: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: fullName.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
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
              className="authField__input"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={loading}
            />
          </div>

          <div className="authField">
            <label htmlFor="reg-email" className="authField__label">
              Email
            </label>
            <input
              id="reg-email"
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

          <div className="authField">
            <label htmlFor="reg-phone" className="authField__label">
              Số điện thoại <span className="authField__optional">(tuỳ chọn)</span>
            </label>
            <input
              id="reg-phone"
              className="authField__input"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901 234 567"
              disabled={loading}
            />
          </div>

          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            disabled={loading}
            placeholder="Tối thiểu 6 ký tự"
          />

          <PasswordField
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
            disabled={loading}
            placeholder="Nhập lại mật khẩu"
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
