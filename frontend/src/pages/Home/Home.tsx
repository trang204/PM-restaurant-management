import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicSettings, type HomeFeature } from '../../lib/settings'
import { mediaUrl } from '../../lib/api'
import './Home.css'

const DEFAULT_FEATURES: HomeFeature[] = [
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
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [hours, setHours] = useState<string | null>(null)
  const [banners, setBanners] = useState<string[]>([])
  const [bannerIdx, setBannerIdx] = useState(0)
  const [bannerCfg, setBannerCfg] = useState<{ enabled: boolean; mode: string; showOnHome: boolean }>({
    enabled: true,
    mode: 'SLIDESHOW',
    showOnHome: true,
  })
  const [homeContent, setHomeContent] = useState<{
    heroEyebrow: string
    heroLead: string
    heroMeta: string
    heroPanelTag: string
    featuresTitle: string
    featuresDesc: string
    ctaTitle: string
    ctaText: string
    features: HomeFeature[]
  }>({
    heroEyebrow: 'Ẩm thực tinh tế · Đặt bàn trực tuyến',
    heroLead: 'Trải nghiệm đặt bàn hiện đại: xem thực đơn mọi lúc, giữ chỗ chỉ vài bước, và quản lý lịch sử ngay trên trình duyệt.',
    heroMeta: 'Phục vụ tận nơi · không gian ấm cúng',
    heroPanelTag: 'Hôm nay còn bàn',
    featuresTitle: 'Vì sao chọn chúng tôi',
    featuresDesc: 'Giao diện gọn, thao tác nhanh — phù hợp cả khách lẻ lẫn nhóm bạn.',
    ctaTitle: 'Sẵn sàng đặt bàn?',
    ctaText: 'Chỉ mất vài phút — chọn giờ và số khách phù hợp.',
    features: DEFAULT_FEATURES,
  })

  const applySettings = (d: Awaited<ReturnType<typeof fetchPublicSettings>>) => {
    setRestaurantName(d.restaurantName || null)
    if (d.openTime && d.closeTime) setHours(`${d.openTime} – ${d.closeTime}`)
    else setHours(null)
    setBanners(d.bannerUrls ?? [])
    setBannerCfg({
      enabled: Boolean(d.banner?.enabled ?? true),
      mode: String(d.banner?.mode || 'SLIDESHOW').toUpperCase(),
      showOnHome: Boolean(d.banner?.showOnHome ?? true),
    })
    const h = d.home
    if (h) {
      setHomeContent((prev) => ({
        heroEyebrow: h.heroEyebrow || prev.heroEyebrow,
        heroLead: h.heroLead || prev.heroLead,
        heroMeta: h.heroMeta || prev.heroMeta,
        heroPanelTag: h.heroPanelTag || prev.heroPanelTag,
        featuresTitle: h.featuresTitle || prev.featuresTitle,
        featuresDesc: h.featuresDesc || prev.featuresDesc,
        ctaTitle: h.ctaTitle || prev.ctaTitle,
        ctaText: h.ctaText || prev.ctaText,
        features: Array.isArray(h.features) && h.features.length > 0 ? h.features : prev.features,
      }))
    }
  }

  useEffect(() => {
    fetchPublicSettings().then(applySettings).catch(() => {})
  }, [])

  // Re-fetch khi tab homepage được focus lại (ví dụ: admin vừa lưu settings ở tab khác).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchPublicSettings().then(applySettings).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (!banners.length) return
    if (!bannerCfg.enabled || !bannerCfg.showOnHome) return
    if (bannerCfg.mode !== 'SLIDESHOW') return
    const t = window.setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length)
    }, 4500)
    return () => window.clearInterval(t)
  }, [banners.length, bannerCfg.enabled, bannerCfg.mode, bannerCfg.showOnHome])

  useEffect(() => {
    setBannerIdx(0)
  }, [banners.join('|')])

  const showHeroBanner =
    bannerCfg.enabled && bannerCfg.showOnHome && banners.length > 0
  const heroBannerUrl = banners.length
    ? mediaUrl(banners[bannerCfg.mode === 'SLIDESHOW' ? bannerIdx : 0])
    : ''

  const brand = restaurantName?.trim() || 'Luxeat'

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">{homeContent.heroEyebrow}</p>
            <h1 className="home-hero__title">{brand}</h1>
            <p className="home-hero__lead">{homeContent.heroLead}</p>
            <div className="home-hero__actions">
              <Link to="/book" className="home-btn home-btn--primary">
                Đặt bàn ngay
              </Link>
              <Link to="/menu" className="home-btn home-btn--secondary">
                Xem thực đơn
              </Link>
            </div>
            <ul className="home-hero__meta">
              <li>{hours ? `Giờ mở cửa: ${hours}` : 'Mở cửa hàng ngày'}</li>
              <li>{homeContent.heroMeta}</li>
            </ul>
          </div>
          <div className="home-hero__panel" aria-hidden="true">
            <div
              className={
                showHeroBanner ? 'home-hero__plate home-hero__plate--photo' : 'home-hero__plate'
              }
            >
              {showHeroBanner && heroBannerUrl ? (
                <img
                  className="home-hero__plate-img"
                  src={heroBannerUrl}
                  alt=""
                  decoding="async"
                  loading="eager"
                />
              ) : null}
            </div>
            <p className="home-hero__panel-tag">{homeContent.heroPanelTag}</p>
          </div>
        </div>
      </section>

      <section className="home-features" aria-labelledby="home-features-heading">
        <div className="home-features__head">
          <h2 id="home-features-heading" className="home-section-title">
            {homeContent.featuresTitle}
          </h2>
          <p className="home-section-desc">
            {homeContent.featuresDesc}
            {restaurantName ? ` Tại ${restaurantName}.` : ''}
          </p>
        </div>
        <div className="home-features__grid">
          {homeContent.features.map((f, idx) => (
            <article key={f.title || idx} className="home-card">
              <div className={`home-card__icon home-card__icon--${f.icon || 'calendar'}`} aria-hidden />
              <h3 className="home-card__title">{f.title}</h3>
              <p className="home-card__text">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-strip">
        <div className="home-strip__inner">
          <div>
            <h2 className="home-strip__title">{homeContent.ctaTitle}</h2>
            <p className="home-strip__text">{homeContent.ctaText}</p>
          </div>
          <Link to="/book" className="home-btn home-btn--light">
            Bắt đầu đặt chỗ
          </Link>
        </div>
      </section>
    </main>
  )
}
