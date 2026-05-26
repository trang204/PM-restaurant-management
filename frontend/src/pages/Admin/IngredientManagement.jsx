import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import { requiredMessage } from '../../lib/validation'
import './IngredientManagement.css'

export default function IngredientManagement() {
  const { toast, confirm } = useNotifications()
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')

  // Modals state
  const [editModal, setEditModal] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importModal, setImportModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)

  // Forms state
  const [addForm, setAddForm] = useState({ name: '', unit: '', stock_quantity: 0, min_stock_alert: 0 })
  const [importForm, setImportForm] = useState({ quantity: 1, note: '' })
  const [formErrors, setFormErrors] = useState({})
  const [historyData, setHistoryData] = useState([])

  function load() {
    setLoading(true)
    setErr(null)
    apiFetch('/admin/ingredients')
      .then((data) => {
        setIngredients(Array.isArray(data) ? data : [])
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(q.toLowerCase())
  )

  // Add
  function openAddModal() {
    setAddForm({ name: '', unit: '', stock_quantity: 0, min_stock_alert: 0 })
    setFormErrors({})
    setAddModalOpen(true)
  }

  async function submitAdd() {
    const name = addForm.name.trim()
    const unit = addForm.unit.trim()
    const stock = Number(addForm.stock_quantity)
    const minAlert = Number(addForm.min_stock_alert)

    const nextErrors = {}
    if (!name) nextErrors.name = requiredMessage('Tên nguyên liệu')
    if (!unit) nextErrors.unit = requiredMessage('Đơn vị tính')
    if (stock < 0) nextErrors.stock_quantity = 'Số lượng không được âm'
    if (minAlert < 0) nextErrors.min_stock_alert = 'Ngưỡng cảnh báo không được âm'

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    try {
      await apiFetch('/admin/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          name,
          unit,
          stock_quantity: stock,
          min_stock_alert: minAlert,
        }),
      })
      toast('Thêm nguyên liệu thành công', { variant: 'success' })
      setAddModalOpen(false)
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  // Edit
  function openEditModal(ing) {
    setEditModal({ ...ing })
    setFormErrors({})
  }

  async function submitEdit() {
    if (!editModal) return

    const name = String(editModal.name || '').trim()
    const unit = String(editModal.unit || '').trim()
    const stock = Number(editModal.stock_quantity)
    const minAlert = Number(editModal.min_stock_alert)

    const nextErrors = {}
    if (!name) nextErrors.name = requiredMessage('Tên nguyên liệu')
    if (!unit) nextErrors.unit = requiredMessage('Đơn vị tính')
    if (stock < 0) nextErrors.stock_quantity = 'Số lượng không được âm'
    if (minAlert < 0) nextErrors.min_stock_alert = 'Ngưỡng cảnh báo không được âm'

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    try {
      await apiFetch(`/admin/ingredients/${editModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          unit,
          stock_quantity: stock,
          min_stock_alert: minAlert,
        }),
      })
      toast('Cập nhật thành công', { variant: 'success' })
      setEditModal(null)
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  // Delete
  async function deleteIngredient(ing) {
    const okDel = await confirm({
      title: 'Xóa nguyên liệu',
      message: `Bạn có chắc chắn muốn xóa nguyên liệu "${ing.name}"?`,
      danger: true,
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
    })
    if (!okDel) return

    try {
      await apiFetch(`/admin/ingredients/${ing.id}`, { method: 'DELETE' })
      toast('Xóa thành công', { variant: 'success' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  // Import
  function openImportModal(ing) {
    setImportModal(ing)
    setImportForm({ quantity: 1, note: '' })
    setFormErrors({})
  }

  async function submitImport() {
    if (!importModal) return
    const quantity = Number(importForm.quantity)
    
    if (isNaN(quantity) || quantity <= 0) {
      setFormErrors({ quantity: 'Số lượng nhập phải lớn hơn 0' })
      return
    }

    try {
      await apiFetch(`/admin/ingredients/${importModal.id}/import`, {
        method: 'POST',
        body: JSON.stringify({
          quantity,
          note: importForm.note,
        }),
      })
      toast('Nhập kho thành công', { variant: 'success' })
      setImportModal(null)
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  // History
  async function openHistoryModal(ing) {
    setHistoryModal(ing)
    setHistoryData([])
    try {
      const data = await apiFetch(`/admin/ingredients/${ing.id}/imports`)
      setHistoryData(data)
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function formatDate(val) {
    if (!val) return ''
    return new Date(val).toLocaleString('vi-VN')
  }

  return (
    <div className="ing-mgmt">
      <header className="ing-mgmt__header">
        <h1 className="ing-mgmt__title">Quản lý nguyên liệu</h1>
        <button className="ing-mgmt__add" onClick={openAddModal}>
          Thêm nguyên liệu
        </button>
      </header>

      <div className="ing-mgmt__toolbar">
        <input
          className="ing-mgmt__search"
          type="search"
          placeholder="Tìm tên nguyên liệu..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p>Đang tải...</p>}
      {err && <p style={{ color: 'red' }}>{err}</p>}

      {!loading && !err && (
        <div className="ing-mgmt__table-wrap">
          <table className="ing-mgmt__table">
            <thead>
              <tr>
                <th>Tên nguyên liệu</th>
                <th>Đơn vị tính</th>
                <th>Tồn kho</th>
                <th>Ngưỡng cảnh báo</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map((ing) => (
                <tr key={ing.id}>
                  <td><strong>{ing.name}</strong></td>
                  <td>{ing.unit}</td>
                  <td>{ing.stock_quantity}</td>
                  <td>{ing.min_stock_alert}</td>
                  <td>
                    <span className="ing-mgmt__status" data-status={ing.status}>
                      {ing.status}
                    </span>
                  </td>
                  <td>
                    <div className="ing-mgmt__actions">
                      <button className="ing-mgmt__btn ing-mgmt__btn--primary" onClick={() => openImportModal(ing)}>
                        Nhập kho
                      </button>
                      <button className="ing-mgmt__btn ing-mgmt__btn--secondary" onClick={() => openEditModal(ing)}>
                        Sửa
                      </button>
                      <button className="ing-mgmt__btn ing-mgmt__btn--ghost" onClick={() => openHistoryModal(ing)}>
                        Lịch sử
                      </button>
                      <button className="ing-mgmt__btn ing-mgmt__btn--danger" onClick={() => deleteIngredient(ing)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>
                    Không tìm thấy nguyên liệu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <div className="ing-mgmt__backdrop" onClick={() => setAddModalOpen(false)}>
          <div className="ing-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Thêm nguyên liệu mới</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Tên nguyên liệu (*)</span>
              <input value={addForm.name} onChange={(e) => setAddForm(f => ({...f, name: e.target.value}))} />
              {formErrors.name && <small className="ing-mgmt__dialogError">{formErrors.name}</small>}
            </label>
            
            <label className="ing-mgmt__dialogField">
              <span>Đơn vị tính (*) (vd: kg, lít, cái...)</span>
              <input value={addForm.unit} onChange={(e) => setAddForm(f => ({...f, unit: e.target.value}))} />
              {formErrors.unit && <small className="ing-mgmt__dialogError">{formErrors.unit}</small>}
            </label>
            
            <label className="ing-mgmt__dialogField">
              <span>Số lượng tồn ban đầu</span>
              <input type="number" min="0" step="0.01" value={addForm.stock_quantity} onChange={(e) => setAddForm(f => ({...f, stock_quantity: e.target.value}))} />
              {formErrors.stock_quantity && <small className="ing-mgmt__dialogError">{formErrors.stock_quantity}</small>}
            </label>

            <label className="ing-mgmt__dialogField">
              <span>Ngưỡng cảnh báo tối thiểu</span>
              <input type="number" min="0" step="0.01" value={addForm.min_stock_alert} onChange={(e) => setAddForm(f => ({...f, min_stock_alert: e.target.value}))} />
              {formErrors.min_stock_alert && <small className="ing-mgmt__dialogError">{formErrors.min_stock_alert}</small>}
            </label>

            <div className="ing-mgmt__dialogActions">
              <button className="ing-mgmt__btn ing-mgmt__btn--ghost" onClick={() => setAddModalOpen(false)}>Hủy</button>
              <button className="ing-mgmt__btn ing-mgmt__btn--primary" onClick={submitAdd}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="ing-mgmt__backdrop" onClick={() => setEditModal(null)}>
          <div className="ing-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Sửa nguyên liệu</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Tên nguyên liệu (*)</span>
              <input value={editModal.name} onChange={(e) => setEditModal(f => ({...f, name: e.target.value}))} />
              {formErrors.name && <small className="ing-mgmt__dialogError">{formErrors.name}</small>}
            </label>
            
            <label className="ing-mgmt__dialogField">
              <span>Đơn vị tính (*)</span>
              <input value={editModal.unit} onChange={(e) => setEditModal(f => ({...f, unit: e.target.value}))} />
              {formErrors.unit && <small className="ing-mgmt__dialogError">{formErrors.unit}</small>}
            </label>
            
            <label className="ing-mgmt__dialogField">
              <span>Số lượng tồn</span>
              <input type="number" min="0" step="0.01" value={editModal.stock_quantity} onChange={(e) => setEditModal(f => ({...f, stock_quantity: e.target.value}))} />
              {formErrors.stock_quantity && <small className="ing-mgmt__dialogError">{formErrors.stock_quantity}</small>}
            </label>

            <label className="ing-mgmt__dialogField">
              <span>Ngưỡng cảnh báo tối thiểu</span>
              <input type="number" min="0" step="0.01" value={editModal.min_stock_alert} onChange={(e) => setEditModal(f => ({...f, min_stock_alert: e.target.value}))} />
              {formErrors.min_stock_alert && <small className="ing-mgmt__dialogError">{formErrors.min_stock_alert}</small>}
            </label>

            <div className="ing-mgmt__dialogActions">
              <button className="ing-mgmt__btn ing-mgmt__btn--ghost" onClick={() => setEditModal(null)}>Hủy</button>
              <button className="ing-mgmt__btn ing-mgmt__btn--primary" onClick={submitEdit}>Cập nhật</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="ing-mgmt__backdrop" onClick={() => setImportModal(null)}>
          <div className="ing-mgmt__dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Nhập kho: {importModal.name}</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Số lượng nhập thêm (*)</span>
              <input type="number" min="0.01" step="0.01" value={importForm.quantity} onChange={(e) => setImportForm(f => ({...f, quantity: e.target.value}))} />
              {formErrors.quantity && <small className="ing-mgmt__dialogError">{formErrors.quantity}</small>}
            </label>

            <label className="ing-mgmt__dialogField">
              <span>Ghi chú</span>
              <textarea value={importForm.note} onChange={(e) => setImportForm(f => ({...f, note: e.target.value}))} placeholder="Ghi chú thêm (không bắt buộc)..." />
            </label>

            <div className="ing-mgmt__dialogActions">
              <button className="ing-mgmt__btn ing-mgmt__btn--ghost" onClick={() => setImportModal(null)}>Hủy</button>
              <button className="ing-mgmt__btn ing-mgmt__btn--primary" onClick={submitImport}>Xác nhận nhập kho</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="ing-mgmt__backdrop" onClick={() => setHistoryModal(null)}>
          <div className="ing-mgmt__dialog" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Lịch sử nhập kho: {historyModal.name}</h2>
            
            {historyData.length === 0 ? (
              <p>Chưa có lịch sử nhập kho.</p>
            ) : (
              <table className="ing-mgmt__history-table">
                <thead>
                  <tr>
                    <th>Ngày nhập</th>
                    <th>Số lượng</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map(row => (
                    <tr key={row.id}>
                      <td>{formatDate(row.import_date)}</td>
                      <td>+{row.quantity} {historyModal.unit}</td>
                      <td>{row.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="ing-mgmt__dialogActions">
              <button className="ing-mgmt__btn ing-mgmt__btn--ghost" onClick={() => setHistoryModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
