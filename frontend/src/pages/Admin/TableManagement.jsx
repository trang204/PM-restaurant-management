import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
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
  const { toast, confirm } = useNotifications()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [closeModal, setCloseModal] = useState(null)
  const [closeReason, setCloseReason] = useState('')

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
      toast(e.message, { variant: 'error' })
    }
  }

  function openEdit(id) {
    const t = tables.find((x) => x.id === id)
    if (!t) return
    setEditModal({
      id,
      name: t.name ?? '',
      capacity: String(t.capacity ?? 4),
    })
  }

  async function submitEdit() {
    if (!editModal) return
    const capNum = Number.parseInt(editModal.capacity, 10)
    const t = tables.find((x) => x.id === editModal.id)
    try {
      await apiFetch(`/tables/${editModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editModal.name.trim() || t?.name,
          capacity: Number.isFinite(capNum) ? capNum : t?.capacity,
        }),
      })
      setEditModal(null)
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function deleteTable(id) {
    const okDel = await confirm({ title: 'Xóa bàn', message: 'Xóa bàn này?' })
    if (!okDel) return
    try {
      await apiFetch(`/tables/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function openCloseTable(id) {
    setCloseModal({ id })
    setCloseReason('')
  }

  async function submitCloseTable() {
    if (!closeModal) return
    try {
      await apiFetch(`/admin/tables/${closeModal.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          reason: closeReason.trim() ? closeReason.trim() : null,
        }),
      })
      setCloseModal(null)
      setCloseReason('')
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function reopenTable(id) {
    try {
      await apiFetch(`/admin/tables/${id}/reopen`, { method: 'POST', body: JSON.stringify({}) })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
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
                    onClick={() => openCloseTable(t.id)}
                  >
                    Đóng bàn
                  </button>
                )}
                <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => openEdit(t.id)}>
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

      {editModal ? (
        <div
          className="table-mgmt__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-edit-title"
          onClick={() => setEditModal(null)}
        >
          <div className="table-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="table-edit-title" className="table-mgmt__dialogTitle">
              Sửa bàn
            </h2>
            <label className="table-mgmt__field">
              <span>Tên bàn</span>
              <input
                type="text"
                value={editModal.name}
                onChange={(e) => setEditModal((m) => (m ? { ...m, name: e.target.value } : m))}
              />
            </label>
            <label className="table-mgmt__field">
              <span>Sức chứa</span>
              <input
                type="number"
                min={1}
                value={editModal.capacity}
                onChange={(e) => setEditModal((m) => (m ? { ...m, capacity: e.target.value } : m))}
              />
            </label>
            <div className="table-mgmt__dialogActions">
              <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => setEditModal(null)}>
                Hủy
              </button>
              <button type="button" className="table-card__btn table-card__btn--primary" onClick={submitEdit}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeModal ? (
        <div
          className="table-mgmt__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-close-title"
          onClick={() => setCloseModal(null)}
        >
          <div className="table-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="table-close-title" className="table-mgmt__dialogTitle">
              Đóng bàn
            </h2>
            <p className="table-mgmt__dialogHint">Lý do (tuỳ chọn)</p>
            <textarea
              className="table-mgmt__textarea"
              rows={3}
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Ví dụ: bảo trì, hỏng đèn…"
            />
            <div className="table-mgmt__dialogActions">
              <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => setCloseModal(null)}>
                Hủy
              </button>
              <button type="button" className="table-card__btn table-card__btn--primary" onClick={submitCloseTable}>
                Đóng bàn
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
