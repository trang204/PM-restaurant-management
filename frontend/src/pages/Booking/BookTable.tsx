export default function BookTable() {
  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Đặt bàn (base)</h1>
          <p className="menuHero__subtitle">
            Base flow: nhập thông tin → hiển thị sơ đồ bàn → (tuỳ chọn) gọi món trước → xác nhận.
          </p>
        </div>
      </header>

      <section className="menuSection" style={{ textAlign: 'left' }}>
        <p>Chưa triển khai UI chi tiết. Endpoint backend khung đã có: <code>/api/reservations</code>, <code>/api/tables</code>.</p>
      </section>
    </main>
  )
}

