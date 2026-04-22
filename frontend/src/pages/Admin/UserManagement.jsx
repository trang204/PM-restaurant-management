import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import './UserManagement.css'

const roles = ['CUSTOMER', 'STAFF', 'ADMIN']

const ROLE_LABELS = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}

function groupMeta(group) {
  const g = String(group || 'customers').toLowerCase()
  if (g === 'admins' || g === 'admin') return { role: 'ADMIN', label: 'Quản trị viên' }
  if (g === 'staff' || g === 'nhan-vien') return { role: 'STAFF', label: 'Nhân viên' }
  return { role: 'CUSTOMER', label: 'Khách hàng' }
}

export default function UserManagement() {
  const { toast, confirm } = useNotifications()
  const { group } = useParams()
  const meta = useMemo(() => groupMeta(group), [group])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [roleModal, setRoleModal] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '', fullName: '' })

  function load() {
    setLoading(true)
    const qs = new URLSearchParams()
    if (meta.role) qs.set('role', meta.role)
    if (q.trim()) qs.set('q', q.trim())
    apiFetch(`/admin/users?${qs.toString()}`)
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [meta.role])

  useEffect(() => {
    const t = window.setTimeout(() => load(), 250)
    return () => window.clearTimeout(t)
  }, [q])

  function openRoleModal(id) {
    const user = users.find((u) => u.id === id)
    if (!user) return
    setRoleModal({ id, role: user.role })
  }

  async function submitRole() {
    if (!roleModal) return
    const trimmed = String(roleModal.role || '').trim()
    if (!roles.includes(trimmed)) {
      toast('Vai trò không hợp lệ.', { variant: 'error' })
      return
    }
    try {
      await apiFetch(`/admin/users/${roleModal.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: trimmed }),
      })
      setRoleModal(null)
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
    setAddForm({ email: '', password: '', fullName: '' })
    setAddModalOpen(true)
  }

  async function submitAddUser() {
    const email = addForm.email.trim()
    const password = addForm.password
    const fullName = addForm.fullName.trim()
    if (!email) {
      toast('Nhập email.', { variant: 'info' })
      return
    }
    if (!password) {
      toast('Nhập mật khẩu.', { variant: 'info' })
      return
    }
    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: fullName, fullName, role: meta.role }),
      })
      setAddModalOpen(false)
      setAddForm({ email: '', password: '', fullName: '' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  return (
    <div className="user-mgmt">
      <header className="user-mgmt__header">
        <div>
          <h1 className="user-mgmt__title">Người dùng · {meta.label}</h1>
          <p className="user-mgmt__subtitle">Tìm theo họ tên, email hoặc số điện thoại.</p>
        </div>
        <div className="user-mgmt__headRight">
          <div className="user-mgmt__tabs" role="tablist" aria-label="Nhóm người dùng">
            <NavLink to="/admin/users/customers" className={({ isActive }) => `user-mgmt__tab${isActive ? ' user-mgmt__tab--on' : ''}`}>
              Khách hàng
            </NavLink>
            <NavLink to="/admin/users/staff" className={({ isActive }) => `user-mgmt__tab${isActive ? ' user-mgmt__tab--on' : ''}`}>
              Nhân viên
            </NavLink>
            <NavLink to="/admin/users/admins" className={({ isActive }) => `user-mgmt__tab${isActive ? ' user-mgmt__tab--on' : ''}`}>
              Quản trị viên
            </NavLink>
          </div>
          <button type="button" className="user-mgmt__add" onClick={openAddModal}>
            Thêm {meta.label}
          </button>
        </div>
      </header>

      <div className="user-mgmt__toolbar">
        <input
          className="user-mgmt__search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên/email/SĐT…"
          type="search"
        />
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
              <th>Vai trò</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Họ tên">{u.fullName || u.name || '—'}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="SĐT">{u.phone || '—'}</td>
                <td data-label="Vai trò">
                  <span className="user-mgmt__role">{ROLE_LABELS[u.role] || u.role}</span>
                </td>
                <td data-label="Thao tác">
                  <div className="user-mgmt__actions">
                    <button type="button" className="user-mgmt__btn user-mgmt__btn--secondary" onClick={() => openRoleModal(u.id)}>
                      Đổi vai trò
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

      {roleModal ? (
        <div
          className="user-mgmt__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-role-title"
          onClick={() => setRoleModal(null)}
        >
          <div className="user-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 id="user-role-title" className="user-mgmt__dialogTitle">
              Đổi vai trò
            </h2>
            <label className="user-mgmt__dialogField">
              <span>Vai trò</span>
              <select
                value={roleModal.role}
                onChange={(e) => setRoleModal((m) => (m ? { ...m, role: e.target.value } : m))}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </label>
            <div className="user-mgmt__dialogActions">
              <button type="button" className="user-mgmt__btn user-mgmt__btn--ghost" onClick={() => setRoleModal(null)}>
                Hủy
              </button>
              <button type="button" className="user-mgmt__btn user-mgmt__btn--primary" onClick={submitRole}>
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
              <span>Email</span>
              <input
                type="email"
                autoComplete="off"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="user-mgmt__dialogField">
              <span>Mật khẩu</span>
              <input
                type="password"
                autoComplete="new-password"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            <label className="user-mgmt__dialogField">
              <span>Họ tên</span>
              <input
                type="text"
                value={addForm.fullName}
                onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </label>
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
