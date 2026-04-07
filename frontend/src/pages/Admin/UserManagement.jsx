import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './UserManagement.css'

const roles = ['CUSTOMER', 'ADMIN']

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  function load() {
    setLoading(true)
    apiFetch('/admin/users')
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

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
        body: JSON.stringify({ email, password, fullName, role: 'CUSTOMER' }),
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
          <h1 className="user-mgmt__title">Người dùng</h1>
          <p className="user-mgmt__subtitle">GET/POST/PATCH/DELETE /api/admin/users</p>
        </div>
        <button type="button" className="user-mgmt__add" onClick={addUser}>
          Thêm người dùng
        </button>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      <div className="user-mgmt__table-wrap">
        <table className="user-mgmt__table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Role</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Name">{u.fullName || '—'}</td>
                <td data-label="Email">{u.email}</td>
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
