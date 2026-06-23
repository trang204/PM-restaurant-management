import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Calendar, MapPin, Pin, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { normalizeReservation, type ReservationRow } from '../../lib/reservation'
import ReservationDetailView from './ReservationDetailView'
import StatusBadge from '../../components/StatusBadge/StatusBadge'

function formatDateVi(isoDate: string) {
  const s = String(isoDate || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}`
}

function formatTimeVi(rawTime: string) {
  const s = String(rawTime || '').trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return s
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

export default function ReservationHistory() {
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const detailFromUrl = searchParams.get('detail')

  function reloadList() {
    const token = localStorage.getItem('luxeat_token')
    if (!token) return
    apiFetch<unknown[]>('/reservations')
      .then((d) => {
        const arr = Array.isArray(d) ? d : []
        setRows(
          arr
            .map((raw) => normalizeReservation(raw))
            .filter((x): x is ReservationRow => x != null),
        )
      })
      .catch(() => {})
  }

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  useEffect(() => {
    if (!detailFromUrl) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailId(detailFromUrl)
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.delete('detail')
        return n
      },
      { replace: true },
    )
  }, [detailFromUrl, setSearchParams])

  useEffect(() => {
    if (!detailId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailId])

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
        {!loading && !error && rows.length === 0 ? <p>Chưa có đơn nào .</p> : null}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{r.fullName}</strong>
                  <span style={{ opacity: 0.9 }}>· {r.phone}</span>
                </div>

                <div style={{ marginTop: 6, display: 'grid', gap: 2 }}>
                  <div>
                    <Calendar size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                    {formatDateVi(r.date)} - {formatTimeVi(r.time)}
                  </div>
                  <div>
                    <Users size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                    {r.guestCount} khách
                  </div>
                  <div>
                    <MapPin size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                    {r.tables?.length ? `Bàn ${r.tables.join(', ')}` : r.assignedTableId ? `Bàn ${r.assignedTableId}` : 'Chưa gán bàn'}
                  </div>
                  <div>
                    <Pin size={16} style={{ marginRight: 8, verticalAlign: '-0.15em' }} />
                    Trạng thái: <StatusBadge status={String(r.status || '')} />
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="nav__link nav__cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, minWidth: 115 }}
                  onClick={() => setDetailId(String(r.id))}
                >
                  Xem chi tiết
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {detailId ? (
        <ReservationDetailView
          bookingId={detailId}
          variant="modal"
          onClose={() => setDetailId(null)}
          onCancelled={reloadList}
        />
      ) : null}
    </main>
  )
}
