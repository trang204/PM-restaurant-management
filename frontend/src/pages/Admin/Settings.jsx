import { useEffect, useState } from 'react'
import './Settings.css'

const KEY = 'luxeat_settings_v1'

export default function Settings() {
  const [form, setForm] = useState({
    restaurantName: 'Luxeat Restaurant',
    phone: '028 1234 5678',
    email: 'hello@luxeat.vn',
    address: '123 Nguyễn Huệ, Q.1, TP.HCM',
    openTime: '10:00',
    closeTime: '22:30',
    totalTables: '42',
  })
  const [logoPreview, setLogoPreview] = useState(
    'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="16" fill="#e8e2d8"/><text x="60" y="68" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#7a756d">Logo</text></svg>`,
      ),
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.form) setForm((f) => ({ ...f, ...parsed.form }))
      if (parsed.logoPreview) setLogoPreview(parsed.logoPreview)
    } catch {
      /* ignore */
    }
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
  }

  function onSubmit(e) {
    e.preventDefault()
    try {
      localStorage.setItem(KEY, JSON.stringify({ form, logoPreview }))
    } catch {
      /* ignore */
    }
    window.alert('Đã lưu cục bộ (trình duyệt). Backend chưa có API settings.')
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Cài đặt</h1>
        <p className="settings-page__subtitle">Lưu local (localStorage). Có thể nối API sau.</p>
      </header>

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
            <input name="totalTables" value={form.totalTables} onChange={onChange} inputMode="numeric" required />
          </label>
          <div className="settings-logo settings-field--full">
            <span className="settings-logo__label">Logo</span>
            <div className="settings-logo__row">
              <label className="settings-logo__upload">
                <input type="file" accept="image/*" onChange={onLogoChange} />
                <span>Chọn file</span>
              </label>
              <div className="settings-logo__preview">
                <img src={logoPreview} alt="Logo preview" />
              </div>
            </div>
          </div>
        </div>
        <div className="settings-card__footer">
          <button type="submit" className="settings-save">
            Lưu
          </button>
        </div>
      </form>
    </div>
  )
}
