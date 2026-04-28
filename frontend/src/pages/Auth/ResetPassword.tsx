import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PasswordField from '../../components/PasswordField'
import { publicApiFetch } from '../../lib/api'
import { requiredMessage } from '../../lib/validation'
import './AuthPages.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErr, setFieldErr] = useState<{ password?: string; confirmPassword?: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErr(null)
    setErr(null)
    setMsg(null)

    if (!token) {
      setErr('Liên kết đặt lại mật khẩu không hợp lệ.')
      return
    }
    if (!password) {
      setFieldErr({ password: requiredMessage('Mật khẩu mới') })
      return
    }
    if (password.length < 6) {
      setFieldErr({ password: 'Mật khẩu tối thiểu 6 ký tự' })
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

    setLoading(true)
    try {
      const data = await publicApiFetch<{ message?: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setMsg(data?.message || 'Đặt lại mật khẩu thành công.')
      setPassword('')
      setConfirmPassword('')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="authPage">
      <div className="authPage__aside">
        <p className="authPage__eyebrow">Bảo mật</p>
        <h1 className="authPage__title">Đặt lại mật khẩu</h1>
        <p className="authPage__lead">Nhập mật khẩu mới để hoàn tất việc khôi phục tài khoản của bạn.</p>
      </div>

      <div className="authCard">
        <div className="authCard__head">
          <h2 className="authCard__title">Mật khẩu mới</h2>
          <p className="authCard__subtitle">Liên kết đặt lại mật khẩu có hiệu lực trong 30 phút.</p>
        </div>

        <form className="authForm" onSubmit={onSubmit} noValidate>
          <PasswordField
            label="Mật khẩu mới"
            value={password}
            onChange={(value) => {
              setFieldErr((prev) => ({ ...(prev || {}), password: undefined }))
              setPassword(value)
            }}
            autoComplete="new-password"
            required
            disabled={loading || !token}
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
            disabled={loading || !token}
            placeholder="Nhập lại mật khẩu mới"
            error={fieldErr?.confirmPassword || null}
          />

          {err ? <p className="authError">{err}</p> : null}
          {msg ? <p className="authSuccess">{msg}</p> : null}

          <button className="authSubmit" type="submit" disabled={loading || !token}>
            {loading ? 'Đang cập nhật…' : 'Lưu mật khẩu mới'}
          </button>
        </form>

        <div className="authFooter">
          <p>
            <Link to="/login">← Quay lại đăng nhập</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
