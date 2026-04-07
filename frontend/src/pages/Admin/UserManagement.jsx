import { useState } from 'react'
import './UserManagement.css'

const initialUsers = [
  { id: '1', name: 'Nguyễn Văn A', email: 'a@example.com', phone: '0901 111 222', role: 'Staff' },
  { id: '2', name: 'Trần Thị B', email: 'b@example.com', phone: '0902 333 444', role: 'Manager' },
  { id: '3', name: 'Lê Văn C', email: 'c@example.com', phone: '0903 555 666', role: 'Admin' },
  { id: '4', name: 'Phạm Thị D', email: 'd@example.com', phone: '0904 777 888', role: 'Staff' },
]

const roles = ['Staff', 'Manager', 'Admin']

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers)

  function editRole(id) {
    const user = users.find((u) => u.id === id)
    if (!user) return
    const choice = window.prompt(`Role for ${user.name} (${roles.join(', ')})`, user.role)
    if (choice === null) return
    const trimmed = choice.trim()
    if (!roles.includes(trimmed)) {
      window.alert('Invalid role.')
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: trimmed } : u)))
  }

  function deleteUser(id) {
    if (!window.confirm('Delete this user?')) return
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="user-mgmt">
      <header className="user-mgmt__header">
        <div>
          <h1 className="user-mgmt__title">Users</h1>
          <p className="user-mgmt__subtitle">Team accounts and access roles.</p>
        </div>
      </header>

      <div className="user-mgmt__table-wrap">
        <table className="user-mgmt__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Name">{u.name}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Phone">{u.phone}</td>
                <td data-label="Role">
                  <span className="user-mgmt__role">{u.role}</span>
                </td>
                <td data-label="Actions">
                  <div className="user-mgmt__actions">
                    <button type="button" className="user-mgmt__btn user-mgmt__btn--secondary" onClick={() => editRole(u.id)}>
                      Edit role
                    </button>
                    <button type="button" className="user-mgmt__btn user-mgmt__btn--danger" onClick={() => deleteUser(u.id)}>
                      Delete
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
