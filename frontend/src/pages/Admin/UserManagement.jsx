import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import './UserManagement.css'

const roles = ['CUSTOMER', 'STAFF', 'ADMIN']

function groupMeta(group) {
  const g = String(group || 'customers').toLowerCase()
  if (g === 'admins' || g === 'admin') return { role: 'ADMIN', label: 'Admin' }
  if (g === 'staff' || g === 'nhan-vien') return { role: 'STAFF', label: 'Nhân viên' }
  return { role: 'CUSTOMER', label: 'Khách hàng' }
}

export default function UserManagement() {
  const { group } = useParams()
  const meta = useMemo(() => groupMeta(group), [group])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')

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

  async function editRole(id) {
    const user = users.find((u) => u.id === id)
    if (!user) return
    const choice = window.prompt(`Role (${roles.join(', ')})`, user.role)
    if (choice === null) return
    const trimmed = choice.trim()
    if (!roles.includes(trimmed)) {
      window.alert('Role không hợp lệ.')
      return
    }
    try {
      await apiFetch(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: trimmed }),
      })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('Xóa người dùng này?')) return
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  async function addUser() {
    const email = window.prompt('Email')
    if (!email) return
    const password = window.prompt('Mật khẩu')
    if (!password) return
    const fullName = window.prompt('Họ tên', '') || ''
    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: fullName, fullName, role: meta.role }),
      })
      load()
    } catch (e) {
      window.alert(e.message)
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
              Admin
            </NavLink>
          </div>
          <button type="button" className="user-mgmt__add" onClick={addUser}>
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
              <th>Role</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Name">{u.fullName || u.name || '—'}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Phone">{u.phone || '—'}</td>
                <td data-label="Role">
                  <span className="user-mgmt__role">{u.role}</span>
                </td>
                <td data-label="Actions">
                  <div className="user-mgmt__actions">
                    <button type="button" className="user-mgmt__btn user-mgmt__btn--secondary" onClick={() => editRole(u.id)}>
                      Đổi role
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
    </div>
  )
}
