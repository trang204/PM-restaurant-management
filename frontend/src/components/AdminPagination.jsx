import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react'
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
  showVisibleRange = false,
  className = '',
}) {
  const [pageSizeOpen, setPageSizeOpen] = useState(false)
  const pageSizeRef = useRef(null)

  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || 10)
  const safeTotal = Math.max(0, Number(total) || 0)
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize))
  const visibleFrom = safeTotal > 0 ? (safePage - 1) * safePageSize + 1 : 0
  const visibleTo = safeTotal > 0 ? Math.min(safeTotal, (safePage - 1) * safePageSize + safePageSize) : 0
  const pageItems = buildPageItems(safePage, totalPages)

  useEffect(() => {
    if (!pageSizeOpen) return
    const onDocMouseDown = (e) => {
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) {
        setPageSizeOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setPageSizeOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pageSizeOpen])

  return (
    <div className={`admin-pagination ${className}`.trim()}>
      <div className="admin-pagination__bar">
        <div className="admin-pagination__actions">
          <button
            type="button"
            className="admin-pagination__nav"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
            aria-label="Trang đầu"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            className="admin-pagination__nav"
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {pageItems.map((item, index) => {
            const prev = pageItems[index - 1]
            const showGap = index > 0 && item - prev > 1
            return (
              <span key={item} className="admin-pagination__group">
                {showGap ? <span className="admin-pagination__gap" aria-hidden>…</span> : null}
                <button
                  type="button"
                  className={
                    safePage === item
                      ? 'admin-pagination__page admin-pagination__page--active'
                      : 'admin-pagination__page'
                  }
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              </span>
            )
          })}

          <button
            type="button"
            className="admin-pagination__nav"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="admin-pagination__nav"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Trang cuối"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        <span className="admin-pagination__total">
          <span className="admin-pagination__totalLabel">Tổng </span>
          <strong className="admin-pagination__totalValue">{safeTotal}</strong>
        </span>

        {showPageSize ? (
          <>
            <span className="admin-pagination__vsep" aria-hidden="true" />
            <div className="admin-pagination__pageSize" ref={pageSizeRef}>
              <button
                type="button"
                className="admin-pagination__pageSizeBtn"
                aria-haspopup="listbox"
                aria-expanded={pageSizeOpen}
                aria-label="Số dòng mỗi trang"
                onClick={() => setPageSizeOpen((o) => !o)}
              >
                <span className="admin-pagination__pageSizeInner">
                  <strong className="admin-pagination__pageSizeNum">{safePageSize}</strong>
                  <span className="admin-pagination__pageSizeSuffix"> dòng mỗi trang</span>
                </span>
                <ChevronDown size={14} className="admin-pagination__pageSizeChevron" aria-hidden />
              </button>
              {pageSizeOpen ? (
                <ul className="admin-pagination__pageSizeMenu" role="listbox">
                  {pageSizeOptions.map((option) => (
                    <li key={option} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={option === safePageSize}
                        className={
                          option === safePageSize
                            ? 'admin-pagination__pageSizeOpt admin-pagination__pageSizeOpt--current'
                            : 'admin-pagination__pageSizeOpt'
                        }
                        onClick={() => {
                          onPageSizeChange(option)
                          setPageSizeOpen(false)
                        }}
                      >
                        <strong>{option}</strong>
                        <span> dòng mỗi trang</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {showVisibleRange ? (
        <p className="admin-pagination__range">
          Hiển thị {visibleFrom}-{visibleTo}
        </p>
      ) : null}
    </div>
  )
}
