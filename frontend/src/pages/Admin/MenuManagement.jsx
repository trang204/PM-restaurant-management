import { useState } from 'react'
import './MenuManagement.css'

const placeholderImg =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8f5e9"/><stop offset="100%" stop-color="#c8e6c9"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><text x="200" y="132" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#52796f">Ảnh món</text></svg>`,
  )

const initialItems = [
  { id: '1', name: 'Beef tenderloin', price: 320000, category: 'Main', image: placeholderImg },
  { id: '2', name: 'Seafood risotto', price: 185000, category: 'Main', image: placeholderImg },
  { id: '3', name: 'Garden salad', price: 95000, category: 'Starter', image: placeholderImg },
  { id: '4', name: 'Tiramisu', price: 75000, category: 'Dessert', image: placeholderImg },
]

const emptyForm = { name: '', price: '', category: 'Main', image: placeholderImg }

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

export default function MenuManagement() {
  const [items, setItems] = useState(initialItems)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      image: item.image,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function saveItem(e) {
    e.preventDefault()
    const priceNum = Number.parseInt(String(form.price).replace(/\D/g, ''), 10)
    const price = Number.isFinite(priceNum) ? priceNum : 0
    if (editingId) {
      setItems((prev) =>
        prev.map((it) => (it.id === editingId ? { ...it, name: form.name.trim() || it.name, price, category: form.category, image: form.image } : it)),
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          name: form.name.trim() || 'Untitled',
          price,
          category: form.category,
          image: form.image,
        },
      ])
    }
    closeModal()
  }

  function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setForm((f) => ({ ...f, image: url }))
  }

  return (
    <div className="menu-mgmt">
      <header className="menu-mgmt__header">
        <div>
          <h1 className="menu-mgmt__title">Menu</h1>
          <p className="menu-mgmt__subtitle">Food catalog, pricing, and categories.</p>
        </div>
        <button type="button" className="menu-mgmt__add" onClick={openAdd}>
          Add food
        </button>
      </header>

      <div className="menu-mgmt__grid">
        {items.map((it) => (
          <article key={it.id} className="menu-card">
            <div className="menu-card__image-wrap">
              <img className="menu-card__image" src={it.image} alt="" />
            </div>
            <div className="menu-card__body">
              <h2 className="menu-card__name">{it.name}</h2>
              <p className="menu-card__price">{formatPrice(it.price)}</p>
              <p className="menu-card__category">{it.category}</p>
              <div className="menu-card__actions">
                <button type="button" className="menu-card__btn menu-card__btn--secondary" onClick={() => openEdit(it)}>
                  Edit
                </button>
                <button type="button" className="menu-card__btn menu-card__btn--danger" onClick={() => deleteItem(it.id)}>
                  Delete
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
              {editingId ? 'Edit food' : 'Add food'}
            </h2>
            <form className="menu-modal__form" onSubmit={saveItem}>
              <label className="menu-modal__field">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="menu-modal__field">
                <span>Price (VND)</span>
                <input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  inputMode="numeric"
                  required
                />
              </label>
              <label className="menu-modal__field">
                <span>Category</span>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="Starter">Starter</option>
                  <option value="Main">Main</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Drink">Drink</option>
                </select>
              </label>
              <label className="menu-modal__field">
                <span>Image</span>
                <input type="file" accept="image/*" onChange={onFileChange} />
              </label>
              <div className="menu-modal__preview">
                <img src={form.image} alt="Preview" />
              </div>
              <div className="menu-modal__footer">
                <button type="button" className="menu-modal__cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="menu-modal__submit">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
