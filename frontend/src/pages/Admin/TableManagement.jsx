import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl, uploadTableImage } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import AdminPagination from '../../components/AdminPagination'
import DetailModal from '../../components/DetailModal/DetailModal'
import { getStatusLabel } from '../../lib/statusMapper'
import './TableManagement.css'

function statusMeta(status) {
  const s = String(status || '').toUpperCase()
  let className = 'table-card__status'
  if (s === 'AVAILABLE') className += ' table-card__status--green'
  else if (s === 'RESERVED') className += ' table-card__status--yellow'
  else if (s === 'OCCUPIED' || s === 'IN_USE' || s === 'IN USE') className += ' table-card__status--blue'
  else if (s === 'CLOSED') className += ' table-card__status--muted'
  return { className, label: getStatusLabel(status, 'table') }
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

const emptyForm = { name: '', capacity: '4', zone: '', imageUrl: '', image: placeholderImg }
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
  const [zones, setZones] = useState([])
  const [newZoneName, setNewZoneName] = useState('')
  const [zoneLoading, setZoneLoading] = useState(false)
  const [filterZone, setFilterZone] = useState('all')

  function load() {
    setLoading(true)
    apiFetch('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  function loadZones() {
    apiFetch('/zones')
      .then((d) => setZones(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => {
    load()
    loadZones()
  }, [])

  async function addZone(e) {
    e.preventDefault()
    const name = newZoneName.trim()
    if (!name) return
    const ok = await confirm({
      title: 'Tạo khu vực',
      message: `Xác nhận tạo khu vực "${name}"?`,
    })
    if (!ok) return
    setZoneLoading(true)
    try {
      await apiFetch('/zones', { method: 'POST', body: JSON.stringify({ name }) })
      setNewZoneName('')
      loadZones()
      toast('Tạo khu vực thành công', { variant: 'success' })
    } catch (err) {
      toast(err.message, { variant: 'error' })
    } finally {
      setZoneLoading(false)
    }
  }

  async function deleteZone(id, name) {
    const ok = await confirm({
      title: 'Xóa khu vực',
      message: `Xóa khu vực "${name}"? Các bàn thuộc khu này sẽ chuyển về Mặc định.`,
      danger: true,
      fields: [
        { label: 'Tên khu', value: name },
      ],
      warningText: 'Hành động này không thể hoàn tác. Các bàn sẽ được chuyển về khu Mặc định.',
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
    })
    if (!ok) return
    try {
      await apiFetch(`/zones/${id}`, { method: 'DELETE' })
      if (String(filterZone) === String(name)) setFilterZone('all')
      loadZones()
      load()
    } catch (err) {
      toast(err.message, { variant: 'error' })
    }
  }

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
      zone: table.zone ?? '',
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
            zone: form.zone.trim() || null,
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
            zone: form.zone.trim() || null,
          }),
        })
        if (imageFile && created?.id != null) {
          await uploadTableImage(Number(created.id), imageFile)
        }
      }
      closeFormModal()
      toast(editingId ? 'Cập nhật bàn thành công' : 'Tạo bàn thành công', { variant: 'success' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function deleteTable(id) {
    const table = tables.find((x) => x.id === id)
    const okDel = await confirm({
      title: 'Xóa bàn',
      message: `Bạn có chắc chắn muốn xóa bàn này?`,
      danger: true,
      fields: [
        { label: 'Tên bàn', value: table?.name || `#${id}` },
        { label: 'ID', value: String(id) },
      ],
      warningText: 'Hành động này không thể hoàn tác. Bàn sẽ bị xóa khỏi hệ thống.',
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
    })
    if (!okDel) return
    try {
      await apiFetch(`/tables/${id}`, { method: 'DELETE' })
      toast('Xóa bàn thành công', { variant: 'success' })
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
      const matchZone =
        filterZone === 'all'
          ? true
          : String(t.zone || '') === String(filterZone)
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'AVAILABLE'
            ? status === 'AVAILABLE'
            : statusFilter === 'OCCUPIED'
              ? status === 'OCCUPIED' || status === 'IN_USE' || status === 'IN USE'
              : true
      return matchQ && matchStatus && matchZone
    })
  }, [tables, search, statusFilter, filterZone])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, filterZone])

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
          <h1 className="table-mgmt__title">Quản lý bàn</h1>
        </div>
        <button type="button" className="table-mgmt__add" onClick={openAdd}>
          Thêm bàn
        </button>
      </header>

      {/* ─── Zone Manager ─── */}
      <section className="table-mgmt__zoneManager">
        <div className="table-mgmt__zoneManagerInner">
          <div className="table-mgmt__zoneLeft">
            <h2 className="table-mgmt__zoneTitle">Khu vực</h2>
            <p className="table-mgmt__zoneSub">Bàn không gán khu thuộc <strong>Mặc định</strong></p>
          </div>
          <div className="table-mgmt__zoneRight">
            <div className="table-mgmt__zoneList">
              <span
                role="button"
                tabIndex={0}
                className={`table-mgmt__zoneChip${filterZone === 'all' ? ' table-mgmt__zoneChip--on' : ''}`}
                onClick={() => setFilterZone('all')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setFilterZone('all')
                  }
                }}
              >
                Tất cả ({tables.length})
              </span>
              {zones.length === 0 ? (
                <span className="table-mgmt__zoneEmpty">Chưa có khu vực nào</span>
              ) : zones.map((z) => {
                const count = tables.filter((t) => String(t.zone || '') === String(z.name)).length
                return (
                  <span
                    key={z.id}
                    role="button"
                    tabIndex={0}
                    className={`table-mgmt__zoneChip${filterZone === String(z.name) ? ' table-mgmt__zoneChip--on' : ''}`}
                    onClick={() => setFilterZone(String(z.name))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setFilterZone(String(z.name))
                      }
                    }}
                  >
                    {z.name}
                    {count > 0 ? ` (${count})` : ''}
                    <button
                      type="button"
                      className="table-mgmt__zoneChipDel"
                      aria-label={`Xóa khu ${z.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteZone(z.id, z.name)
                      }}
                    >×</button>
                  </span>
                )
              })}
            </div>
            <form className="table-mgmt__zoneForm" onSubmit={addZone}>
              <input
                className="table-mgmt__zoneInput"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Tên khu vực mới…"
                disabled={zoneLoading}
              />
              <button type="submit" className="table-mgmt__add" disabled={zoneLoading || !newZoneName.trim()}>
                + Thêm khu vực
              </button>
            </form>
          </div>
        </div>
      </section>

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
                <h2 className="table-card__name">
                  {t.name} {t.zone && t.zone !== 'Mặc định' ? `(${t.zone})` : ''}
                </h2>
                <span className={st.className}>{st.label}</span>
              </div>
              {t.zone ? (
                <span className="table-card__zone">{t.zone}</span>
              ) : null}
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
        <DetailModal title={editingId ? 'Sửa bàn' : 'Thêm bàn mới'} onClose={closeFormModal}>
          <DetailModal.Card>
            <form className="table-mgmt__form" onSubmit={submitForm} noValidate>
              <label className="table-mgmt__field">
                <span>Tên bàn <span className="required-asterisk">*</span></span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="table-mgmt__field">
                <span>Khu vực</span>
                <select
                  value={form.zone}
                  onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
                >
                  <option value="">Mặc định (không có khu vực)</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>{z.name}</option>
                  ))}
                </select>
              </label>
              <label className="table-mgmt__field">
                <span>Số khách / bàn <span className="required-asterisk">*</span></span>
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
          </DetailModal.Card>
        </DetailModal>
      ) : null}

      {closeModal ? (
        <DetailModal title="Bảo trì bàn" onClose={() => setCloseModal(null)} footerActions={
          <>
            <button type="button" className="table-card__btn table-card__btn--secondary" onClick={() => setCloseModal(null)}>
              Hủy
            </button>
            <button type="button" className="table-card__btn table-card__btn--primary" onClick={submitCloseTable}>
              Xác nhận bảo trì
            </button>
          </>
        }>
          <DetailModal.Card>
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
          </DetailModal.Card>
        </DetailModal>
      ) : null}
    </div>
  )
}
