import { useEffect, useMemo, useState } from 'react'
import { apiFetch, mediaUrl, uploadFoodImage } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import './MenuManagement.css'

const placeholderImg =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8f5e9"/><stop offset="100%" stop-color="#c8e6c9"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><text x="200" y="132" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#52796f">Ảnh món</text></svg>`,
  )

const emptyForm = {
  name: '',
  price: '',
  categoryId: '',
  imageUrl: '',
  image: placeholderImg,
  description: '',
  status: 'AVAILABLE',
}

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

export default function MenuManagement() {
  const { toast, confirm } = useNotifications()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  /** 'all' | string category id */
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')

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
    setImageFile(null)
    const first = categories[0]
    setForm({
      ...emptyForm,
      categoryId: first?.id != null ? String(first.id) : '',
    })
    setDetailItem(null)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingId(item.id)
    setImageFile(null)
    const img = item.image_url || ''
    setForm({
      name: item.name,
      price: String(item.price),
      categoryId:
        item.category_id != null && item.category_id !== ''
          ? String(item.category_id)
          : categories[0]?.id != null
            ? String(categories[0].id)
            : '',
      imageUrl: img,
      image: img ? mediaUrl(img) : placeholderImg,
      description: item.description || '',
      status: String(item.status || 'AVAILABLE').toUpperCase() === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE',
    })
    setDetailItem(null)
    setModalOpen(true)
  }

  function openDetail(item) {
    setDetailItem(item)
    setModalOpen(false)
  }

  function closeModal() {
    setModalOpen(false)
    setImageFile(null)
  }

  function closeDetail() {
    setDetailItem(null)
  }

  async function saveItem(e) {
    e.preventDefault()
    const priceNum = Number.parseInt(String(form.price).replace(/\D/g, ''), 10)
    const price = Number.isFinite(priceNum) ? priceNum : 0
    const catId = Number(form.categoryId)
    const cleanName = String(form.name || '').trim()
    const cleanDescription = String(form.description || '').trim()
    if (!Number.isFinite(catId) || catId <= 0) {
      toast('Chọn danh mục.', { variant: 'info' })
      return
    }
    if (!cleanName) {
      toast('Nhập tên món.', { variant: 'info' })
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast('Giá món phải lớn hơn 0.', { variant: 'info' })
      return
    }
    try {
      const imageUrl = form.imageUrl?.trim() ? form.imageUrl.trim() : null

      if (editingId) {
        await apiFetch(`/admin/menu-items/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: cleanName,
            price,
            category_id: catId,
            image_url: imageUrl,
            description: cleanDescription || null,
            status: form.status,
          }),
        })
        if (imageFile) {
          await uploadFoodImage(editingId, imageFile)
        }
      } else {
        const created = await apiFetch('/admin/menu-items', {
          method: 'POST',
          body: JSON.stringify({
            name: cleanName,
            price,
            category_id: catId,
            image_url: null,
            description: cleanDescription || null,
            status: form.status,
          }),
        })
        if (imageFile && created?.id != null) {
          await uploadFoodImage(Number(created.id), imageFile)
        }
      }
      load()
      closeModal()
    } catch (ex) {
      toast(ex.message, { variant: 'error' })
    }
  }

  async function deleteItem(id) {
    const okDel = await confirm({ title: 'Xóa món', message: 'Xóa món này?' })
    if (!okDel) return
    try {
      await apiFetch(`/admin/menu-items/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      toast(e.message, { variant: 'error' })
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF (tối đa 5MB).', { variant: 'error' })
      e.target.value = ''
      return
    }
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setForm((f) => ({ ...f, image: url, imageUrl: '' }))
  }

  const previewSrc =
    form.image && String(form.image).startsWith('data:') ? form.image : form.imageUrl ? mediaUrl(form.imageUrl) : form.image || placeholderImg

  const sections = useMemo(() => {
    const byKey = new Map()
    const searchNeedle = search.trim().toLowerCase()
    for (const it of items) {
      const name = String(it.name || '').toLowerCase()
      const categoryName = String(it.category_name || '').toLowerCase()
      if (searchNeedle && !name.includes(searchNeedle) && !categoryName.includes(searchNeedle)) continue
      const cid = it.category_id != null && it.category_id !== '' ? String(it.category_id) : '_none'
      const cname = it.category_name || 'Chưa phân loại'
      const key = `${cid}`
      if (!byKey.has(key)) {
        byKey.set(key, { category_id: it.category_id, category_name: cname, items: [] })
      }
      byKey.get(key).items.push(it)
    }
    const arr = Array.from(byKey.values())
    arr.sort((a, b) => String(a.category_name).localeCompare(String(b.category_name), 'vi'))
    for (const s of arr) {
      s.items.sort((x, y) => String(x.name || '').localeCompare(String(y.name || ''), 'vi'))
    }
    if (filterCat === 'all') return arr
    const n = Number(filterCat)
    if (!Number.isFinite(n)) return arr
    return arr.filter((s) => Number(s.category_id) === n)
  }, [items, filterCat, search])

  const visibleCount = sections.reduce((sum, sec) => sum + sec.items.length, 0)

  function ingredientText(item) {
    const count = Number(item?.ingredient_count)
    if (Number.isFinite(count) && count >= 0) {
      return `Nguyên liệu: ${count} loại`
    }
    return 'Nguyên liệu: Chưa liên kết'
  }

  return (
    <div className="menu-mgmt">
      <header className="menu-mgmt__header">
        <div>
          <h1 className="menu-mgmt__title">Thực đơn</h1>
          <p className="menu-mgmt__subtitle">Thêm/sửa món, quản lý hiển thị và danh mục.</p>
        </div>
        <button type="button" className="menu-mgmt__add" onClick={openAdd}>
          Thêm món
        </button>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      {!loading && !err ? (
        <div className="menu-mgmt__toolbar">
          <label className="menu-mgmt__search">
            <span className="sr-only">Tìm món</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm món..."
              autoComplete="off"
            />
          </label>
          <p className="menu-mgmt__resultCount">Hiển thị {visibleCount} món</p>
        </div>
      ) : null}

      {!loading && !err && (items.length > 0 || categories.length > 0) ? (
        <div className="menu-mgmt__filters" role="tablist" aria-label="Lọc theo danh mục">
          <button
            type="button"
            role="tab"
            aria-selected={filterCat === 'all'}
            className={`menu-mgmt__filter${filterCat === 'all' ? ' menu-mgmt__filter--on' : ''}`}
            onClick={() => setFilterCat('all')}
          >
            Tất cả ({items.length})
          </button>
          {categories.map((c) => {
            const count = items.filter((i) => Number(i.category_id) === Number(c.id)).length
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={filterCat === String(c.id)}
                className={`menu-mgmt__filter${filterCat === String(c.id) ? ' menu-mgmt__filter--on' : ''}`}
                onClick={() => setFilterCat(String(c.id))}
              >
                {c.name}
                {count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
      ) : null}

      {!loading && !err && sections.length === 0 ? (
        <p className="menu-mgmt__empty">Không tìm thấy món nào phù hợp.</p>
      ) : null}

      {!loading && !err
        ? sections.map((sec) => (
            <section key={String(sec.category_id ?? 'none')} className="menu-mgmt__section" aria-labelledby={`cat-${sec.category_id ?? 'none'}`}>
              <h2 id={`cat-${sec.category_id ?? 'none'}`} className="menu-mgmt__sectionTitle">
                {sec.category_name}
                <span className="menu-mgmt__sectionCount">{sec.items.length} món</span>
              </h2>
              <div className="menu-mgmt__grid">
                {sec.items.map((it) => (
                  <article
                    key={it.id}
                    className="menu-card menu-card--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(it)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openDetail(it)
                      }
                    }}
                  >
                    <div className="menu-card__image-wrap">
                      <img
                        className="menu-card__image"
                        src={it.image_url ? mediaUrl(it.image_url) : placeholderImg}
                        alt=""
                      />
                    </div>
                    <div className="menu-card__body">
                      <h3 className="menu-card__name">{it.name}</h3>
                      <p className="menu-card__price">{formatPrice(Number(it.price) || 0)}</p>
                      <p className="menu-card__category">{it.category_name || '—'}</p>
                      <p className="menu-card__meta">{ingredientText(it)}</p>
                      <p className="menu-card__status" data-status={String(it.status || '').toUpperCase()}>
                        {String(it.status || '').toUpperCase() === 'AVAILABLE' ? 'Đang bán' : 'Ngừng bán'}
                      </p>
                      <div className="menu-card__actions">
                        <button
                          type="button"
                          className="menu-card__btn menu-card__btn--secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(it)
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="menu-card__btn menu-card__btn--danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteItem(it.id)
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        : null}

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
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="menu-modal__field">
                <span>Mô tả</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn về món ăn"
                />
              </label>
              <label className="menu-modal__field">
                <span>Trạng thái</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="AVAILABLE">Đang bán</option>
                  <option value="UNAVAILABLE">Ngừng bán</option>
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

      {detailItem ? (
        <div className="menu-modal" role="dialog" aria-modal="true" aria-labelledby="menu-detail-title">
          <div className="menu-modal__backdrop" onClick={closeDetail} aria-hidden />
          <div className="menu-modal__panel menu-modal__panel--detail">
            <h2 id="menu-detail-title" className="menu-modal__title">
              Chi tiết món ăn
            </h2>
            <div className="menu-detail">
              <div className="menu-detail__imageWrap">
                <img
                  className="menu-detail__image"
                  src={detailItem.image_url ? mediaUrl(detailItem.image_url) : placeholderImg}
                  alt=""
                />
              </div>
              <div className="menu-detail__body">
                <div className="menu-detail__head">
                  <div>
                    <h3 className="menu-detail__name">{detailItem.name}</h3>
                    <p className="menu-detail__price">{formatPrice(Number(detailItem.price) || 0)}</p>
                  </div>
                  <span className="menu-card__status" data-status={String(detailItem.status || '').toUpperCase()}>
                    {String(detailItem.status || '').toUpperCase() === 'AVAILABLE' ? 'Đang bán' : 'Ngừng bán'}
                  </span>
                </div>

                <div className="menu-detail__grid">
                  <div className="menu-detail__item">
                    <span className="menu-detail__label">Danh mục</span>
                    <strong>{detailItem.category_name || '—'}</strong>
                  </div>
                  <div className="menu-detail__item">
                    <span className="menu-detail__label">Nguyên liệu</span>
                    <strong>{ingredientText(detailItem).replace('Nguyên liệu: ', '')}</strong>
                  </div>
                </div>

                <div className="menu-detail__desc">
                  <span className="menu-detail__label">Mô tả</span>
                  <p>{detailItem.description?.trim() || 'Chưa có mô tả cho món này.'}</p>
                </div>
              </div>
            </div>

            <div className="menu-modal__footer">
              <button type="button" className="menu-modal__cancel" onClick={closeDetail}>
                Đóng
              </button>
              <button
                type="button"
                className="menu-modal__submit"
                onClick={() => {
                  closeDetail()
                  openEdit(detailItem)
                }}
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
