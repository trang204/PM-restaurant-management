import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import AdminPagination from '../../components/AdminPagination'
import { requiredMessage } from '../../lib/validation'
import './IngredientManagement.css'

export default function IngredientManagement() {
  const { toast, confirm } = useNotifications()
  const [activeTab, setActiveTab] = useState('ingredients') // 'ingredients' or 'units'

  // Data state
  const [ingredients, setIngredients] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')

  // Pagination state
  const [ingPage, setIngPage] = useState(1)
  const [ingPageSize, setIngPageSize] = useState(10)
  const [unitPage, setUnitPage] = useState(1)
  const [unitPageSize, setUnitPageSize] = useState(10)

  // Reset pagination when search query or tab changes
  useEffect(() => {
    setIngPage(1)
    setUnitPage(1)
  }, [q, activeTab])

  // Modals state
  const [editModal, setEditModal] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importModal, setImportModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)
  const [unitAddModalOpen, setUnitAddModalOpen] = useState(false)

  // Forms state
  const [addForm, setAddForm] = useState({ name: '', unit: '', stock_quantity: 0, min_stock_alert: 0 })
  const [importForm, setImportForm] = useState({ quantity: 1, note: '' })
  const [unitAddForm, setUnitAddForm] = useState({ name: '' })
  const [formErrors, setFormErrors] = useState({})
  const [historyData, setHistoryData] = useState([])

  function load() {
    setLoading(true)
    setErr(null)
    Promise.all([
      apiFetch('/admin/ingredients'),
      apiFetch('/admin/ingredients/units')
    ])
      .then(([ingData, unitsData]) => {
        setIngredients(Array.isArray(ingData) ? ingData : [])
        setUnits(Array.isArray(unitsData) ? unitsData : [])
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

  const pagedIngredients = useMemo(() => {
    const start = (ingPage - 1) * ingPageSize
    return filteredIngredients.slice(start, start + ingPageSize)
  }, [filteredIngredients, ingPage, ingPageSize])

  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(q.toLowerCase())
  )

  const pagedUnits = useMemo(() => {
    const start = (unitPage - 1) * unitPageSize
    return filteredUnits.slice(start, start + unitPageSize)
  }, [filteredUnits, unitPage, unitPageSize])

  // ---- Ingredients CRUD ----

  function openAddModal() {
    setAddForm({ name: '', unit: units.length > 0 ? units[0].name : '', stock_quantity: 0, min_stock_alert: 0 })
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

  // ---- Ingredient Import ----

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

  // ---- Units CRUD ----

  function openUnitAddModal() {
    setUnitAddForm({ name: '' })
    setFormErrors({})
    setUnitAddModalOpen(true)
  }

  async function submitAddUnit() {
    const name = unitAddForm.name.trim()
    if (!name) {
      setFormErrors({ name: requiredMessage('Tên đơn vị tính') })
      return
    }
    try {
      await apiFetch('/admin/ingredients/units', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      toast('Thêm đơn vị tính thành công', { variant: 'success' })
      setUnitAddModalOpen(false)
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  async function deleteUnit(unit) {
    const okDel = await confirm({
      title: 'Xóa đơn vị tính',
      message: `Bạn có chắc chắn muốn xóa đơn vị "${unit.name}"?`,
      danger: true,
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
    })
    if (!okDel) return

    try {
      await apiFetch(`/admin/ingredients/units/${unit.id}`, { method: 'DELETE' })
      toast('Xóa đơn vị tính thành công', { variant: 'success' })
      load()
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
        <div>
          <h1 className="ing-mgmt__title">Quản lý nguyên liệu</h1>
        </div>
        <div className="ing-mgmt__headRight">
          {activeTab === 'ingredients' ? (
            <button className="ing-mgmt__add" onClick={openAddModal}>
              Thêm nguyên liệu
            </button>
          ) : (
            <button className="ing-mgmt__add" onClick={openUnitAddModal}>
              Thêm đơn vị tính
            </button>
          )}
        </div>
      </header>

      <div className="ing-mgmt__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ingredients'}
          className={`ing-mgmt__tab${activeTab === 'ingredients' ? ' ing-mgmt__tab--active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          Danh sách Nguyên liệu
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'units'}
          className={`ing-mgmt__tab${activeTab === 'units' ? ' ing-mgmt__tab--active' : ''}`}
          onClick={() => setActiveTab('units')}
        >
          Đơn vị tính
        </button>
      </div>

      <div className="ing-mgmt__toolbar">
        <input
          className="ing-mgmt__search"
          type="search"
          placeholder={activeTab === 'ingredients' ? "Tìm tên nguyên liệu..." : "Tìm đơn vị tính..."}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p>Đang tải...</p>}
      {err && <p style={{ color: 'red' }}>{err}</p>}

      {!loading && !err && activeTab === 'ingredients' && (
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
              {pagedIngredients.map((ing) => (
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
          {filteredIngredients.length > 0 && (
            <AdminPagination
              className="ing-mgmt__pagination"
              page={ingPage}
              pageSize={ingPageSize}
              total={filteredIngredients.length}
              onPageChange={setIngPage}
              onPageSizeChange={setIngPageSize}
            />
          )}
        </div>
      )}

      {!loading && !err && activeTab === 'units' && (
        <div className="ing-mgmt__table-wrap" style={{ maxWidth: 700 }}>
          <table className="ing-mgmt__table">
            <thead>
              <tr>
                <th>Tên đơn vị</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedUnits.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <div className="ing-mgmt__actions">
                      <button className="ing-mgmt__btn ing-mgmt__btn--danger" onClick={() => deleteUnit(u)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUnits.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '24px' }}>
                    Chưa có đơn vị tính nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredUnits.length > 0 && (
            <AdminPagination
              className="ing-mgmt__pagination"
              page={unitPage}
              pageSize={unitPageSize}
              total={filteredUnits.length}
              onPageChange={setUnitPage}
              onPageSizeChange={setUnitPageSize}
            />
          )}
        </div>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <div className="ing-mgmt__backdrop" onPointerDown={() => setAddModalOpen(false)}>
          <div className="ing-mgmt__dialog" onPointerDown={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Thêm nguyên liệu mới</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Tên nguyên liệu <span className="required-asterisk">*</span></span>
              <input className={formErrors.name ? 'input-error' : ''} value={addForm.name} onChange={(e) => setAddForm(f => ({...f, name: e.target.value}))} />
              {formErrors.name && <small className="ing-mgmt__dialogError">{formErrors.name}</small>}
            </label>
            
            <label className="ing-mgmt__dialogField">
              <span>Đơn vị tính <span className="required-asterisk">*</span></span>
              {units.length > 0 ? (
                <select className={formErrors.unit ? 'input-error' : ''} value={addForm.unit} onChange={(e) => setAddForm(f => ({...f, unit: e.target.value}))}>
                  <option value="">— Chọn đơn vị —</option>
                  {units.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <input value={addForm.unit} placeholder="Chưa có ĐVT, nhập tay..." onChange={(e) => setAddForm(f => ({...f, unit: e.target.value}))} />
              )}
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
        <div className="ing-mgmt__backdrop" onPointerDown={() => setEditModal(null)}>
          <div className="ing-mgmt__dialog" onPointerDown={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Sửa nguyên liệu</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Tên nguyên liệu <span className="required-asterisk">*</span></span>
              <input className={formErrors.name ? 'input-error' : ''} value={editModal.name} onChange={(e) => setEditModal(f => ({...f, name: e.target.value}))} />
              {formErrors.name && <small className="ing-mgmt__dialogError">{formErrors.name}</small>}
            </label>
            
            <label className="ing-mgmt__dialogField">
              <span>Đơn vị tính <span className="required-asterisk">*</span></span>
              {units.length > 0 ? (
                <select className={formErrors.unit ? 'input-error' : ''} value={editModal.unit} onChange={(e) => setEditModal(f => ({...f, unit: e.target.value}))}>
                  <option value="">— Chọn đơn vị —</option>
                  {/* Nếu unit hiện tại không có trong list, thêm nó vào list tạm */}
                  {!units.some(u => u.name === editModal.unit) && editModal.unit && (
                    <option value={editModal.unit}>{editModal.unit}</option>
                  )}
                  {units.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <input value={editModal.unit} onChange={(e) => setEditModal(f => ({...f, unit: e.target.value}))} />
              )}
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
        <div className="ing-mgmt__backdrop" onPointerDown={() => setImportModal(null)}>
          <div className="ing-mgmt__dialog" onPointerDown={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Nhập kho: {importModal.name}</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Số lượng nhập thêm <span className="required-asterisk">*</span></span>
              <input type="number" min="0.01" step="0.01" className={formErrors.quantity ? 'input-error' : ''} value={importForm.quantity} onChange={(e) => setImportForm(f => ({...f, quantity: e.target.value}))} />
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
        <div className="ing-mgmt__backdrop" onPointerDown={() => setHistoryModal(null)}>
          <div className="ing-mgmt__dialog" style={{ maxWidth: 600 }} onPointerDown={(e) => e.stopPropagation()}>
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

      {/* Add Unit Modal */}
      {unitAddModalOpen && (
        <div className="ing-mgmt__backdrop" onPointerDown={() => setUnitAddModalOpen(false)}>
          <div className="ing-mgmt__dialog" onPointerDown={(e) => e.stopPropagation()}>
            <h2 className="ing-mgmt__dialogTitle">Thêm đơn vị tính mới</h2>
            
            <label className="ing-mgmt__dialogField">
              <span>Tên đơn vị tính (vd: kg, lít, hộp, ...) <span className="required-asterisk">*</span></span>
              <input className={formErrors.name ? 'input-error' : ''} value={unitAddForm.name} onChange={(e) => setUnitAddForm(f => ({...f, name: e.target.value}))} />
              {formErrors.name && <small className="ing-mgmt__dialogError">{formErrors.name}</small>}
            </label>

            <div className="ing-mgmt__dialogActions">
              <button className="ing-mgmt__btn ing-mgmt__btn--ghost" onClick={() => setUnitAddModalOpen(false)}>Hủy</button>
              <button className="ing-mgmt__btn ing-mgmt__btn--primary" onClick={submitAddUnit}>Thêm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
