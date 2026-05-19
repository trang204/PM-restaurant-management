import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../../lib/api'
import { requiredMessage, validatePhone, validateEmail, normalizePhone } from '../../lib/validation'
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
  const [pendingAvatar, setPendingAvatar] = useState<{ file: File; previewUrl: string } | null>(null)
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
      const phoneRaw = form.phone.trim()
      if (!nextFullName) {
        setFieldErr({ fullName: requiredMessage('Họ tên') })
        setSaving(false)
        return
      }
      const phoneErr = validatePhone(phoneRaw)
      if (phoneErr) {
        setFieldErr({ phone: phoneErr })
        setSaving(false)
        return
      }
      const emailErr = validateEmail(form.email)
      if (emailErr) {
        setFieldErr({ email: emailErr })
        setSaving(false)
        return
      }
      let updatedMe = me

      if (pendingAvatar) {
        const fd = new FormData()
        fd.append('avatar', pendingAvatar.file)
        updatedMe = await apiFetch<any>('/users/me/avatar', { method: 'POST', body: fd })
      }

      updatedMe = await apiFetch<any>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: nextFullName,
          email: form.email.trim().toLowerCase(),
          phone: normalizePhone(phoneRaw) || null,
        }),
      })

      setMe(updatedMe)
      setForm({
        fullName: String(updatedMe?.fullName ?? ''),
        email: String(updatedMe?.email ?? ''),
        phone: String(updatedMe?.phone ?? ''),
      })

      if (pendingAvatar) {
        URL.revokeObjectURL(pendingAvatar.previewUrl)
        setPendingAvatar(null)
      }

      setOkMsg('Đã lưu thay đổi thông tin.')
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
    const previewUrl = URL.createObjectURL(file)
    setPendingAvatar({ file, previewUrl })
    setEditing(true)
    setError(null)
    setOkMsg(null)
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
                  {pendingAvatar ? (
                    <img
                      className="profileAvatar__img"
                      src={pendingAvatar.previewUrl}
                      alt="Xem trước ảnh mới"
                      width={120}
                      height={120}
                    />
                  ) : me.avatarUrl ? (
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
                    disabled={saving}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {pendingAvatar ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
                  </button>
                </div>
                {pendingAvatar && (
                  <p className="profileAvatar__hint profileAvatar__hint--pending">
                    Ảnh xem trước — nhấn <strong>Lưu thay đổi</strong> để cập nhật.
                  </p>
                )}
                {!pendingAvatar && (
                  <p className="profileAvatar__hint">JPEG, PNG, WebP hoặc GIF — tối đa 5MB.</p>
                )}
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
                      onBlur={() => {
                        const err = validateEmail(form.email)
                        if (err) setFieldErr((prev) => ({ ...(prev || {}), email: err }))
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
                      onBlur={() => {
                        const err = validatePhone(form.phone)
                        if (err) setFieldErr((prev) => ({ ...(prev || {}), phone: err }))
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
                        if (pendingAvatar) {
                          URL.revokeObjectURL(pendingAvatar.previewUrl)
                          setPendingAvatar(null)
                        }
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
