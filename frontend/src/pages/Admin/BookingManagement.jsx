import { useState } from 'react'
import './BookingManagement.css'

const initialRows = [
  {
    id: '1',
    customer: 'Trần Anh',
    phone: '0903 111 222',
    date: '2026-04-08',
    time: '19:00',
    guests: 4,
    status: 'Pending',
  },
  {
    id: '2',
    customer: 'Lê Mai',
    phone: '0912 333 444',
    date: '2026-04-08',
    time: '18:30',
    guests: 2,
    status: 'Confirmed',
  },
  {
    id: '3',
    customer: 'Phạm Hùng',
    phone: '0987 555 666',
    date: '2026-04-07',
    time: '20:00',
    guests: 6,
    status: 'Completed',
  },
  {
    id: '4',
    customer: 'Hoàng Yến',
    phone: '0933 777 888',
    date: '2026-04-09',
    time: '12:00',
    guests: 3,
    status: 'Cancelled',
  },
]

function badgeClass(status) {
  const s = status.toLowerCase()
  if (s === 'pending') return 'book-badge book-badge--yellow'
  if (s === 'confirmed') return 'book-badge book-badge--blue'
  if (s === 'completed') return 'book-badge book-badge--green'
  if (s === 'cancelled') return 'book-badge book-badge--red'
  return 'book-badge'
}

export default function BookingManagement() {
  const [rows, setRows] = useState(initialRows)

  function confirm(id) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Confirmed' } : r)))
  }

  function cancelBooking(id) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Cancelled' } : r)))
  }

  return (
    <div className="booking-mgmt">
      <header className="booking-mgmt__header">
        <div>
          <h1 className="booking-mgmt__title">Bookings</h1>
          <p className="booking-mgmt__subtitle">Review and update reservation status.</p>
        </div>
      </header>

      <div className="booking-mgmt__table-wrap">
        <table className="booking-mgmt__table">
          <thead>
            <tr>
              <th>Customer name</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Time</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Customer">{r.customer}</td>
                <td data-label="Phone">{r.phone}</td>
                <td data-label="Date">{r.date}</td>
                <td data-label="Time">{r.time}</td>
                <td data-label="Guests">{r.guests}</td>
                <td data-label="Status">
                  <span className={badgeClass(r.status)}>{r.status}</span>
                </td>
                <td data-label="Actions">
                  <div className="booking-mgmt__actions">
                    <button
                      type="button"
                      className="booking-mgmt__btn booking-mgmt__btn--primary"
                      disabled={r.status === 'Confirmed' || r.status === 'Cancelled' || r.status === 'Completed'}
                      onClick={() => confirm(r.id)}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="booking-mgmt__btn booking-mgmt__btn--danger"
                      disabled={r.status === 'Cancelled' || r.status === 'Completed'}
                      onClick={() => cancelBooking(r.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
