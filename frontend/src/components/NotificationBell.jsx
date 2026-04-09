import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import './NotificationBell.css'

export default function NotificationBell() {
  const { pathname } = useLocation()
  const kitchenPath = pathname.startsWith('/admin') ? '/admin/kitchen' : '/staff/kitchen'
  const [data, setData] = useState({ items: [], unreadCount: 0 })
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  function load() {
    apiFetch('/admin/notifications')
      .then(setData)
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const t = window.setInterval(load, 20000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  async function onReadOne(id) {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({}) })
      load()
    } catch {
      /* ignore */
    }
  }

  async function onReadAll() {
    try {
      await apiFetch('/admin/notifications/read-all', { method: 'POST', body: JSON.stringify({}) })
      load()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="notifyBell" ref={rootRef}>
      <button
        type="button"
        className="notifyBell__btn"
        aria-expanded={open}
        aria-label="Thông báo"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span className="notifyBell__icon" aria-hidden />
        {data.unreadCount > 0 ? (
          <span className="notifyBell__badge">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <div
          className="notifyBell__panel"
          role="dialog"
          aria-label="Danh sách thông báo"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="notifyBell__head">
            <strong>Thông báo</strong>
            <div className="notifyBell__headActions">
              <Link to={kitchenPath} className="notifyBell__link" onClick={() => setOpen(false)}>
                Bếp / đơn
              </Link>
              {data.unreadCount > 0 ? (
                <button type="button" className="notifyBell__readAll" onClick={onReadAll}>
                  Đọc hết
                </button>
              ) : null}
            </div>
          </div>
          <ul className="notifyBell__list">
            {data.items.length === 0 ? (
              <li className="notifyBell__empty">Chưa có thông báo.</li>
            ) : (
              data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notifyBell__item${n.is_read ? ' notifyBell__item--read' : ''}`}
                    onClick={() => onReadOne(n.id)}
                  >
                    <span className="notifyBell__msg">{n.message}</span>
                    <span className="notifyBell__time">
                      {n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : ''}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
