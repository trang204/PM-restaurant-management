import './AdminPagination.css'

function buildPageItems(page, totalPages) {
  if (totalPages <= 1) return [1]
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  if (page <= 3) {
    pages.add(2)
    pages.add(3)
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
  }
  return Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b)
}

export default function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  showPageSize = true,
  className = '',
}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || 10)
  const safeTotal = Math.max(0, Number(total) || 0)
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize))
  const visibleFrom = safeTotal > 0 ? (safePage - 1) * safePageSize + 1 : 0
  const visibleTo = safeTotal > 0 ? Math.min(safeTotal, (safePage - 1) * safePageSize + safePageSize) : 0
  const pageItems = buildPageItems(safePage, totalPages)

  return (
    <div className={`admin-pagination ${className}`.trim()}>
      <div className="admin-pagination__main">
        <div className="admin-pagination__actions">
          <button type="button" className="admin-pagination__btn" disabled={safePage <= 1} onClick={() => onPageChange(1)} aria-label="Trang đầu">
            «
          </button>
          <button type="button" className="admin-pagination__btn" disabled={safePage <= 1} onClick={() => onPageChange(Math.max(1, safePage - 1))} aria-label="Trang trước">
            ‹
          </button>

          {pageItems.map((item, index) => {
            const prev = pageItems[index - 1]
            const showGap = index > 0 && item - prev > 1
            return (
              <span key={item} className="admin-pagination__group">
                {showGap ? <span className="admin-pagination__gap">…</span> : null}
                <button
                  type="button"
                  className={`admin-pagination__btn${safePage === item ? ' admin-pagination__btn--active' : ''}`}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              </span>
            )
          })}

          <button type="button" className="admin-pagination__btn" disabled={safePage >= totalPages} onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} aria-label="Trang sau">
            ›
          </button>
          <button type="button" className="admin-pagination__btn" disabled={safePage >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Trang cuối">
            »
          </button>
        </div>

        <div className="admin-pagination__meta">
          <span className="admin-pagination__text">Tổng {safeTotal}</span>
          {showPageSize ? (
            <label className="admin-pagination__pageSize">
              <select value={safePageSize} onChange={(e) => onPageSizeChange(Number(e.target.value) || safePageSize)}>
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} dòng mỗi trang
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <p className="admin-pagination__text">Hiển thị {visibleFrom}-{visibleTo}</p>
    </div>
  )
}
