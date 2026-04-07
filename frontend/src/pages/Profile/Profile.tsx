import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'

export default function Profile() {
  const [me, setMe] = useState<{ id?: string; email?: string; role?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/users/me')
      .then((d) => setMe(d as any))
      .catch((e) => setError((e as Error).message))
  }, [])

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Tài khoản</p>
          <h1 className="menuHero__title">Thông tin cá nhân</h1>
          <p className="menuHero__subtitle">GET /api/users/me</p>
        </div>
      </header>

      <section className="menuSection" style={{ textAlign: 'left' }}>
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        <pre style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, overflow: 'auto' }}>
          {JSON.stringify(me, null, 2)}
        </pre>
      </section>
    </main>
  )
}

