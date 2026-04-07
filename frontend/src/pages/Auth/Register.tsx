import { useState } from 'react'
import { apiFetch, setToken } from '../../lib/api'

export default function Register() {
  const [fullName, setFullName] = useState('Demo User')
  const [email, setEmail] = useState('demo@luxeat.local')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await apiFetch<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      })
      setToken(data.token)
      window.location.href = '/'
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Tài khoản</p>
          <h1 className="menuHero__title">Đăng ký</h1>
          <p className="menuHero__subtitle">Kết nối API · POST /api/auth/register</p>
        </div>
      </header>

      <section className="menuSection">
        <form onSubmit={onSubmit} style={{ maxWidth: 520, textAlign: 'left' }}>
          <label>
            Họ tên
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }} />
          </label>
          <div style={{ height: 10 }} />
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }} />
          </label>
          <div style={{ height: 10 }} />
          <label>
            Mật khẩu
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 12, border: '1px solid var(--border)', marginTop: 6 }} />
          </label>
          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
          <button className="nav__link nav__cta" type="submit" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>
      </section>
    </main>
  )
}

