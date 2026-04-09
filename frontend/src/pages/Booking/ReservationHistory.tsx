import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { normalizeReservation, type ReservationRow } from '../../lib/reservation'

export default function ReservationHistory() {
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      setLoading(false)
      setError('Đăng nhập để xem lịch sử đặt bàn của bạn.')
      return
    }
    apiFetch<unknown[]>('/reservations')
      .then((d) => {
        const arr = Array.isArray(d) ? d : []
        setRows(
          arr
            .map((raw) => normalizeReservation(raw))
            .filter((x): x is ReservationRow => x != null),
        )
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Lịch sử đặt bàn</h1>
          <p className="menuHero__subtitle">Xem các lần đặt trước và trạng thái đơn của bạn.</p>
        </div>
      </header>

      <section className="menuSection" style={{ textAlign: 'left' }}>
        {loading ? <p>Đang tải...</p> : null}
        {error ? (
          <p style={{ color: error.startsWith('Đăng nhập') ? 'inherit' : 'crimson' }}>
            {error}{' '}
            {error.startsWith('Đăng nhập') ? (
              <Link to="/login" className="nav__link nav__cta" style={{ display: 'inline-block', marginLeft: 8 }}>
                Đăng nhập
              </Link>
            ) : null}
          </p>
        ) : null}
        {!loading && !error && rows.length === 0 ? <p>Chưa có đơn nào (khi đặt đã đăng nhập, đơn sẽ gắn tài khoản).</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <strong>{r.fullName}</strong> · {r.phone}
              <br />
              {r.date} lúc {r.time} · {r.guestCount} khách · <span>{r.status}</span>
              {r.tables?.length ? (
                <>
                  <br />
                  Bàn: {r.tables.join(', ')}
                </>
              ) : null}
              <div style={{ marginTop: 8 }}>
                <Link to={`/reservations/${r.id}`} className="nav__link">
                  Chi tiết
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
