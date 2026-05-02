import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../../lib/api'
import { requiredMessage } from '../../lib/validation'
import './Profile.css'

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}

export default function Profile() {
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
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [fieldErr, setFieldErr] = useState<{ fullName?: string; email?: string; phone?: string } | null>(null)

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
          email: String(d?.email ?? ''),
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
    setFieldErr(null)
    try {
      const nextFullName = form.fullName.trim()
      const nextEmail = form.email.trim().toLowerCase()
      const nextPhoneRaw = form.phone.trim()
      const nextPhone = nextPhoneRaw ? nextPhoneRaw.replace(/[.\s-]/g, '') : ''
      if (!nextFullName) {
        setFieldErr({ fullName: requiredMessage('Họ tên') })
        setSaving(false)
        return
      }
      // MM: bắt buộc nhập và đúng format
      if (!nextPhone) {
        setFieldErr({ phone: requiredMessage('Số điện thoại') })
        setSaving(false)
        return
      }
      if (!/^(?:\+?84|0)\d{9,10}$/.test(nextPhone)) {
        setFieldErr({ phone: 'Số điện thoại không hợp lệ' })
        setSaving(false)
        return
      }
      if (!nextEmail) {
        setFieldErr({ email: requiredMessage('Email') })
        setSaving(false)
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        setFieldErr({ email: 'Email không hợp lệ' })
        setSaving(false)
        return
      }
      const d = await apiFetch<any>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: nextFullName,
          email: nextEmail,
          phone: form.phone.trim() || null,
        }),
      })
      setMe(d)
      setForm({
        fullName: String(d?.fullName ?? ''),
        email: String(d?.email ?? ''),
        phone: String(d?.phone ?? ''),
      })
      setOkMsg('Đã cập nhật thông tin.')
      setEditing(false)
      window.dispatchEvent(new Event('luxeat:me-updated'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
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

  return (
    <main className="profilePage">
      <header className="profileHero">
        <div>
          <p className="profileHero__eyebrow">Tài khoản</p>
          <h1 className="profileHero__title">Thông tin cá nhân</h1>
          <p className="profileHero__subtitle">
            Xem và cập nhật thông tin tài khoản của bạn.
          </p>
        </div>
      </header>

      <section className="profileWrap">
        {loading ? <p>Đang tải...</p> : null}
        {error ? <p className="profileMsg profileMsg--err">{error}</p> : null}
        {okMsg ? <p className="profileMsg profileMsg--ok">{okMsg}</p> : null}

        {me ? (
          <div className="profileGrid">
            <form className="profileCard" onSubmit={save} noValidate>
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
                    {avatarUploading ? 'Đang tải…' : 'Tải ảnh lên'}
                  </button>
                </div>
                <p className="profileAvatar__hint">JPEG, PNG, WebP hoặc GIF — tối đa 5MB.</p>
              </div>
              <div className="profileField">
                <span>Họ tên</span>
                {!editing ? (
                  <button
                    type="button"
                    className="profileValue profileValue--button"
                    onClick={() => {
                      setEditing(true)
                      setOkMsg(null)
                      setError(null)
                      setFieldErr(null)
                    }}
                    aria-label="Chỉnh sửa họ tên"
                  >
                    {me.fullName || '—'}
                  </button>
                ) : (
                  <>
                    <input
                      value={form.fullName}
                      onChange={(e) => {
                        setFieldErr((prev) => ({ ...(prev || {}), fullName: undefined }))
                        setForm((p) => ({ ...p, fullName: e.target.value }))
                      }}
                      required
                      placeholder="Nguyễn Văn A"
                    />
                    {fieldErr?.fullName ? <span className="profileField__error">{fieldErr.fullName}</span> : null}
                  </>
                )}
              </div>
              <div className="profileField">
                <span>Email</span>
                {!editing ? (
                  <button
                    type="button"
                    className="profileValue profileValue--button"
                    onClick={() => {
                      setEditing(true)
                      setOkMsg(null)
                      setError(null)
                      setFieldErr(null)
                    }}
                    aria-label="Chỉnh sửa email"
                  >
                    {me.email || '—'}
                  </button>
                ) : (
                  <>
                    <input
                      value={form.email}
                      onChange={(e) => {
                        setFieldErr((prev) => ({ ...(prev || {}), email: undefined }))
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }}
                      required
                      placeholder="email@domain.com"
                      inputMode="email"
                    />
                    {fieldErr?.email ? <span className="profileField__error">{fieldErr.email}</span> : null}
                  </>
                )}
              </div>
              <div className="profileField">
                <span>Số điện thoại</span>
                {!editing ? (
                  <button
                    type="button"
                    className="profileValue profileValue--button"
                    onClick={() => {
                      setEditing(true)
                      setOkMsg(null)
                      setError(null)
                      setFieldErr(null)
                    }}
                    aria-label="Chỉnh sửa số điện thoại"
                  >
                    {me.phone || '—'}
                  </button>
                ) : (
                  <>
                    <input
                      value={form.phone}
                      onChange={(e) => {
                        setFieldErr((prev) => ({ ...(prev || {}), phone: undefined }))
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }}
                      placeholder="09xxxxxxxx"
                      inputMode="tel"
                    />
                    {fieldErr?.phone ? <span className="profileField__error">{fieldErr.phone}</span> : null}
                  </>
                )}
              </div>
              <div className="profileActions">
                {!editing ? (
                  <button
                    type="button"
                    className="profileBtn profileBtn--primary"
                    onClick={() => {
                      setEditing(true)
                      setOkMsg(null)
                      setError(null)
                      setFieldErr(null)
                    }}
                  >
                    Chỉnh sửa
                  </button>
                ) : (
                  <>
                    <button type="submit" className="profileBtn profileBtn--primary" disabled={saving}>
                      {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </button>
                    <button
                      type="button"
                      className="profileBtn profileBtn--ghost"
                      disabled={saving}
                      onClick={() => {
                        setEditing(false)
                        setFieldErr(null)
                        setError(null)
                        setOkMsg(null)
                        setForm({
                          fullName: String(me.fullName ?? ''),
                          email: String(me.email ?? ''),
                          phone: String(me.phone ?? ''),
                        })
                      }}
                    >
                      Hủy
                    </button>
                  </>
                )}
              </div>
            </form>

            <aside className="profileCard profileCard--aside">
              <h2 className="profileCard__title">Tài khoản</h2>
              <div className="profileInfo">
                <div className="profileInfo__row">
                  <span>Vai trò</span>
                  <strong>{ROLE_LABELS[me?.role ?? ''] || me?.role || 'Khách hàng'}</strong>
                </div>
                <div className="profileInfo__row">
                  <span>User ID:</span>
                  <strong>#{me.id}</strong>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  )
}
