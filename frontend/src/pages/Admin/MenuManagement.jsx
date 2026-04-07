import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import './MenuManagement.css'

const placeholderImg =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8f5e9"/><stop offset="100%" stop-color="#c8e6c9"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><text x="200" y="132" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#52796f">Ảnh món</text></svg>`,
  )

const emptyForm = { name: '', price: '', categoryId: '', imageUrl: '', image: placeholderImg }

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

export default function MenuManagement() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  function load() {
    setLoading(true)
    Promise.all([apiFetch('/admin/menu-items'), apiFetch('/admin/categories')])
      .then(([mi, cat]) => {
        setItems(Array.isArray(mi) ? mi : [])
        setCategories(Array.isArray(cat) ? cat : [])
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function openAdd() {
    setEditingId(null)
    const first = categories[0]
    setForm({
      ...emptyForm,
      categoryId: first?.id || '',
    })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      price: String(item.price),
      categoryId: item.categoryId || categories[0]?.id || '',
      imageUrl: item.imageUrl || '',
      image: item.imageUrl ? item.imageUrl : placeholderImg,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  async function saveItem(e) {
    e.preventDefault()
    const priceNum = Number.parseInt(String(form.price).replace(/\D/g, ''), 10)
    const price = Number.isFinite(priceNum) ? priceNum : 0
    const cat = categories.find((c) => c.id === form.categoryId)
    const body = {
      name: form.name.trim() || 'Món mới',
      price,
      categoryId: form.categoryId || cat?.id,
      categoryName: cat?.name,
      imageUrl: form.imageUrl || '',
      isActive: true,
    }
    try {
      if (editingId) {
        await apiFetch(`/admin/menu-items/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      } else {
        await apiFetch('/admin/menu-items', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }
      load()
      closeModal()
    } catch (ex) {
      window.alert(ex.message)
    }
  }

  async function deleteItem(id) {
    if (!window.confirm('Xóa món này?')) return
    try {
      await apiFetch(`/admin/menu-items/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      window.alert(e.message)
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setForm((f) => ({ ...f, image: url, imageUrl: '' }))
  }

  const previewSrc =
    form.image && String(form.image).startsWith('data:') ? form.image : form.imageUrl || form.image || placeholderImg

  return (
    <div className="menu-mgmt">
      <header className="menu-mgmt__header">
        <div>
          <h1 className="menu-mgmt__title">Thực đơn</h1>
          <p className="menu-mgmt__subtitle">CRUD /api/admin/menu-items · danh mục /api/admin/categories</p>
        </div>
        <button type="button" className="menu-mgmt__add" onClick={openAdd}>
          Thêm món
        </button>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      <div className="menu-mgmt__grid">
        {items.map((it) => (
          <article key={it.id} className="menu-card">
            <div className="menu-card__image-wrap">
              <img className="menu-card__image" src={it.imageUrl || placeholderImg} alt="" />
            </div>
            <div className="menu-card__body">
              <h2 className="menu-card__name">{it.name}</h2>
              <p className="menu-card__price">{formatPrice(Number(it.price) || 0)}</p>
              <p className="menu-card__category">{it.categoryName || it.categoryId}</p>
              <div className="menu-card__actions">
                <button type="button" className="menu-card__btn menu-card__btn--secondary" onClick={() => openEdit(it)}>
                  Sửa
                </button>
                <button type="button" className="menu-card__btn menu-card__btn--danger" onClick={() => deleteItem(it.id)}>
                  Xóa
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {modalOpen ? (
        <div className="menu-modal" role="dialog" aria-modal="true" aria-labelledby="menu-modal-title">
          <div className="menu-modal__backdrop" onClick={closeModal} aria-hidden />
          <div className="menu-modal__panel">
            <h2 id="menu-modal-title" className="menu-modal__title">
              {editingId ? 'Sửa món' : 'Thêm món'}
            </h2>
            <form className="menu-modal__form" onSubmit={saveItem}>
              <label className="menu-modal__field">
                <span>Tên</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="menu-modal__field">
                <span>Giá (VND)</span>
                <input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  inputMode="numeric"
                  required
                />
              </label>
              <label className="menu-modal__field">
                <span>Danh mục</span>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="menu-modal__field">
                <span>URL ảnh (tuỳ chọn)</span>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="menu-modal__field">
                <span>Ảnh từ máy</span>
                <input type="file" accept="image/*" onChange={onFileChange} />
              </label>
              <div className="menu-modal__preview">
                <img src={previewSrc} alt="Preview" />
              </div>
              <div className="menu-modal__footer">
                <button type="button" className="menu-modal__cancel" onClick={closeModal}>
                  Huỷ
                </button>
                <button type="submit" className="menu-modal__submit">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
