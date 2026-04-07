import { useState } from 'react'
import './TableManagement.css'

const initialTables = [
  { id: '1', name: 'T1 — Window', capacity: 4, status: 'Available' },
  { id: '2', name: 'T2 — Garden', capacity: 2, status: 'Reserved' },
  { id: '3', name: 'T3 — VIP', capacity: 8, status: 'In Use' },
  { id: '4', name: 'T4', capacity: 4, status: 'Available' },
  { id: '5', name: 'T5 — Bar', capacity: 2, status: 'In Use' },
  { id: '6', name: 'T6', capacity: 6, status: 'Reserved' },
]

function statusMeta(status) {
  const s = status.toLowerCase()
  if (s === 'available') return { className: 'table-card__status table-card__status--green', label: 'Available' }
  if (s === 'reserved') return { className: 'table-card__status table-card__status--yellow', label: 'Reserved' }
  if (s.includes('use')) return { className: 'table-card__status table-card__status--red', label: 'In Use' }
  return { className: 'table-card__status', label: status }
}

export default function TableManagement() {
  const [tables, setTables] = useState(initialTables)

  function addTable() {
    const n = tables.length + 1
    setTables((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: `T${n}`,
        capacity: 4,
        status: 'Available',
      },
    ])
  }

  function editTable(id) {
    const name = window.prompt('Table name', tables.find((t) => t.id === id)?.name ?? '')
    if (name === null) return
    const cap = window.prompt('Capacity', String(tables.find((t) => t.id === id)?.capacity ?? 4))
    if (cap === null) return
    const capNum = Number.parseInt(cap, 10)
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name, capacity: Number.isFinite(capNum) ? capNum : t.capacity } : t)),
    )
  }

  function deleteTable(id) {
    if (!window.confirm('Delete this table?')) return
    setTables((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="table-mgmt">
      <header className="table-mgmt__header">
        <div>
          <h1 className="table-mgmt__title">Tables</h1>
          <p className="table-mgmt__subtitle">Manage floor layout and table status.</p>
        </div>
        <button type="button" className="table-mgmt__add" onClick={addTable}>
          Add Table
        </button>
      </header>

      <div className="table-mgmt__grid">
        {tables.map((t) => {
          const st = statusMeta(t.status)
          return (
            <article key={t.id} className="table-card">
              <div className="table-card__top">
                <h2 className="table-card__name">{t.name}</h2>
                <span className={st.className}>{st.label}</span>
              </div>
              <p className="table-card__capacity">
                Capacity: <strong>{t.capacity}</strong> guests
              </p>
              <div className="table-card__actions">
                <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => editTable(t.id)}>
                  Edit
                </button>
                <button type="button" className="table-card__btn table-card__btn--danger" onClick={() => deleteTable(t.id)}>
                  Delete
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
