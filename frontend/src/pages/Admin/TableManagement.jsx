import { useEffect, useMemo, useState } from 'react'
import { apiFetch, mediaUrl, uploadTableImage } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import './TableManagement.css'

function statusMeta(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'AVAILABLE') return { className: 'table-card__status table-card__status--green', label: 'Trống' }
  if (s === 'RESERVED') return { className: 'table-card__status table-card__status--yellow', label: 'Đã giữ' }
  if (s === 'OCCUPIED') return { className: 'table-card__status table-card__status--red', label: 'Có khách' }
  if (s === 'CLOSED') return { className: 'table-card__status table-card__status--muted', label: 'Đóng' }
  if (s === 'IN_USE' || s === 'IN USE') return { className: 'table-card__status table-card__status--red', label: 'Đang sử dụng' }
  return { className: 'table-card__status', label: status }
}

const placeholderImg =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5efe6"/><stop offset="100%" stop-color="#e5d5bf"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><text x="200" y="132" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#6b5640">Ảnh view bàn</text></svg>`,
  )

const emptyForm = { name: '', capacity: '4', imageUrl: '', image: placeholderImg }
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function TableManagement() {
  const { toast, confirm } = useNotifications()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
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

  function openAdd() {
    setEditingId(null)
    setImageFile(null)
    setForm({
      ...emptyForm,
      name: `Bàn ${tables.length + 1}`,
      capacity: '4',
    })
    setModalOpen(true)
  }

  function openEdit(table) {
    setEditingId(table.id)
    setImageFile(null)
    const img = table.image_url || ''
    setForm({
      name: table.name ?? '',
      capacity: String(table.capacity ?? 4),
      imageUrl: img,
      image: img ? mediaUrl(img) : placeholderImg,
    })
    setModalOpen(true)
  }

  function closeFormModal() {
    setModalOpen(false)
    setEditingId(null)
    setImageFile(null)
    setForm(emptyForm)
  }

  async function submitForm(e) {
    e.preventDefault()
    const capNum = Number.parseInt(form.capacity, 10)
    if (!Number.isFinite(capNum) || capNum <= 0) {
      toast('Chọn số khách hợp lệ cho bàn.', { variant: 'info' })
      return
    }

    try {
      if (editingId) {
        await apiFetch(`/tables/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name.trim() || `Bàn ${editingId}`,
            capacity: capNum,
          }),
        })
        if (imageFile) {
          await uploadTableImage(editingId, imageFile)
        }
      } else {
        const created = await apiFetch('/tables', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim() || `Bàn ${tables.length + 1}`,
            capacity: capNum,
            status: 'AVAILABLE',
          }),
        })
        if (imageFile && created?.id != null) {
          await uploadTableImage(Number(created.id), imageFile)
        }
      }
      closeFormModal()
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

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!allowedImageTypes.includes(file.type)) {
      toast('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF (tối đa 5MB).', { variant: 'error' })
      e.target.value = ''
      return
    }
    setImageFile(file)
    setForm((prev) => ({
      ...prev,
      imageUrl: '',
      image: URL.createObjectURL(file),
    }))
  }

  const seatOptions = useMemo(
    () => Array.from({ length: 20 }, (_, idx) => String(idx + 1)),
    [],
  )

  const previewSrc =
    form.image && String(form.image).startsWith('data:')
      ? form.image
      : form.imageUrl
        ? mediaUrl(form.imageUrl)
        : form.image || placeholderImg

  return (
    <div className="table-mgmt">
      <header className="table-mgmt__header">
        <div>
          <h1 className="table-mgmt__title">Bàn</h1>
          <p className="table-mgmt__subtitle">Quản lý sơ đồ bàn, sức chứa và trạng thái.</p>
        </div>
        <button type="button" className="table-mgmt__add" onClick={openAdd}>
          Thêm bàn
        </button>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      <div className="table-mgmt__grid">
        {tables.map((t) => {
          const st = statusMeta(t.status)
          return (
            <article key={t.id} className="table-card" data-status={t.status}>
              {t.image_url ? (
                <div className="table-card__imageWrap">
                  <img className="table-card__image" src={mediaUrl(t.image_url)} alt={`View của ${t.name}`} />
                </div>
              ) : null}
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
                <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => openEdit(t)}>
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

      {modalOpen ? (
        <div
          className="table-mgmt__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-form-title"
          onClick={closeFormModal}
        >
          <form className="table-mgmt__dialog" onSubmit={submitForm} onClick={(e) => e.stopPropagation()}>
            <h2 id="table-form-title" className="table-mgmt__dialogTitle">
              {editingId ? 'Sửa bàn' : 'Thêm bàn mới'}
            </h2>
            <label className="table-mgmt__field">
              <span>Tên bàn</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="table-mgmt__field">
              <span>Số khách / bàn</span>
              <select value={form.capacity} onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}>
                {seatOptions.map((seat) => (
                  <option key={seat} value={seat}>
                    {seat} người
                  </option>
                ))}
              </select>
            </label>
            <label className="table-mgmt__field">
              <span>Ảnh view bàn</span>
              <input type="file" accept="image/*" onChange={onFileChange} />
            </label>
            <div className="table-mgmt__preview">
              <img className="table-mgmt__previewImg" src={previewSrc} alt="Xem trước ảnh bàn" />
            </div>
            <div className="table-mgmt__dialogActions">
              <button type="button" className="table-card__btn table-card__btn--secondary" onClick={closeFormModal}>
                Hủy
              </button>
              <button type="submit" className="table-card__btn table-card__btn--primary">
                Lưu
              </button>
            </div>
          </form>
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
