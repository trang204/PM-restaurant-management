import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../../lib/api'
import { requiredMessage, validatePhone, validateEmail, normalizePhone } from '../../lib/validation'
import { useNotifications } from '../../context/NotificationsContext'
import PasswordField from '../../components/PasswordField'
import './Profile.css'

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}

export default function Profile() {
  const navigate = useNavigate()
  const { toast } = useNotifications()
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
  const [pendingAvatar, setPendingAvatar] = useState<{ file: File; previewUrl: string } | null>(null)
  const [fieldErr, setFieldErr] = useState<{ fullName?: string; email?: string; phone?: string } | null>(null)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErr, setPwErr] = useState<{ current?: string; next?: string; confirm?: string } | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)

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
      .catch((e) => toast((e as Error).message, { variant: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  async function save(e?: React.FormEvent) {
    e?.preventDefault()
    setSaving(true)
    setFieldErr(null)
    if (!editing) {
      setEditing(true)
      setSaving(false)
      return
    }
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

      clearPendingAvatar()

      toast('Đã lưu thay đổi thông tin.', { variant: 'success' })
      setEditing(false)
      window.dispatchEvent(new Event('luxeat:me-updated'))
    } catch (e) {
      toast((e as Error).message, { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function clearPendingAvatar() {
    if (!pendingAvatar) return
    URL.revokeObjectURL(pendingAvatar.previewUrl)
    setPendingAvatar(null)
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Vui lòng chọn file ảnh (JPEG, PNG, WebP hoặc GIF).', { variant: 'error' })
      return
    }
    clearPendingAvatar()
    const previewUrl = URL.createObjectURL(file)
    setPendingAvatar({ file, previewUrl })
    setEditing(true)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwSaving(true)
    setPwErr(null)
    const current = pwForm.current.trim()
    const nextPw = pwForm.next
    const confirmPw = pwForm.confirm
    const nextErrors: { current?: string; next?: string; confirm?: string } = {}

    if (!current) nextErrors.current = requiredMessage('Mật khẩu hiện tại')
    if (!nextPw) nextErrors.next = requiredMessage('Mật khẩu mới')
    else if (nextPw.length < 6) nextErrors.next = 'Mật khẩu tối thiểu 6 ký tự'
    if (!confirmPw) nextErrors.confirm = requiredMessage('Xác nhận mật khẩu')
    else if (nextPw && confirmPw !== nextPw) nextErrors.confirm = 'Mật khẩu xác nhận không khớp.'

    if (Object.keys(nextErrors).length) {
      setPwErr(nextErrors)
      toast('Vui lòng kiểm tra lại mật khẩu.', { variant: 'error' })
      setPwSaving(false)
      return
    }

    try {
      await apiFetch('/users/me/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: current,
          newPassword: nextPw,
        }),
      })
      toast('Đổi mật khẩu thành công.', { variant: 'success' })
      setPwForm({ current: '', next: '', confirm: '' })
      setPwErr(null)
      setPwModalOpen(false)
    } catch (e) {
      toast((e as Error).message, { variant: 'error' })
    } finally {
      setPwSaving(false)
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

        {me ? (
          <div className="profileGrid">
            <div className="profileColumn">
              <form
                className="profileCard"
                onSubmit={(e) => {
                  e.preventDefault()
                }}
                noValidate
              >
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
                    disabled={!editing || saving}
                    aria-label="Chọn ảnh đại diện"
                  />
                  <div className="profileAvatar__actions">
                    <button
                      type="button"
                      className="profileBtn profileBtn--ghost"
                      disabled={!editing || saving}
                      onClick={() => {
                        if (editing) {
                          avatarInputRef.current?.click()
                        }
                      }}
                    >
                      {pendingAvatar ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
                    </button>
                    {pendingAvatar ? (
                      <button
                        type="button"
                        className="profileBtn profileBtn--danger"
                        disabled={!editing || saving}
                        onClick={clearPendingAvatar}
                      >
                        Xóa ảnh
                      </button>
                    ) : null}
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
                    <div className="profileValue">{me.fullName || '—'}</div>
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
                    <div className="profileValue">{me.email || '—'}</div>
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
                    <div className="profileValue">{me.phone || '—'}</div>
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
                    <>
                      <button
                        type="button"
                        className="profileBtn profileBtn--primary"
                        onClick={() => {
                          setEditing(true)
                          setFieldErr(null)
                        }}
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="profileBtn profileBtn--primary"
                        onClick={() => {
                          setPwErr(null)
                          setPwModalOpen(true)
                        }}
                      >
                        Đổi mật khẩu
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="profileBtn profileBtn--primary"
                        disabled={saving}
                        onClick={() => {
                          void save()
                        }}
                      >
                        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                      </button>
                      <button
                        type="button"
                        className="profileBtn profileBtn--ghost"
                        disabled={saving}
                        onClick={() => {
                          setEditing(false)
                          setFieldErr(null)
                          clearPendingAvatar()
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

            </div>

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

      {pwModalOpen ? (
        <div className="profileModal" role="dialog" aria-modal="true" aria-labelledby="profile-password-title">
          <div className="profileModal__backdrop" onClick={() => setPwModalOpen(false)} aria-hidden />
          <div
            className="profileModal__panel"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPwModalOpen(false)
            }}
          >
            <h2 id="profile-password-title" className="profileModal__title">Đổi mật khẩu</h2>
            <form className="profilePasswordForm" onSubmit={changePassword} noValidate>
              <PasswordField
                label="Mật khẩu hiện tại"
                value={pwForm.current}
                onChange={(value) => {
                  setPwErr((prev) => ({ ...(prev || {}), current: undefined }))
                  setPwForm((p) => ({ ...p, current: value }))
                }}
                autoComplete="current-password"
                required
                disabled={pwSaving}
                error={pwErr?.current || null}
              />
              <PasswordField
                label="Mật khẩu mới"
                value={pwForm.next}
                onChange={(value) => {
                  setPwErr((prev) => ({ ...(prev || {}), next: undefined }))
                  setPwForm((p) => ({ ...p, next: value }))
                }}
                autoComplete="new-password"
                required
                disabled={pwSaving}
                error={pwErr?.next || null}
              />
              <PasswordField
                label="Xác nhận mật khẩu mới"
                value={pwForm.confirm}
                onChange={(value) => {
                  setPwErr((prev) => ({ ...(prev || {}), confirm: undefined }))
                  setPwForm((p) => ({ ...p, confirm: value }))
                }}
                autoComplete="new-password"
                required
                disabled={pwSaving}
                error={pwErr?.confirm || null}
              />
              <p className="profilePasswordHint">Mật khẩu tối thiểu 6 ký tự.</p>
              <div className="profileModal__actions">
                <button type="submit" className="profileBtn profileBtn--primary" disabled={pwSaving}>
                  {pwSaving ? 'Đang đổi…' : 'Đổi mật khẩu'}
                </button>
                <button
                  type="button"
                  className="profileBtn profileBtn--ghost"
                  disabled={pwSaving}
                  onClick={() => {
                    setPwForm({ current: '', next: '', confirm: '' })
                    setPwErr(null)
                    setPwModalOpen(false)
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
