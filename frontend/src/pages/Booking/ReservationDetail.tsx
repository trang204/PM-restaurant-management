import { useParams } from 'react-router-dom'

export default function ReservationDetail() {
  const { id } = useParams()
  return (
    <main className="menuPage">
      <header className="menuHero">
        <div className="menuHero__content">
          <p className="menuHero__eyebrow">Đặt bàn</p>
          <h1 className="menuHero__title">Chi tiết đơn (base)</h1>
          <p className="menuHero__subtitle">Reservation ID: {id}</p>
        </div>
      </header>
    </main>
  )
}

