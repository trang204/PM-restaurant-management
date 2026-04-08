import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './TableManagement.css'

function statusMeta(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'AVAILABLE') return { className: 'table-card__status table-card__status--green', label: 'Trống' }
  if (s === 'RESERVED') return { className: 'table-card__status table-card__status--yellow', label: 'Đã giữ' }
  if (s === 'OCCUPIED') return { className: 'table-card__status table-card__status--red', label: 'Có khách' }
  if (s === 'CLOSED') return { className: 'table-card__status table-card__status--muted', label: 'Đóng' }
  if (s === 'IN_USE' || s === 'IN USE') return { className: 'table-card__status table-card__status--red', label: 'In Use' }
  return { className: 'table-card__status', label: status }
}

export default function TableManagement() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  function load() {
    setLoading(true)
    apiFetch('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function addTable() {
    const n = tables.length + 1
    try {
      await apiFetch('/tables', {
        method: 'POST',
        body: JSON.stringify({
          name: `Bàn ${n}`,
          capacity: 4,
          zone: 'A',
          status: 'AVAILABLE',
        }),
      })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function editTable(id) {
    const t = tables.find((x) => x.id === id)
    if (!t) return
    const name = window.prompt('Tên bàn', t.name ?? '')
    if (name === null) return
    const cap = window.prompt('Sức chứa', String(t.capacity ?? 4))
    if (cap === null) return
    const capNum = Number.parseInt(cap, 10)
    try {
      await apiFetch(`/tables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() || t.name,
          capacity: Number.isFinite(capNum) ? capNum : t.capacity,
        }),
      })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function deleteTable(id) {
    if (!window.confirm('Xóa bàn này?')) return
    try {
      await apiFetch(`/tables/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  return (
    <div className="table-mgmt">
      <header className="table-mgmt__header">
        <div>
          <h1 className="table-mgmt__title">Bàn</h1>
          <p className="table-mgmt__subtitle">Quản lý sơ đồ bàn, sức chứa và trạng thái.</p>
        </div>
        <button type="button" className="table-mgmt__add" onClick={addTable}>
          Thêm bàn
        </button>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

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
                Sức chứa: <strong>{t.capacity}</strong> khách
              </p>
              {t.status_note ? (
                <p className="table-card__note" title={t.status_note}>
                  {t.status_note}
                </p>
              ) : null}
              <div className="table-card__actions">
                {String(t.status || '').toUpperCase() === 'CLOSED' ? (
                  <button
                    type="button"
                    className="table-card__btn table-card__btn--primary"
                    onClick={() => reopenTable(t.id)}
                  >
                    Mở bàn
                  </button>
                ) : (
                  <button
                    type="button"
                    className="table-card__btn table-card__btn--secondary"
                    onClick={() => closeTable(t.id)}
                  >
                    Đóng bàn
                  </button>
                )}
                <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => editTable(t.id)}>
                  Sửa
                </button>
                <button type="button" className="table-card__btn table-card__btn--danger" onClick={() => deleteTable(t.id)}>
                  Xóa
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
