import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, mediaUrl, uploadUserAvatar } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import AdminPagination from '../../components/AdminPagination'
import { requiredMessage } from '../../lib/validation'
import './UserManagement.css'

const roles = ['CUSTOMER', 'STAFF', 'ADMIN']
const statuses = ['ACTIVE', 'LOCKED']

const ROLE_LABELS = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}

const STATUS_LABELS = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Bị khóa',
}

function groupMeta(group) {
  const g = String(group || 'customers').toLowerCase()
  if (g === 'admins' || g === 'admin') return { role: 'ADMIN', label: 'Quản trị viên' }
  if (g === 'staff' || g === 'nhan-vien') return { role: 'STAFF', label: 'Nhân viên' }
  return { role: 'CUSTOMER', label: 'Khách hàng' }
}

export default function UserManagement() {
  const { toast, confirm } = useNotifications()
  const navigate = useNavigate()
  const { group } = useParams()
  const meta = useMemo(() => groupMeta(group), [group])
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editModal, setEditModal] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '', fullName: '', phone: '', status: 'ACTIVE', role: meta.role })
  const [addErrors, setAddErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    setPage(1)
  }, [meta.role, q, statusFilter, createdFrom, createdTo, pageSize])

  function load() {
    setLoading(true)
    setErr(null)
    const qs = new URLSearchParams()
    if (meta.role) qs.set('role', meta.role)
    if (q.trim()) qs.set('q', q.trim())
    if (statusFilter !== 'ALL') qs.set('status', statusFilter)
    if (createdFrom) qs.set('createdFrom', createdFrom)
    if (createdTo) qs.set('createdTo', createdTo)
    qs.set('page', String(page))
    qs.set('pageSize', String(pageSize))
    apiFetch(`/admin/users?${qs.toString()}`)
      .then((d) => {
        setUsers(Array.isArray(d?.items) ? d.items : [])
        const pg = d?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 }
        setPagination(pg)
        if (Number.isFinite(Number(pg.page)) && Number(pg.page) !== page) {
          setPage(Number(pg.page))
        }
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [meta.role, page, pageSize])

  useEffect(() => {
    const t = window.setTimeout(() => load(), 250)
    return () => window.clearTimeout(t)
  }, [q, statusFilter, createdFrom, createdTo, pageSize])

  function openEditModal(user) {
    setAvatarFile(null)
    setAvatarPreview('')
    setEditModal({
      id: user.id,
      fullName: user.fullName || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || meta.role,
      status: user.status || 'ACTIVE',
      avatar_url: user.avatar_url || null,
    })
    setEditErrors({})
  }

  async function submitEdit() {
    if (!editModal) return
    const nextErrors = {}
    if (!String(editModal.fullName || '').trim()) nextErrors.fullName = requiredMessage('Họ tên')
    if (!String(editModal.email || '').trim()) nextErrors.email = requiredMessage('Email')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(editModal.email).trim())) nextErrors.email = 'Email không hợp lệ'
    if (Object.keys(nextErrors).length) {
      setEditErrors(nextErrors)
      return
    }
    const trimmedRole = String(editModal.role || '').trim()
    if (!roles.includes(trimmedRole)) {
      toast('Vai trò không hợp lệ.', { variant: 'error' })
      return
    }
    try {
      const updated = await apiFetch(`/admin/users/${editModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editModal.fullName,
          email: editModal.email,
          phone: editModal.phone,
          role: trimmedRole,
          status: editModal.status,
        }),
      })
      if (avatarFile) {
        await uploadUserAvatar(editModal.id, avatarFile)
      }
      setEditModal(null)
      setAvatarFile(null)
      setAvatarPreview('')
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function deleteUser(id) {
    const okDel = await confirm({ title: 'Xóa người dùng', message: 'Xóa người dùng này?' })
    if (!okDel) return
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function openAddModal() {
    setAddForm({ email: '', password: '', fullName: '', phone: '', status: 'ACTIVE', role: meta.role })
    setAddErrors({})
    setAvatarFile(null)
    setAvatarPreview('')
    setAddModalOpen(true)
  }

  async function submitAddUser() {
    const email = addForm.email.trim()
    const password = addForm.password
    const fullName = addForm.fullName.trim()
    const phone = addForm.phone.trim()
    const nextErrors = {}
    if (!fullName) nextErrors.fullName = requiredMessage('Họ tên')
    if (!email) nextErrors.email = requiredMessage('Email')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Email không hợp lệ'
    if (!password) nextErrors.password = requiredMessage('Mật khẩu')
    if (Object.keys(nextErrors).length) {
      setAddErrors(nextErrors)
      return
    }
    try {
      const created = await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          fullName,
          phone: phone || null,
          role: addForm.role,
          status: addForm.status,
        }),
      })
      if (avatarFile && created?.id != null) {
        await uploadUserAvatar(Number(created.id), avatarFile)
      }
      setAddModalOpen(false)
      setAddForm({ email: '', password: '', fullName: '', phone: '', status: 'ACTIVE', role: meta.role })
      setAvatarFile(null)
      setAvatarPreview('')
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function onAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const nextPreview = URL.createObjectURL(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextPreview
    })
  }

  function avatarSrc(user) {
    if (avatarPreview) return avatarPreview
    if (user?.avatar_url) return mediaUrl(user.avatar_url)
    return ''
  }

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  function formatDate(value) {
    if (!value) return '—'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return value
    return dt.toLocaleDateString('vi-VN')
  }

  function userInitials(user) {
    const source = String(user?.fullName || user?.name || user?.email || 'U').trim()
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  }

  return (
    <div className="user-mgmt">
      <header className="user-mgmt__header">
        <div>
          <h1 className="user-mgmt__title">Người dùng · {meta.label}</h1>
          <p className="user-mgmt__subtitle">Tìm theo họ tên, email hoặc số điện thoại.</p>
        </div>
        <div className="user-mgmt__headRight">
          <button type="button" className="user-mgmt__add" onClick={openAddModal}>
            Thêm {meta.label}
          </button>
        </div>
      </header>

      <div className="user-mgmt__toolbar">
        <select
          className="user-mgmt__filterSelect"
          value={meta.role}
          onChange={(e) => {
            const nextRole = e.target.value
            const nextGroup = nextRole === 'ADMIN' ? 'admins' : nextRole === 'STAFF' ? 'staff' : 'customers'
            navigate(`/admin/users/${nextGroup}`)
          }}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <input
          className="user-mgmt__search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên/email/SĐT…"
          type="search"
        />
        <select className="user-mgmt__filterSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input className="user-mgmt__date" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
        <input className="user-mgmt__date" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      <div className="user-mgmt__table-wrap">
        <table className="user-mgmt__table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th>Vai trò</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Họ tên">
                  <div className="user-mgmt__userCell">
                    {u.avatar_url ? (
                      <img className="user-mgmt__avatar" src={mediaUrl(u.avatar_url)} alt="" />
                    ) : (
                      <span className="user-mgmt__avatar user-mgmt__avatar--fallback">{userInitials(u)}</span>
                    )}
                    <div>
                      <strong className="user-mgmt__userName">{u.fullName || u.name || '—'}</strong>
                    </div>
                  </div>
                </td>
                <td data-label="Email">{u.email}</td>
                <td data-label="SĐT">{u.phone || '—'}</td>
                <td data-label="Ngày tạo">{formatDate(u.created_at)}</td>
                <td data-label="Trạng thái">
                  <span className="user-mgmt__status" data-status={u.status}>
                    {STATUS_LABELS[u.status] || u.status || '—'}
                  </span>
                </td>
                <td data-label="Vai trò">
                  <span className="user-mgmt__role" data-role={u.role}>{ROLE_LABELS[u.role] || u.role}</span>
                </td>
                <td data-label="Thao tác">
                  <div className="user-mgmt__actions">
                    <button type="button" className="user-mgmt__btn user-mgmt__btn--secondary" onClick={() => openEditModal(u)}>
                      Chỉnh sửa
                    </button>
                    <button type="button" className="user-mgmt__btn user-mgmt__btn--danger" onClick={() => deleteUser(u.id)}>
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !err ? (
        <AdminPagination
          className="user-mgmt__pagination"
          page={page}
          pageSize={pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}

      {editModal ? (
        <div
          className="user-mgmt__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-edit-title"
          onClick={() => setEditModal(null)}
        >
          <div className="user-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="user-edit-title" className="user-mgmt__dialogTitle">
              Chỉnh sửa người dùng
            </h2>
            <label className="user-mgmt__dialogField">
              <span>Họ tên</span>
              <input
                value={editModal.fullName}
                onChange={(e) => {
                  setEditErrors((prev) => ({ ...prev, fullName: '' }))
                  setEditModal((m) => (m ? { ...m, fullName: e.target.value } : m))
                }}
              />
              {editErrors.fullName ? <small className="user-mgmt__dialogError">{editErrors.fullName}</small> : null}
            </label>
            <label className="user-mgmt__dialogField">
              <span>Email</span>
              <input
                type="email"
                value={editModal.email}
                onChange={(e) => {
                  setEditErrors((prev) => ({ ...prev, email: '' }))
                  setEditModal((m) => (m ? { ...m, email: e.target.value } : m))
                }}
              />
              {editErrors.email ? <small className="user-mgmt__dialogError">{editErrors.email}</small> : null}
            </label>
            <label className="user-mgmt__dialogField">
              <span>Số điện thoại</span>
              <input value={editModal.phone} onChange={(e) => setEditModal((m) => (m ? { ...m, phone: e.target.value } : m))} />
            </label>
            <label className="user-mgmt__dialogField">
              <span>Vai trò</span>
              <select
                value={editModal.role}
                onChange={(e) => setEditModal((m) => (m ? { ...m, role: e.target.value } : m))}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </label>
            <label className="user-mgmt__dialogField">
              <span>Trạng thái</span>
              <select
                value={editModal.status}
                onChange={(e) => setEditModal((m) => (m ? { ...m, status: e.target.value } : m))}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="user-mgmt__dialogField">
              <span>Avatar</span>
              <input type="file" accept="image/*" onChange={onAvatarChange} />
            </label>
            {avatarSrc(editModal) ? (
              <div className="user-mgmt__avatarPreview">
                <img src={avatarSrc(editModal)} alt="Avatar preview" />
              </div>
            ) : null}
            <div className="user-mgmt__dialogActions">
              <button type="button" className="user-mgmt__btn user-mgmt__btn--ghost" onClick={() => setEditModal(null)}>
                Hủy
              </button>
              <button type="button" className="user-mgmt__btn user-mgmt__btn--primary" onClick={submitEdit}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addModalOpen ? (
        <div
          className="user-mgmt__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-add-title"
          onClick={() => setAddModalOpen(false)}
        >
          <div className="user-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="user-add-title" className="user-mgmt__dialogTitle">
              Thêm {meta.label}
            </h2>
            <label className="user-mgmt__dialogField">
              <span>Họ tên</span>
              <input
                type="text"
                value={addForm.fullName}
                onChange={(e) => {
                  setAddErrors((prev) => ({ ...prev, fullName: '' }))
                  setAddForm((f) => ({ ...f, fullName: e.target.value }))
                }}
              />
              {addErrors.fullName ? <small className="user-mgmt__dialogError">{addErrors.fullName}</small> : null}
            </label>
            <label className="user-mgmt__dialogField">
              <span>Email</span>
              <input
                type="email"
                autoComplete="off"
                value={addForm.email}
                onChange={(e) => {
                  setAddErrors((prev) => ({ ...prev, email: '' }))
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }}
              />
              {addErrors.email ? <small className="user-mgmt__dialogError">{addErrors.email}</small> : null}
            </label>
            <label className="user-mgmt__dialogField">
              <span>Mật khẩu</span>
              <input
                type="password"
                autoComplete="new-password"
                value={addForm.password}
                onChange={(e) => {
                  setAddErrors((prev) => ({ ...prev, password: '' }))
                  setAddForm((f) => ({ ...f, password: e.target.value }))
                }}
              />
              {addErrors.password ? <small className="user-mgmt__dialogError">{addErrors.password}</small> : null}
            </label>
            <label className="user-mgmt__dialogField">
              <span>Số điện thoại</span>
              <input
                type="text"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="user-mgmt__dialogField">
              <span>Vai trò</span>
              <select value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="user-mgmt__dialogField">
              <span>Trạng thái</span>
              <select value={addForm.status} onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="user-mgmt__dialogField">
              <span>Avatar</span>
              <input type="file" accept="image/*" onChange={onAvatarChange} />
            </label>
            {avatarSrc(addForm) ? (
              <div className="user-mgmt__avatarPreview">
                <img src={avatarSrc(addForm)} alt="Avatar preview" />
              </div>
            ) : null}
            <div className="user-mgmt__dialogActions">
              <button type="button" className="user-mgmt__btn user-mgmt__btn--ghost" onClick={() => setAddModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="user-mgmt__btn user-mgmt__btn--primary" onClick={submitAddUser}>
                Tạo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
