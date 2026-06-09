import { useEffect, useMemo, useState } from 'react'
import { apiFetch, mediaUrl, uploadFoodImage } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import AdminPagination from '../../components/AdminPagination'
import { requiredMessage } from '../../lib/validation'
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
  ingredients: [],
}

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

export default function MenuManagement() {
  const { toast, confirm } = useNotifications()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [availableIngredients, setAvailableIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [imageFile, setImageFile] = useState(null)
  /** 'all' | string category id */
  const [filterCat, setFilterCat] = useState('all')
  /** @type {'all' | 'in_stock' | 'out_of_stock'} */
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  /** id món đang gọi API bật/tắt trạng thái */
  const [stockTogglingId, setStockTogglingId] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)

  function load() {
    setLoading(true)
    // force fresh data (avoid cached 304 responses)
    Promise.all([
      apiFetch('/admin/menu-items', { cache: 'no-store' }),
      apiFetch('/admin/categories', { cache: 'no-store' }),
      apiFetch('/admin/ingredients', { cache: 'no-store' })
    ])
      .then(([mi, cat, ing]) => {
        setItems(Array.isArray(mi) ? mi : [])
        setCategories(Array.isArray(cat) ? cat : [])
        setAvailableIngredients(Array.isArray(ing) ? ing : [])
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
    // When adding new item, leave category empty so the placeholder is shown
    setForm({
      ...emptyForm,
      categoryId: '',
    })
    setFormErrors({})
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
      ingredients: Array.isArray(item.ingredients) ? [...item.ingredients] : [],
    })
    setFormErrors({})
    setDetailItem(null)
    setModalOpen(true)
  }

  function openDetail(item) {
    setDetailItem(item)
    setModalOpen(false)
  }

  function normalizeInputUrl(raw) {
    if (!raw) return ''
    const s = String(raw).trim()
    if (!s) return ''
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s
    if (s.startsWith('//')) return `https:${s}`
    if (s.startsWith('www.')) return `https://${s}`
    // fallback: if looks like domain path (contains a dot and no spaces), assume https
    if (/[.]./.test(s) && !s.includes(' ')) return `https://${s}`
    return s
  }

  function closeModal() {
    setModalOpen(false)
    setImageFile(null)
    setFormErrors({})
  }

  function closeDetail() {
    setDetailItem(null)
  }

  async function saveCategory(e) {
    e.preventDefault()
    const name = String(categoryName || '').trim()
    if (!name) {
      toast('Vui lòng nhập tên danh mục.', { variant: 'error' })
      return
    }
    setCategorySaving(true)
    try {
      const created = await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      toast('Thêm danh mục thành công', { variant: 'success' })
      setCategoryName('')
      await load()
      if (created?.id != null) {
        setFilterCat(String(created.id))
      }
    } catch (err2) {
      toast(err2.message, { variant: 'error' })
    } finally {
      setCategorySaving(false)
    }
  }

  async function deleteCategory(id, name) {
    const ok = await confirm({
      title: 'Xóa danh mục',
      message: `Xóa danh mục "${name}"? Các món thuộc danh mục này sẽ chuyển sang Chưa phân loại.`,
      danger: true,
      fields: [{ label: 'Tên danh mục', value: name }],
      warningText: 'Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
    })
    if (!ok) return
    try {
      await apiFetch(`/admin/categories/${id}`, { method: 'DELETE' })
      toast('Xóa danh mục thành công', { variant: 'success' })
      if (String(filterCat) === String(id)) setFilterCat('all')
      await load()
    } catch (err2) {
      toast(err2.message, { variant: 'error' })
    }
  }

  async function saveItem(e) {
    e.preventDefault()
    function parsePriceInput(raw) {
      const s0 = String(raw ?? '').trim()
      if (s0 === '') return NaN
      // remove spaces
      let s = s0.replace(/\s/g, '')
      // keep only digits and separators (allows input like "50.000 đ")
      s = s.replace(/[^\d.,]/g, '')
      if (!s) return NaN
      const hasDot = s.indexOf('.') >= 0
      const hasComma = s.indexOf(',') >= 0
      if (hasDot && hasComma) {
        // e.g. 1.234,56 -> 1234.56
        s = s.replace(/\./g, '').replace(',', '.')
      } else if (hasComma) {
        // e.g. 1234,56 -> 1234.56
        s = s.replace(/\./g, '').replace(',', '.')
      } else if (hasDot) {
        const dots = (s.match(/\./g) || []).length
        if (dots === 1) {
          const after = s.split('.').pop() || ''
          if (after.length !== 2) {
            // treat dot as thousand separator (e.g. "10.000")
            s = s.replace(/\./g, '')
          }
          // else keep decimal dot (e.g. "10000.00")
        } else {
          // multiple dots: remove as thousand separators
          s = s.replace(/\./g, '')
        }
      }
      const n = Number(s)
      return Number.isFinite(n) ? n : NaN
    }

    const priceNum = parsePriceInput(form.price)
    const price = Number.isFinite(priceNum) ? priceNum : 0
    const catId = Number(form.categoryId)
    const cleanName = String(form.name || '').trim()
    const cleanDescription = String(form.description || '').trim()
    const nextErrors = {}
    if (!Number.isFinite(catId) || catId <= 0) {
      nextErrors.categoryId = requiredMessage('Danh mục')
    }
    if (!cleanName) {
      nextErrors.name = requiredMessage('Tên món')
    }
    if (String(form.price || '').trim() === '') {
      nextErrors.price = requiredMessage('Giá')
    } else if (!Number.isFinite(price) || price <= 0) {
      nextErrors.price = 'Giá món phải lớn hơn 0.'
    }
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast('Vui lòng kiểm tra lại các trường bắt buộc.', { variant: 'error' })
      return
    }
    try {
      const rawImageUrl = form.imageUrl?.trim() ? form.imageUrl.trim() : null
      const imageUrl = rawImageUrl ? normalizeInputUrl(rawImageUrl) : null

      const validIngredients = (form.ingredients || [])
        .filter(ing => ing.ingredient_id !== '' && ing.ingredient_id != null)
        .map(ing => ({
          ingredient_id: Number(ing.ingredient_id),
          quantity_needed: Number(ing.quantity_needed) || 1,
        }))

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
            ingredients: validIngredients,
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
            image_url: imageUrl,
            description: cleanDescription || null,
            status: form.status,
            ingredients: validIngredients,
          }),
        })
        if (imageFile && created?.id != null) {
          await uploadFoodImage(Number(created.id), imageFile)
        }
      }
      load()
      closeModal()
      toast(editingId ? 'Cập nhật món thành công' : 'Thêm món thành công', { variant: 'success' })
    } catch (ex) {
      toast(ex.message, { variant: 'error' })
    }
  }

  async function deleteItem(id, name) {
    const okDel = await confirm({
      title: 'Xóa món',
      message: `Bạn có chắc muốn xóa món này?`,
      danger: true,
      fields: [
        { label: 'Tên', value: String(name || '') },
        { label: 'ID', value: String(id) },
      ],
      warningText: 'Hành động này không thể hoàn tác. Món sẽ bị xóa khỏi danh sách và mọi liên kết tham chiếu sẽ mất.',
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
    })
    if (!okDel) return
    try {
      const res = await apiFetch(`/admin/menu-items/${id}`, { method: 'DELETE' })
      // On successful delete, remove item from local state and show success,
      // then refresh list from server to keep UI consistent.
      setItems((prev) => prev.filter((x) => String(x.id) !== String(id)))
      toast('Xóa món thành công', { variant: 'success' })
      // refresh authoritative data
      load()
    } catch (e) {
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('ràng buộc') || msg.toLowerCase().includes('foreign key')) {
        toast('Không thể xóa món do có ràng buộc (ví dụ: đơn/phiên gọi món). Hãy xóa các mục tham chiếu trước.', { variant: 'error' })
      } else {
        toast(msg, { variant: 'error' })
      }
    }
  }

  async function toggleStock(item) {
    const id = item?.id
    if (id == null) return
    setStockTogglingId(id)
    try {
      const data = await apiFetch(`/admin/menu-items/${id}/toggle-active`, { method: 'POST' })
      const nextStatus = data?.status != null ? String(data.status) : null
      setItems((prev) =>
        prev.map((x) =>
          String(x.id) === String(id) ? { ...x, status: nextStatus ?? x.status } : x,
        ),
      )
      setDetailItem((d) =>
        d != null && String(d.id) === String(id) ? { ...d, status: nextStatus ?? d.status } : d,
      )
      toast('Đã cập nhật trạng thái món.', { variant: 'success' })
    } catch (e) {
      toast(e.message, { variant: 'error' })
    } finally {
      setStockTogglingId(null)
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
    form.image && String(form.image).startsWith('data:')
      ? form.image
      : form.imageUrl
      ? mediaUrl(normalizeInputUrl(form.imageUrl))
      : form.image || placeholderImg

  const sections = useMemo(() => {
    const byKey = new Map()
    const searchNeedle = search.trim().toLowerCase()
    for (const it of items) {
      const st = String(it.status || 'AVAILABLE').toUpperCase()
      const out = st === 'UNAVAILABLE'
      if (filterStatus === 'in_stock' && out ) continue
      if (filterStatus === 'out_of_stock' && !out) continue
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
  }, [items, filterCat, search, filterStatus])

  useEffect(() => {
    setPage(1)
  }, [filterCat, search, filterStatus])

  const flatItems = useMemo(
    () => sections.flatMap((sec) => sec.items.map((item) => ({ ...item, __sectionKey: String(sec.category_id ?? 'none') }))),
    [sections],
  )
  const visibleCount = flatItems.length
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return flatItems.slice(start, start + pageSize)
  }, [flatItems, page, pageSize])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(flatItems.length / pageSize))
    setPage((current) => Math.min(current, totalPages))
  }, [flatItems.length, pageSize])

  function ingredientText(item) {
    if (Array.isArray(item.ingredients) && item.ingredients.length > 0) {
      return `Nguyên liệu: ${item.ingredients.length} loại`
    }
    return 'Nguyên liệu: Chưa liên kết'
  }

  return (
    <div className="menu-mgmt">
      <header className="menu-mgmt__header">
        <div>
          <h1 className="menu-mgmt__title">Thực đơn</h1>
        </div>
        <button type="button" className="menu-mgmt__add" onClick={openAdd}>
          Thêm món
        </button>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}

      {!loading && !err && (items.length > 0 || categories.length > 0) ? (
        <section className="menu-mgmt__categoryManager" aria-label="Quản lý danh mục">
          <div className="menu-mgmt__categoryManagerInner">
            <div className="menu-mgmt__categoryLeft">
              <h2 className="menu-mgmt__categoryTitle">Danh mục</h2>
              <p className="menu-mgmt__categorySub">
                Món không gán danh mục thuộc <strong>Chưa phân loại</strong>. Bấm vào danh mục để lọc món.
              </p>
            </div>

            <div className="menu-mgmt__categoryRight">
              <div className="menu-mgmt__categoryList">
                <span
                  role="button"
                  tabIndex={0}
                  className={`menu-mgmt__categoryChip${filterCat === 'all' ? ' menu-mgmt__categoryChip--on' : ''}`}
                  onClick={() => setFilterCat('all')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setFilterCat('all')
                    }
                  }}
                >
                  Tất cả ({items.length})
                </span>
                {categories.length > 0 ? (
                  categories.map((c) => {
                    const count = items.filter((i) => Number(i.category_id) === Number(c.id)).length
                    return (
                      <span
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        className={`menu-mgmt__categoryChip${filterCat === String(c.id) ? ' menu-mgmt__categoryChip--on' : ''}`}
                        onClick={() => setFilterCat(String(c.id))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setFilterCat(String(c.id))
                          }
                        }}
                      >
                        {c.name}
                        {count > 0 ? ` (${count})` : ''}
                        <button
                          type="button"
                          className="menu-mgmt__categoryChipDel"
                          aria-label={`Xóa danh mục ${c.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCategory(c.id, c.name)
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )
                  })
                ) : (
                  <span className="menu-mgmt__categoryEmpty">Chưa có danh mục nào</span>
                )}
              </div>

              <form className="menu-mgmt__categoryForm" onSubmit={saveCategory}>
                <input
                  className="menu-mgmt__categoryInput"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Tên danh mục mới..."
                  autoComplete="off"
                  disabled={categorySaving}
                />
                <button
                  type="submit"
                  className="menu-mgmt__add"
                  disabled={categorySaving || !String(categoryName || '').trim()}
                >
                  {categorySaving ? 'Đang lưu…' : '+ Thêm danh mục'}
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && !err ? (
        <>
          <div className="menu-mgmt__toolbar">
            <label htmlFor="menu-search" className="sr-only">Tìm theo tên món</label>
            <input
              id="menu-search"
              className="menu-mgmt__search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên món"
              autoComplete="off"
              aria-label="Tìm theo tên món"
            />
            <div className="menu-mgmt__filters" aria-label="Lọc theo trạng thái">
              <button
                type="button"
                className={`menu-mgmt__filterBtn${filterStatus === 'all' ? ' menu-mgmt__filterBtn--active' : ''}`}
                onClick={() => setFilterStatus('all')}
                aria-pressed={filterStatus === 'all'}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`menu-mgmt__filterBtn${filterStatus === 'in_stock' ? ' menu-mgmt__filterBtn--active' : ''}`}
                onClick={() => setFilterStatus('in_stock')}
                aria-pressed={filterStatus === 'in_stock'}
              >
                Còn món
              </button>
              <button
                type="button"
                className={`menu-mgmt__filterBtn${filterStatus === 'out_of_stock' ? ' menu-mgmt__filterBtn--active' : ''}`}
                onClick={() => setFilterStatus('out_of_stock')}
                aria-pressed={filterStatus === 'out_of_stock'}
              >
                Hết món
              </button>
            </div>
          </div>
          {/* <p className="menu-mgmt__resultCount">Hiển thị {visibleCount} món</p> */}
        </>
      ) : null}

      {!loading && !err && sections.length === 0 ? (
        <p className="menu-mgmt__empty">Không tìm thấy món nào phù hợp. Thử đổi danh mục, trạng thái hoặc từ khóa.</p>
      ) : null}

      {!loading && !err && pagedItems.length > 0 ? (
        <section className="menu-mgmt__section" aria-labelledby="menu-all-results">
          <h2 id="menu-all-results" className="menu-mgmt__sectionTitle">
            Danh sách món
            <span className="menu-mgmt__sectionCount">{visibleCount} món</span>
          </h2>
          <div className="menu-mgmt__grid">
            {pagedItems.map((it) => (
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
                  <div
                    className="menu-card__stockRow"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <span className="menu-card__stockTitle">Trạng thái</span>
                    <div className="menu-card__stockActions">
                      <span
                        className="menu-card__status menu-card__status--row"
                        data-status={String(it.status || '').toUpperCase()}
                      >
                        {String(it.status || '').toUpperCase() === 'AVAILABLE' ? 'Còn món' : 'Hết món'}
                      </span>
                      <button
                        type="button"
                        className={`menu-card__toggle${
                          String(it.status || '').toUpperCase() !== 'UNAVAILABLE'
                            ? ' menu-card__toggle--on'
                            : ''
                        }`}
                        disabled={stockTogglingId === it.id}
                        aria-busy={stockTogglingId === it.id}
                        aria-label={
                          String(it.status || '').toUpperCase() !== 'UNAVAILABLE'
                            ? 'Đang còn món — bấm để chuyển sang hết món'
                            : 'Đang hết món — bấm để còn món'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          void toggleStock(it)
                        }}
                      >
                        <span className="menu-card__toggleTrack">
                          <span className="menu-card__toggleKnob" aria-hidden />
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="menu-card__actions">
                    <button
                      type="button"
                      className="menu-card__btn menu-card__btn--secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(it)
                      }}
                    >
                      Chi tiết
                    </button>
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
                        deleteItem(it.id, it.name)
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
      ) : null}

      {!loading && !err && visibleCount > 0 ? (
        <AdminPagination
          className="menu-mgmt__pagination"
          page={page}
          pageSize={pageSize}
          total={visibleCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}

      {modalOpen ? (
        <div className="menu-modal" role="dialog" aria-modal="true" aria-labelledby="menu-modal-title">
          <div className="menu-modal__backdrop" onClick={closeModal} aria-hidden />
          <div className="menu-modal__panel">
            <h2 id="menu-modal-title" className="menu-modal__title">
              {editingId ? 'Sửa món' : 'Thêm món'}
            </h2>
            <form className="menu-modal__form" onSubmit={saveItem} noValidate>
              <label className="menu-modal__field">
                <span>Tên <span className="required-asterisk">*</span></span>
                <input
                  className={formErrors.name ? 'input-error' : ''}
                  value={form.name}
                  onChange={(e) => {
                    setFormErrors((prev) => ({ ...prev, name: '' }))
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }}
                  placeholder="Nhập tên"
                  required
                  autoComplete="off"
                />
                {formErrors.name ? <small className="menu-modal__error">{formErrors.name}</small> : null}
              </label>
              <label className="menu-modal__field">
                <span>Giá (VND) <span className="required-asterisk">*</span></span>
                <input
                  className={formErrors.price ? 'input-error' : ''}
                  value={form.price}
                  onChange={(e) => {
                    setFormErrors((prev) => ({ ...prev, price: '' }))
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }}
                  placeholder="Nhập giá"
                  inputMode="numeric"
                  required
                />
                {formErrors.price ? <small className="menu-modal__error">{formErrors.price}</small> : null}
              </label>
              <label className="menu-modal__field">
                <span>Danh mục <span className="required-asterisk">*</span></span>
                <select
                  className={formErrors.categoryId ? 'input-error' : ''}
                  value={form.categoryId}
                  onChange={(e) => {
                    setFormErrors((prev) => ({ ...prev, categoryId: '' }))
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }}
                  required
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {formErrors.categoryId ? <small className="menu-modal__error">{formErrors.categoryId}</small> : null}
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
                  <option value="AVAILABLE">Còn món</option>
                  <option value="UNAVAILABLE">Hết món</option>
                </select>
              </label>
              <div className="menu-modal__field menu-modal__field--ingredients">
                <span>Nguyên liệu liên kết</span>
                <div className="menu-modal__ingredients">
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} className="menu-modal__ingredient-row">
                      <select
                        value={ing.ingredient_id}
                        onChange={(e) => {
                          const newIngs = [...form.ingredients];
                          newIngs[idx].ingredient_id = e.target.value;
                          setForm(f => ({ ...f, ingredients: newIngs }));
                        }}
                      >
                        <option value="">— Chọn nguyên liệu —</option>
                        {availableIngredients.map(ai => (
                          <option key={ai.id} value={String(ai.id)}>{ai.name} ({ai.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Số lượng"
                        value={ing.quantity_needed}
                        onChange={(e) => {
                          const newIngs = [...form.ingredients];
                          newIngs[idx].quantity_needed = e.target.value;
                          setForm(f => ({ ...f, ingredients: newIngs }));
                        }}
                      />
                      <button
                        type="button"
                        className="menu-modal__ingredient-del"
                        onClick={() => {
                          const newIngs = [...form.ingredients];
                          newIngs.splice(idx, 1);
                          setForm(f => ({ ...f, ingredients: newIngs }));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="menu-modal__ingredient-add"
                    onClick={() => {
                      setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredient_id: '', quantity_needed: 1 }] }));
                    }}
                  >
                    + Thêm nguyên liệu
                  </button>
                </div>
              </div>
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
                  <div className="menu-detail__statusBlock">
                    <span
                      className="menu-card__status menu-card__status--row"
                      data-status={String(detailItem.status || '').toUpperCase()}
                    >
                      {String(detailItem.status || '').toUpperCase() === 'AVAILABLE' ? 'Còn món' : 'Hết món'}
                    </span>
                    <button
                      type="button"
                      className={`menu-card__toggle${
                        String(detailItem.status || '').toUpperCase() !== 'UNAVAILABLE'
                          ? ' menu-card__toggle--on'
                          : ''
                      }`}
                      disabled={stockTogglingId === detailItem.id}
                      aria-busy={stockTogglingId === detailItem.id}
                      aria-label={
                        String(detailItem.status || '').toUpperCase() !== 'UNAVAILABLE'
                          ? 'Đang còn món — bấm để chuyển sang hết món'
                          : 'Đang hết món — bấm để còn món'
                      }
                      onClick={() => void toggleStock(detailItem)}
                    >
                      <span className="menu-card__toggleTrack">
                        <span className="menu-card__toggleKnob" aria-hidden />
                      </span>
                    </button>
                  </div>
                </div>

                <div className="menu-detail__grid">
                  <div className="menu-detail__item">
                    <span className="menu-detail__label">Danh mục</span>
                    <strong>{detailItem.category_name || '—'}</strong>
                  </div>
                  <div className="menu-detail__item menu-detail__item--ingredients">
                    <span className="menu-detail__label">Nguyên liệu</span>
                    {detailItem.ingredients && detailItem.ingredients.length > 0 ? (
                      <ul className="menu-detail__ingredients-list">
                        {detailItem.ingredients.map((ing, idx) => {
                          const ingName = ing.name || availableIngredients.find(ai => String(ai.id) === String(ing.ingredient_id))?.name || 'Nguyên liệu'
                          const ingUnit = ing.unit || availableIngredients.find(ai => String(ai.id) === String(ing.ingredient_id))?.unit || ''
                          return (
                            <li key={idx} className="menu-detail__ingredient-bullet">
                              <span className="menu-detail__ing-name">{ingName}</span>
                              <span className="menu-detail__ing-qty">
                                {Number(ing.quantity_needed).toLocaleString('vi-VN')} {ingUnit}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <strong>Chưa liên kết</strong>
                    )}
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
