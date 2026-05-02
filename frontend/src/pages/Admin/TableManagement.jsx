import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl, uploadTableImage } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import AdminPagination from '../../components/AdminPagination'
import './TableManagement.css'

function statusMeta(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'AVAILABLE') return { className: 'table-card__status table-card__status--green', label: 'Trống' }
  if (s === 'RESERVED') return { className: 'table-card__status table-card__status--yellow', label: 'Đã giữ' }
  if (s === 'OCCUPIED') return { className: 'table-card__status table-card__status--blue', label: 'Đang dùng' }
  if (s === 'CLOSED') return { className: 'table-card__status table-card__status--muted', label: 'Đóng' }
  if (s === 'IN_USE' || s === 'IN USE') return { className: 'table-card__status table-card__status--blue', label: 'Đang dùng' }
  return { className: 'table-card__status', label: status }
}

function formatCheckInTime(value) {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
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
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [closeModal, setCloseModal] = useState(null)
  const [closeReason, setCloseReason] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
    const table = tables.find((x) => x.id === id)
    const okDel = await confirm({
      title: 'Xóa bàn',
      message: `Bạn có chắc chắn muốn xóa ${table?.name || `bàn #${id}`} không?`,
    })
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
      toast('Đã đánh dấu bàn bảo trì.', { variant: 'success' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function reopenTable(id) {
    try {
      await apiFetch(`/admin/tables/${id}/reopen`, { method: 'POST', body: JSON.stringify({}) })
      toast('Đã mở bàn lại phục vụ.', { variant: 'success' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function releaseGuest(table) {
    const bookingId = Number(table?.active_booking_id)
    if (!Number.isFinite(bookingId)) {
      toast('Không tìm thấy phiên khách đang dùng bàn.', { variant: 'info' })
      return
    }
    const okClose = await confirm({
      title: 'Đóng bàn',
      message: `Bạn có chắc chắn muốn đóng bàn ${table?.name || ''} không?`,
    })
    if (!okClose) return
    try {
      await apiFetch(`/admin/reservations/${bookingId}/release-guest`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast('Đã đóng bàn và trả về trạng thái trống.', { variant: 'success' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function openOrder(table) {
    const orderId = Number(table?.active_order_id)
    if (!Number.isFinite(orderId)) {
      toast('Bàn này chưa có đơn để xem.', { variant: 'info' })
      return
    }
    navigate(`/admin/kitchen?orderId=${orderId}`)
  }

  function openCallOrder(table) {
    if (!table?.active_order_url) {
      toast('Bàn này chưa có link gọi món.', { variant: 'info' })
      return
    }
    window.open(table.active_order_url, '_blank', 'noopener,noreferrer')
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

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tables.filter((t) => {
      const name = String(t.name || '').toLowerCase()
      const status = String(t.status || '').toUpperCase()
      const matchQ = !q || name.includes(q)
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'AVAILABLE'
            ? status === 'AVAILABLE'
            : statusFilter === 'OCCUPIED'
              ? status === 'OCCUPIED' || status === 'IN_USE' || status === 'IN USE'
              : true
      return matchQ && matchStatus
    })
  }, [tables, search, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const pagedTables = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTables.slice(start, start + pageSize)
  }, [filteredTables, page, pageSize])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredTables.length / pageSize))
    setPage((current) => Math.min(current, totalPages))
  }, [filteredTables.length, pageSize])

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

      <div className="table-mgmt__toolbar">
        <input
          className="table-mgmt__search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên bàn"
        />
        <div className="table-mgmt__filters">
          {[
            ['ALL', 'Tất cả'],
            ['AVAILABLE', 'Trống'],
            ['OCCUPIED', 'Đang dùng'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`table-mgmt__filterBtn${statusFilter === key ? ' table-mgmt__filterBtn--active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="table-mgmt__layoutLink" onClick={() => navigate('/admin/tables/layout')}>
          Chỉnh sơ đồ bàn
        </button>
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      <div className="table-mgmt__grid">
        {pagedTables.map((t) => {
          const st = statusMeta(t.status)
          const status = String(t.status || '').toUpperCase()
          const isOccupied = status === 'OCCUPIED' || status === 'IN_USE' || status === 'IN USE'
          const isAvailable = status === 'AVAILABLE'
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
              {isOccupied ? (
                <div className="table-card__guestInfo">
                  <p>
                    Khách: <strong>{t.active_guest_name || '—'}</strong>
                  </p>
                  <p>
                    Số khách: <strong>{t.active_guest_count || '—'}</strong>
                  </p>
                  <p>
                    Giờ vào: <strong>{formatCheckInTime(t.active_session_created_at)}</strong>
                  </p>
                </div>
              ) : null}
              {t.status_note ? (
                <p className="table-card__note" title={t.status_note}>
                  {t.status_note}
                </p>
              ) : null}
              <div className="table-card__actions">
                {isAvailable ? (
                  <>
                    <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => openEdit(t)}>
                      Chỉnh sửa
                    </button>
                    <button type="button" className="table-card__btn table-card__btn--danger" onClick={() => deleteTable(t.id)}>
                      Xóa
                    </button>
                  </>
                ) : null}

                {isOccupied ? (
                  <>
                    <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => openOrder(t)}>
                      Xem đơn
                    </button>
                    <button type="button" className="table-card__btn table-card__btn--primary" onClick={() => openCallOrder(t)}>
                      Gọi món
                    </button>
                    <button type="button" className="table-card__btn table-card__btn--danger" onClick={() => releaseGuest(t)}>
                      Đóng bàn
                    </button>
                  </>
                ) : null}

                {status === 'CLOSED' ? (
                  <button
                    type="button"
                    className="table-card__btn table-card__btn--primary"
                    onClick={() => reopenTable(t.id)}
                  >
                    Mở phục vụ
                  </button>
                ) : null}

                {status === 'RESERVED' ? (
                  <button
                    type="button"
                    className="table-card__btn table-card__btn--secondary"
                    onClick={() => openCloseTable(t.id)}
                  >
                    Bảo trì bàn
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {!loading && !err && filteredTables.length > 0 ? (
        <AdminPagination
          className="table-mgmt__pagination"
          page={page}
          pageSize={pageSize}
          total={filteredTables.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}

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
              Bảo trì bàn
            </h2>
            <p className="table-mgmt__dialogHint">
              Đánh dấu bàn không phục vụ (sự cố, vệ sinh…). Để gỡ khách và trả bàn trống, dùng mục Tiếp đón → Trả bàn.
            </p>
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
                Xác nhận bảo trì
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
