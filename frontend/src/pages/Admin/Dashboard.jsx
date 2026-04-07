import './Dashboard.css'

const stats = [
  { label: 'Total bookings', value: '1,248', hint: '+12% vs last month' },
  { label: 'Revenue', value: '₫ 892M', hint: 'This month' },
  { label: 'Total tables', value: '42', hint: '12 in use now' },
  { label: 'Total users', value: '3,401', hint: 'Registered' },
]

const recentBookings = [
  {
    id: 'BK-1024',
    customer: 'Trần Anh',
    date: '2026-04-08',
    time: '19:00',
    guests: 4,
    status: 'Confirmed',
  },
  {
    id: 'BK-1023',
    customer: 'Lê Mai',
    date: '2026-04-08',
    time: '18:30',
    guests: 2,
    status: 'Pending',
  },
  {
    id: 'BK-1022',
    customer: 'Phạm Hùng',
    date: '2026-04-07',
    time: '20:00',
    guests: 6,
    status: 'Completed',
  },
  {
    id: 'BK-1021',
    customer: 'Hoàng Yến',
    date: '2026-04-07',
    time: '12:00',
    guests: 3,
    status: 'Cancelled',
  },
]

const chartBars = [
  { label: 'T2', h: 42 },
  { label: 'T3', h: 58 },
  { label: 'T4', h: 48 },
  { label: 'T5', h: 72 },
  { label: 'T6', h: 88 },
  { label: 'T7', h: 95 },
  { label: 'CN', h: 76 },
]

function statusClass(status) {
  const s = status.toLowerCase()
  if (s === 'confirmed') return 'dash-bookings__badge dash-bookings__badge--blue'
  if (s === 'pending') return 'dash-bookings__badge dash-bookings__badge--yellow'
  if (s === 'completed') return 'dash-bookings__badge dash-bookings__badge--green'
  if (s === 'cancelled') return 'dash-bookings__badge dash-bookings__badge--red'
  return 'dash-bookings__badge'
}

export default function Dashboard() {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">Overview of bookings, revenue, and operations.</p>
        </div>
      </header>

      <section className="dashboard__stats" aria-label="Statistics">
        {stats.map((s) => (
          <article key={s.label} className="dash-stat-card">
            <p className="dash-stat-card__label">{s.label}</p>
            <p className="dash-stat-card__value">{s.value}</p>
            <p className="dash-stat-card__hint">{s.hint}</p>
          </article>
        ))}
      </section>

      <div className="dashboard__grid">
        <section className="dash-chart" aria-label="Revenue chart">
          <h2 className="dash-section-title">Revenue (mock)</h2>
          <p className="dash-chart__caption">Last 7 days — demo visualization</p>
          <div className="dash-chart__plot">
            {chartBars.map((b) => (
              <div key={b.label} className="dash-chart__bar-wrap">
                <div className="dash-chart__bar" style={{ height: `${b.h}%` }} title={`${b.label}: ${b.h}%`} />
                <span className="dash-chart__x">{b.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dash-bookings" aria-label="Recent bookings">
          <h2 className="dash-section-title">Recent bookings</h2>
          <div className="dash-bookings__table-wrap">
            <table className="dash-bookings__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Guests</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.customer}</td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td>{r.guests}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
