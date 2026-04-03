import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main style={{ width: 'min(1126px, 100%)', margin: '0 auto', padding: '26px 18px 56px', boxSizing: 'border-box' }}>
      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 20,
          textAlign: 'left',
          background:
            'linear-gradient(180deg, color-mix(in oklab, var(--accent-bg) 60%, transparent), transparent 55%), color-mix(in oklab, var(--bg) 92%, var(--accent-bg))',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h1 style={{ margin: '0 0 10px' }}>Luxeat</h1>
        <p style={{ margin: 0, maxWidth: '70ch' }}>
          Website đặt bàn & quản lý nhà hàng. Bạn có thể xem thực đơn không cần đăng nhập, đặt bàn, gọi món trước và theo dõi lịch sử.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <Link className="nav__link nav__cta" to="/book">
            Đặt bàn ngay
          </Link>
          <Link className="nav__link" to="/menu">
            Xem thực đơn
          </Link>
        </div>
      </section>
    </main>
  )
}

