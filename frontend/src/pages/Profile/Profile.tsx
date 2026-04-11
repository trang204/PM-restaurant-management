import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl, setToken } from '../../lib/api'
import './Profile.css'

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}
  const navigate = useNavigate()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [me, setMe] = useState<{
    id: string
    fullName: string
    email: string
    phone?: string | null
    avatarUrl?: string | null
    role?: string | null
    createdAt?: string | null
  } | null>(null)
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('luxeat_token')
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    apiFetch<any>('/users/me')
      .then((d) => {
        setMe(d)
        setForm({
          fullName: String(d?.fullName ?? ''),
          phone: String(d?.phone ?? ''),
        })
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOkMsg(null)
    try {
      const d = await apiFetch<any>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
        }),
      })
      setMe(d)
      setOkMsg('Đã cập nhật thông tin.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    setToken(null)
    window.location.href = '/'
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh (JPEG, PNG, WebP hoặc GIF).')
      return
    }
    setAvatarUploading(true)
    setError(null)
    setOkMsg(null)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const d = await apiFetch<any>('/users/me/avatar', { method: 'POST', body: fd })
      setMe(d)
      window.dispatchEvent(new Event('luxeat:me-updated'))
      setOkMsg('Đã cập nhật ảnh đại diện.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function clearAvatar() {
    setAvatarUploading(true)
    setError(null)
    setOkMsg(null)
    try {
      const d = await apiFetch<any>('/users/me/avatar', { method: 'DELETE' })
      setMe(d)
      window.dispatchEvent(new Event('luxeat:me-updated'))
      setOkMsg('Đã xóa ảnh đại diện.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <main className="profilePage">
      <header className="profileHero">
        <div>
          <p className="profileHero__eyebrow">Tài khoản</p>
          <h1 className="profileHero__title">Thông tin cá nhân</h1>
          <p className="profileHero__subtitle">
            Cập nhật ảnh đại diện, họ tên và số điện thoại để đặt bàn nhanh hơn.
          </p>
        </div>
        <div className="profileHero__actions">
          <Link to="/reservations" className="profileBtn profileBtn--ghost">
            Lịch sử đặt bàn
          </Link>
          <button type="button" className="profileBtn profileBtn--danger" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <section className="profileWrap">
        {loading ? <p>Đang tải...</p> : null}
        {error ? <p className="profileMsg profileMsg--err">{error}</p> : null}
        {okMsg ? <p className="profileMsg profileMsg--ok">{okMsg}</p> : null}

        {me ? (
          <div className="profileGrid">
            <form className="profileCard" onSubmit={save}>
              <h2 className="profileCard__title">Thông tin</h2>
              <div className="profileAvatar">
                <div className="profileAvatar__preview">
                  {me.avatarUrl ? (
                    <img
                      className="profileAvatar__img"
                      src={mediaUrl(me.avatarUrl)}
                      alt=""
                      width={120}
                      height={120}
                    />
                  ) : (
                    <div className="profileAvatar__placeholder" aria-hidden>
                      {(me.fullName || me.email || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="profileAvatar__file"
                  onChange={onAvatarFile}
                  aria-label="Chọn ảnh đại diện"
                />
                <div className="profileAvatar__actions">
                  <button
                    type="button"
                    className="profileBtn profileBtn--ghost"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarUploading ? 'Đang tải…' : me.avatarUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                  </button>
                  {me.avatarUrl ? (
                    <button
                      type="button"
                      className="profileBtn profileBtn--danger"
                      disabled={avatarUploading}
                      onClick={clearAvatar}
                    >
                      Xóa ảnh
                    </button>
                  ) : null}
                </div>
                <p className="profileAvatar__hint">JPEG, PNG, WebP hoặc GIF — tối đa 5MB.</p>
              </div>
              <label className="profileField">
                <span>Họ tên</span>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                  placeholder="Nguyễn Văn A"
                />
              </label>
              <label className="profileField">
                <span>Số điện thoại</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="09xxxxxxxx"
                  inputMode="tel"
                />
              </label>
              <div className="profileActions">
                <button type="submit" className="profileBtn profileBtn--primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>

            <aside className="profileCard profileCard--aside">
              <h2 className="profileCard__title">Tài khoản</h2>
              <div className="profileInfo">
                <div className="profileInfo__row">
                  <span>Email</span>
                  <strong>{me.email}</strong>
                </div>
                <div className="profileInfo__row">
                  <span>Vai trò</span>
                  <strong>{ROLE_LABELS[me.role] || me.role || 'Khách hàng'}</strong>
                </div>
                <div className="profileInfo__row">
                  <span>Mã</span>
                  <strong>#{me.id}</strong>
                </div>
              </div>
              <p className="profileHint">
                Gợi ý: sau khi vào bàn, bạn có thể gọi món bằng QR (nếu nhà hàng bật).
              </p>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  )
}
