import { Link } from 'react-router-dom'
import './Home.css'

const features = [
  {
    title: 'Đặt bàn dễ dàng',
    text: 'Chọn ngày, giờ và số khách — xác nhận nhanh, không cần gọi điện.',
    icon: 'calendar',
  },
  {
    title: 'Thực đơn rõ ràng',
    text: 'Xem món, giá và mô tả trước khi đến; gợi ý món phù hợp buổi tối.',
    icon: 'menu',
  },
  {
    title: 'Theo dõi lịch sử',
    text: 'Đăng nhập để xem các lần đặt trước và chi tiết đơn.',
    icon: 'history',
  },
]

export default function Home() {
  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">Ẩm thực tinh tế · Đặt bàn trực tuyến</p>
            <h1 className="home-hero__title">Luxeat</h1>
            <p className="home-hero__lead">
              Trải nghiệm đặt bàn hiện đại: xem thực đơn mọi lúc, giữ chỗ chỉ vài bước, và quản lý lịch sử
              ngay trên trình duyệt.
            </p>
            <div className="home-hero__actions">
              <Link to="/book" className="home-btn home-btn--primary">
                Đặt bàn ngay
              </Link>
              <Link to="/menu" className="home-btn home-btn--secondary">
                Xem thực đơn
              </Link>
            </div>
            <ul className="home-hero__meta">
              <li>Mở cửa hàng ngày</li>
              <li>Phục vụ tận nơi · không gian ấm cúng</li>
            </ul>
          </div>
          <div className="home-hero__panel" aria-hidden="true">
            <div className="home-hero__plate" />
            <p className="home-hero__panel-tag">Hôm nay còn bàn</p>
          </div>
        </div>
      </section>

      <section className="home-features" aria-labelledby="home-features-heading">
        <div className="home-features__head">
          <h2 id="home-features-heading" className="home-section-title">
            Vì sao chọn Luxeat
          </h2>
          <p className="home-section-desc">Giao diện gọn, thao tác nhanh — phù hợp cả khách lẻ lẫn nhóm bạn.</p>
        </div>
        <div className="home-features__grid">
          {features.map((f) => (
            <article key={f.title} className="home-card">
              <div className={`home-card__icon home-card__icon--${f.icon}`} aria-hidden />
              <h3 className="home-card__title">{f.title}</h3>
              <p className="home-card__text">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-strip">
        <div className="home-strip__inner">
          <div>
            <h2 className="home-strip__title">Sẵn sàng đặt bàn?</h2>
            <p className="home-strip__text">Chỉ mất vài phút — chọn giờ và số khách phù hợp.</p>
          </div>
          <Link to="/book" className="home-btn home-btn--light">
            Bắt đầu đặt chỗ
          </Link>
        </div>
      </section>
    </main>
  )
}
