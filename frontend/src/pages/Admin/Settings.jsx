import { useEffect, useState } from 'react'
import { apiFetch, getApiOrigin, mediaUrl } from '../../lib/api'
import './Settings.css'

function sliceTime(v) {
  if (v == null || v === '') return ''
  const s = String(v)
  return s.length >= 5 ? s.slice(0, 5) : s
}

export default function Settings() {
  const [form, setForm] = useState({
    restaurantName: '',
    phone: '',
    email: '',
    address: '',
    openTime: '08:00',
    closeTime: '22:00',
    totalTables: '',
  })
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [okMsg, setOkMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch('/settings')
      .then((d) => {
        if (!d) return
        setForm({
          restaurantName: String(d.restaurant_name ?? ''),
          phone: String(d.phone ?? ''),
          email: String(d.email ?? ''),
          address: String(d.address ?? ''),
          openTime: sliceTime(d.open_time) || '08:00',
          closeTime: sliceTime(d.close_time) || '22:00',
          totalTables: d.total_tables != null ? String(d.total_tables) : '',
        })
        const lu = d.logo_url != null ? String(d.logo_url) : ''
        setLogoUrl(lu ? mediaUrl(lu) : '')
      })
      .catch(() => setErr('Không tải được cài đặt (cần quyền admin/nhân viên).'))
      .finally(() => setLoading(false))
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setOkMsg(null)
    setSaving(true)
    try {
      await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          restaurant_name: form.restaurantName.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          open_time: form.openTime || null,
          close_time: form.closeTime || null,
          total_tables: form.totalTables ? Number(form.totalTables) : null,
        }),
      })
      setOkMsg('Đã lưu cài đặt.')
    } catch (e2) {
      setErr(e2?.message || String(e2))
    } finally {
      setSaving(false)
    }
  }

  async function onLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null)
    setOkMsg(null)
    try {
      const token = localStorage.getItem('luxeat_token')
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch(`${base.replace(/\/$/, '')}/settings/logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json().catch(() => null)
      if (!json?.success) throw new Error(json?.error?.message || 'Upload lỗi')
      const url = json.data?.logo_url
      if (url) setLogoUrl(mediaUrl(String(url)))
      setOkMsg('Đã cập nhật logo.')
    } catch (e2) {
      setErr(e2?.message || String(e2))
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Cài đặt nhà hàng</h1>
        <p className="settings-page__subtitle">
          Đồng bộ với API <code>{getApiOrigin()}/api/settings</code> · chỉ tài khoản Admin mới sửa được.
        </p>
      </header>

      {loading ? <p>Đang tải...</p> : null}
      {err ? <p className="settings-page__err">{err}</p> : null}
      {okMsg ? <p className="settings-page__ok">{okMsg}</p> : null}

      <form className="settings-card" onSubmit={onSubmit}>
        <div className="settings-card__grid">
          <label className="settings-field">
            <span>Tên nhà hàng</span>
            <input name="restaurantName" value={form.restaurantName} onChange={onChange} required />
          </label>
          <label className="settings-field">
            <span>Điện thoại</span>
            <input name="phone" value={form.phone} onChange={onChange} required />
          </label>
          <label className="settings-field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </label>
          <label className="settings-field settings-field--full">
            <span>Địa chỉ</span>
            <input name="address" value={form.address} onChange={onChange} required />
          </label>
          <label className="settings-field">
            <span>Mở cửa</span>
            <input name="openTime" type="time" value={form.openTime} onChange={onChange} required />
          </label>
          <label className="settings-field">
            <span>Đóng cửa</span>
            <input name="closeTime" type="time" value={form.closeTime} onChange={onChange} required />
          </label>
          <label className="settings-field">
            <span>Tổng số bàn (tham khảo)</span>
            <input name="totalTables" value={form.totalTables} onChange={onChange} inputMode="numeric" />
          </label>
          <div className="settings-logo settings-field--full">
            <span className="settings-logo__label">Logo (Admin)</span>
            <div className="settings-logo__row">
              <label className="settings-logo__upload">
                <input type="file" accept="image/*" onChange={onLogoChange} />
                <span>Tải logo lên server</span>
              </label>
              {logoUrl ? (
                <div className="settings-logo__preview">
                  <img src={logoUrl} alt="Logo" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="settings-card__footer">
          <button type="submit" className="settings-save" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </form>
    </div>
  )
}
