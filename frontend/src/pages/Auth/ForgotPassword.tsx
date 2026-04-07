import { useState } from 'react'
import { apiFetch } from '../../lib/api'

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
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Tài khoản</p>
          <h1 className="menuHero__title">Quên mật khẩu</h1>
          <p className="menuHero__subtitle">POST /api/auth/forgot-password</p>
        </div>
      </header>

      <section className="menuSection">
        <form onSubmit={onSubmit} style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }}
            />
          </label>
          {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}
          {msg ? <p>{msg}</p> : null}
          <button className="nav__link nav__cta" type="submit" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Đang gửi...' : 'Gửi'}
          </button>
        </form>
      </section>
    </main>
  )
}
