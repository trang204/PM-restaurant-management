import './Menu.css'
import phoUrl from '../../assets/menu/pho.svg?url'
import bunchaUrl from '../../assets/menu/buncha.svg?url'
import comtamUrl from '../../assets/menu/comtam.svg?url'
import goicuonUrl from '../../assets/menu/goicuon.svg?url'
import trasuaUrl from '../../assets/menu/trasua.svg?url'
import cheUrl from '../../assets/menu/che.svg?url'

type MenuItem = {
  id: string
  name: string
  priceVnd: number
  imageSrc: string
  category: string
  description: string
}

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const items: MenuItem[] = [
  {
    id: 'pho-bo',
    name: 'Phở bò tái',
    priceVnd: 55000,
    imageSrc: phoUrl,
    category: 'Món nước',
    description: 'Nước dùng trong, thơm quế hồi; thịt bò mềm, hành lá tươi.',
  },
  {
    id: 'bun-cha',
    name: 'Bún chả Hà Nội',
    priceVnd: 65000,
    imageSrc: bunchaUrl,
    category: 'Đặc sản',
    description: 'Chả nướng than hoa, nước mắm chua ngọt, rau sống giòn mát.',
  },
  {
    id: 'com-tam',
    name: 'Cơm tấm sườn bì',
    priceVnd: 59000,
    imageSrc: comtamUrl,
    category: 'Món cơm',
    description: 'Sườn nướng mật ong, bì trứng; ăn kèm đồ chua và mỡ hành.',
  },
  {
    id: 'goi-cuon',
    name: 'Gỏi cuốn tôm thịt',
    priceVnd: 45000,
    imageSrc: goicuonUrl,
    category: 'Khai vị',
    description: 'Cuốn tươi mát với bún, rau, tôm; chấm sốt đậu phộng béo bùi.',
  },
  {
    id: 'tra-sua',
    name: 'Trà sữa trân châu',
    priceVnd: 39000,
    imageSrc: trasuaUrl,
    category: 'Đồ uống',
    description: 'Trà thơm dịu, sữa béo; trân châu dẻo dai, ít ngọt dễ uống.',
  },
  {
    id: 'che-khuc-bach',
    name: 'Chè khúc bạch',
    priceVnd: 42000,
    imageSrc: cheUrl,
    category: 'Tráng miệng',
    description: 'Khúc bạch mềm mịn, hạnh nhân rang; ăn cùng vải và nước nhãn.',
  },
]

export default function Menu() {
  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Thực đơn hôm nay</p>
          <h1 className="menuHero__title">Món ngon — giá rõ ràng</h1>
          <p className="menuHero__subtitle">
            Chọn món nhanh, giao diện gọn gàng, hiện đại. Thẻ món có hiệu ứng
            hover và tự co giãn theo màn hình.
          </p>
        </div>
        <div className="menuHero__meta" aria-label="Thông tin nhanh">
          <div className="menuPill">
            <span className="menuPill__label">Giờ mở cửa</span>
            <span className="menuPill__value">08:00 – 22:00</span>
          </div>
          <div className="menuPill">
            <span className="menuPill__label">Đánh giá</span>
            <span className="menuPill__value">4.8/5</span>
          </div>
          <div className="menuPill">
            <span className="menuPill__label">Món nổi bật</span>
            <span className="menuPill__value">Phở • Bún chả</span>
          </div>
        </div>
      </header>

      <section className="menuSection" aria-labelledby="menu-heading">
        <div className="menuSection__header">
          <h2 id="menu-heading" className="menuSection__title">
            Thực đơn
          </h2>
          <p className="menuSection__hint">
            Giá hiển thị theo VND. Nhấn vào thẻ để xem nhanh.
          </p>
        </div>

        <div className="menuGrid" role="list">
          {items.map((item) => (
            <article
              className="menuCard"
              key={item.id}
              role="listitem"
              tabIndex={0}
              aria-label={`${item.name}, giá ${vnd.format(item.priceVnd)}`}
            >
              <div className="menuCard__media">
                <img
                  className="menuCard__img"
                  src={item.imageSrc}
                  alt={item.name}
                  loading="lazy"
                />
                <span className="menuBadge" aria-label={`Danh mục ${item.category}`}>
                  {item.category}
                </span>
              </div>

              <div className="menuCard__body">
                <div className="menuCard__row">
                  <h3 className="menuCard__name">{item.name}</h3>
                  <p className="menuCard__price">{vnd.format(item.priceVnd)}</p>
                </div>
                <p className="menuCard__desc">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="menuFooter">
        <p className="menuFooter__text">
          Gợi ý: bạn có thể thay danh sách món trong{' '}
          <code>src/pages/Menu/Menu.tsx</code> để phù hợp nhà hàng của bạn.
        </p>
      </footer>
    </main>
  )
}

