import { useEffect, useRef, useState } from 'react'
import { apiFetch, mediaUrl, storagePathFromMediaUrl } from '../../lib/api'
import './Settings.css'

function sliceTime(v) {
  if (v == null || v === '') return ''
  const s = String(v)
  return s.length >= 5 ? s.slice(0, 5) : s
}

/**
 * Danh sách ngân hàng Việt Nam — code là mã SePay dùng để gọi API QR & lấy logo.
 * Logo: https://qr.sepay.vn/assets/img/banklogo/{code}.png
 */
const VN_BANKS = [
  { code: 'MB',        name: 'MB Bank (Quân đội)' },
  { code: 'VCB',       name: 'Vietcombank' },
  { code: 'VBA',       name: 'Agribank' }, // Thường dùng VBA hoặc AGRIBANK, file của bạn là VBA.png
  { code: 'BIDV',      name: 'BIDV' },
  { code: 'ICB',       name: 'VietinBank' },
  { code: 'TCB',       name: 'Techcombank' },
  { code: 'ACB',       name: 'ACB' },
  { code: 'VPB',       name: 'VPBank' },
  { code: 'TPB',       name: 'TPBank' },
  { code: 'STB',       name: 'Sacombank' },
  { code: 'HDB',       name: 'HDBank' },
  { code: 'OCB',       name: 'OCB (Phương Đông)' },
  { code: 'MSB',       name: 'MSB (Hàng Hải)' },
  { code: 'SHB',       name: 'SHB' },
  { code: 'VIB',       name: 'VIB (Quốc tế)' },
  { code: 'EIB',       name: 'Eximbank' },
  { code: 'NAB',       name: 'Nam A Bank' },
  { code: 'LPB',       name: 'LPBank (Lộc Phát Việt Nam)' }, // Đã đổi tên mới
  { code: 'SEAB',      name: 'SeABank' },
  { code: 'ABB',       name: 'ABBANK' },
  { code: 'BAB',       name: 'Bac A Bank' },
  { code: 'KLB',       name: 'KienlongBank' },
  { code: 'BVB',       name: 'BaoVietBank' },
  { code: 'PGB',       name: 'PGBank' },
  { code: 'PVCB',      name: 'PVcomBank' }, // Sửa từ PVCOMBANK -> PVCB cho khớp file ảnh
  { code: 'VAB',       name: 'VietABank' },
  { code: 'VIETBANK',  name: 'VietBank' }, // Sửa từ VBB -> VIETBANK cho khớp file ảnh
  { code: 'NCB',       name: 'NCB (Quốc dân)' },
  { code: 'OCEANBANK', name: 'OceanBank' },
  { code: 'DOB',       name: 'DongA Bank' }, // Sửa từ DAB -> DOB cho khớp file ảnh
  { code: 'SGICB',     name: 'Saigonbank' }, // Sửa từ SAIGONBANK -> SGICB cho khớp file ảnh
  { code: 'GPB',       name: 'GPBank' },
  { code: 'CBB',       name: 'CB Bank (Xây dựng)' }, // Sửa từ CBBANK -> CBB cho khớp file ảnh
  { code: 'COOPBANK',  name: 'Co-opBank' },
  { code: 'CIMB',      name: 'CIMB Bank' },
  { code: 'WVN',       name: 'Woori Bank' }, // Sửa từ WOORI -> WVN cho khớp file ảnh
  { code: 'UOB',       name: 'UOB' },
  { code: 'HSBC',      name: 'HSBC Việt Nam' },
  { code: 'SCVN',      name: 'Standard Chartered VN' },
  { code: 'PBVN',      name: 'Public Bank VN' },
  { code: 'IVB',       name: 'Indovina Bank' }, // Sửa từ IBK -> IVB cho khớp file ảnh
  { code: 'KBHN',      name: 'Kookmin Bank HN' }, // Thêm theo file ảnh của bạn
  { code: 'KBHCM',     name: 'Kookmin Bank HCM' }, // Thêm theo file ảnh của bạn
  { code: 'HLBVN',     name: 'Hong Leong Bank' }, // Thêm theo file ảnh của bạn
  { code: 'CAKE',      name: 'CAKE by VPBank' },
  { code: 'UBANK',     name: 'Ubank by VPBank' },
  { code: 'TIMO',      name: 'Timo Bank' },
];

function logoUrl(code) {
  return `https://qr.sepay.vn/assets/img/banklogo/${code}.png`
}

function BankSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)

  const selected = VN_BANKS.find((b) => b.code === value) || null

  const filtered = search.trim()
    ? VN_BANKS.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.code.toLowerCase().includes(search.toLowerCase()),
      )
    : VN_BANKS

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(code) {
    onChange(code)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="bank-select" ref={wrapRef}>
      <button
        type="button"
        className="bank-select__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <img src={logoUrl(selected.code)} alt={selected.name} className="bank-select__logo" />
            <span className="bank-select__name">{selected.name}</span>
            <span className="bank-select__code">({selected.code})</span>
          </>
        ) : (
          <span className="bank-select__placeholder">— Chọn ngân hàng —</span>
        )}
        <span className="bank-select__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="bank-select__dropdown" role="listbox">
          <div className="bank-select__search-wrap">
            <input
              autoFocus
              className="bank-select__search"
              placeholder="Tìm ngân hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="bank-select__list">
            <li
              role="option"
              aria-selected={value === ''}
              className={`bank-select__item ${value === '' ? 'bank-select__item--active' : ''}`}
              onClick={() => select('')}
            >
              <span className="bank-select__item-placeholder">— Chưa chọn —</span>
            </li>
            {filtered.map((b) => (
              <li
                key={b.code}
                role="option"
                aria-selected={value === b.code}
                className={`bank-select__item ${value === b.code ? 'bank-select__item--active' : ''}`}
                onClick={() => select(b.code)}
              >
                <img src={logoUrl(b.code)} alt={b.name} className="bank-select__logo" />
                <span className="bank-select__item-name">{b.name}</span>
                <span className="bank-select__item-code">{b.code}</span>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="bank-select__empty">Không tìm thấy ngân hàng.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

const DEFAULT_FEATURES_JSON = JSON.stringify([
  { title: 'Đặt bàn dễ dàng', text: 'Chọn ngày, giờ và số khách — xác nhận nhanh, không cần gọi điện.', icon: 'calendar' },
  { title: 'Thực đơn rõ ràng', text: 'Xem món, giá và mô tả trước khi đến; gợi ý món phù hợp buổi tối.', icon: 'menu' },
  { title: 'Theo dõi lịch sử', text: 'Đăng nhập để xem các lần đặt trước và chi tiết đơn.', icon: 'history' },
], null, 2)

export default function Settings() {
  const [form, setForm] = useState({
    restaurantName: '',
    phone: '',
    email: '',
    address: '',
    openTime: '08:00',
    closeTime: '22:00',
    totalTables: '',
    paymentBankAccount: '',
    paymentBankCode: '',
    paymentTransferContent: 'Thanh toan dat ban {id}',
    paymentQrTemplate: 'compact',
  })
  const [homeForm, setHomeForm] = useState({
    heroEyebrow: 'Ẩm thực tinh tế · Đặt bàn trực tuyến',
    heroLead: 'Trải nghiệm đặt bàn hiện đại: xem thực đơn mọi lúc, giữ chỗ chỉ vài bước, và quản lý lịch sử ngay trên trình duyệt.',
    heroMeta: 'Phục vụ tận nơi · không gian ấm cúng',
    heroPanelTag: 'Hôm nay còn bàn',
    featuresTitle: 'Vì sao chọn chúng tôi',
    featuresDesc: 'Giao diện gọn, thao tác nhanh — phù hợp cả khách lẻ lẫn nhóm bạn.',
    ctaTitle: 'Sẵn sàng đặt bàn?',
    ctaText: 'Chỉ mất vài phút — chọn giờ và số khách phù hợp.',
    featuresJson: DEFAULT_FEATURES_JSON,
  })
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrls, setBannerUrls] = useState([])
  const [bannerEnabled, setBannerEnabled] = useState(true)
  const [bannerMode, setBannerMode] = useState('SLIDESHOW')
  const [showOnHome, setShowOnHome] = useState(true)
  const [showOnAuth, setShowOnAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [okMsg, setOkMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch('/admin/settings')
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
          paymentBankAccount: String(d.payment_bank_account ?? ''),
          paymentBankCode: String(d.payment_bank_code ?? ''),
          paymentTransferContent: String(d.payment_transfer_content ?? 'Thanh toan dat ban {id}'),
          paymentQrTemplate: String(d.payment_qr_template ?? 'compact'),
        })
        setHomeForm((prev) => ({
          heroEyebrow: d.hero_eyebrow ?? prev.heroEyebrow,
          heroLead: d.hero_lead ?? prev.heroLead,
          heroMeta: d.hero_meta ?? prev.heroMeta,
          heroPanelTag: d.hero_panel_tag ?? prev.heroPanelTag,
          featuresTitle: d.home_features_title ?? prev.featuresTitle,
          featuresDesc: d.home_features_desc ?? prev.featuresDesc,
          ctaTitle: d.home_cta_title ?? prev.ctaTitle,
          ctaText: d.home_cta_text ?? prev.ctaText,
          featuresJson: d.home_features_json ?? prev.featuresJson,
        }))
        const lu = d.logo_url != null ? String(d.logo_url) : ''
        setLogoUrl(lu ? mediaUrl(lu) : '')
        setBannerUrls(Array.isArray(d.banner_urls) ? d.banner_urls.map((x) => mediaUrl(String(x))) : [])
        setBannerEnabled(Boolean(d.banner_enabled ?? true))
        setBannerMode(String(d.banner_mode || 'SLIDESHOW').toUpperCase())
        setShowOnHome(Boolean(d.banner_show_on_home ?? true))
        setShowOnAuth(Boolean(d.banner_show_on_auth ?? true))
      })
      .catch(() => setErr('Không tải được cài đặt (cần quyền admin/nhân viên).'))
      .finally(() => setLoading(false))
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function onHomeChange(e) {
    const { name, value } = e.target
    setHomeForm((f) => ({ ...f, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setOkMsg(null)
    setSaving(true)
    try {
      await apiFetch('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          restaurant_name: form.restaurantName.trim() || null,
          banner_urls: bannerUrls.map((x) => storagePathFromMediaUrl(x)).filter(Boolean),
          banner_enabled: bannerEnabled,
          banner_mode: bannerMode,
          banner_show_on_home: showOnHome,
          banner_show_on_auth: showOnAuth,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          open_time: form.openTime || null,
          close_time: form.closeTime || null,
          total_tables: form.totalTables ? Number(form.totalTables) : null,
          payment_bank_account: form.paymentBankAccount.trim() || null,
          payment_bank_code: form.paymentBankCode.trim() || null,
          payment_transfer_content: form.paymentTransferContent.trim() || null,
          payment_qr_template: form.paymentQrTemplate.trim() || null,
          hero_eyebrow: homeForm.heroEyebrow.trim() || null,
          hero_lead: homeForm.heroLead.trim() || null,
          hero_meta: homeForm.heroMeta.trim() || null,
          hero_panel_tag: homeForm.heroPanelTag.trim() || null,
          home_features_title: homeForm.featuresTitle.trim() || null,
          home_features_desc: homeForm.featuresDesc.trim() || null,
          home_cta_title: homeForm.ctaTitle.trim() || null,
          home_cta_text: homeForm.ctaText.trim() || null,
          home_features_json: homeForm.featuresJson.trim() || null,
        }),
      })
      setOkMsg('Đã lưu cài đặt. Trang chủ sẽ cập nhật khi khách F5 lại trang.')
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

  async function onBannersChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setErr(null)
    setOkMsg(null)
    try {
      const token = localStorage.getItem('luxeat_token')
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const fd = new FormData()
      for (const f of files) fd.append('banners', f)
      const res = await fetch(`${base.replace(/\/$/, '')}/settings/banners`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const json = await res.json().catch(() => null)
      if (!json?.success) throw new Error(json?.error?.message || 'Upload lỗi')
      const urls = Array.isArray(json.data?.banner_urls) ? json.data.banner_urls : []
      setBannerUrls(urls.map((x) => mediaUrl(String(x))))
      setOkMsg('Đã cập nhật banner.')
    } catch (e2) {
      setErr(e2?.message || String(e2))
    } finally {
      e.target.value = ''
    }
  }

  async function removeBanner(url) {
    setErr(null)
    setOkMsg(null)
    try {
      const token = localStorage.getItem('luxeat_token')
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const res = await fetch(`${base.replace(/\/$/, '')}/settings/banners`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: storagePathFromMediaUrl(url) }),
      })
      const json = await res.json().catch(() => null)
      if (!json?.success) throw new Error(json?.error?.message || 'Xóa lỗi')
      const urls = Array.isArray(json.data?.banner_urls) ? json.data.banner_urls : []
      setBannerUrls(urls.map((x) => mediaUrl(String(x))))
      setOkMsg('Đã xóa banner.')
    } catch (e2) {
      setErr(e2?.message || String(e2))
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Cài đặt nhà hàng</h1>
        <p className="settings-page__subtitle">
          Cập nhật thông tin hiển thị trên website và khu quản trị. Chỉ tài khoản Admin mới sửa được.
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
          <div className="settings-field--full settings-payment">
            <span className="settings-payment__label">Thanh toán chuyển khoản (QR SePay)</span>
            <p className="settings-payment__hint">
              Khi nhân viên chọn &quot;QR Thanh toán CK&quot; cho đơn, hệ thống tạo ảnh QR từ SePay với thông tin dưới đây.
              Nội dung chuyển khoản hỗ trợ <code>{'{id}'}</code> (mã đơn) và <code>{'{amount}'}</code> (số tiền).
            </p>
            <div className="settings-card__grid" style={{ marginTop: 8 }}>
              <label className="settings-field">
                <span>Số tài khoản ngân hàng</span>
                <input
                  name="paymentBankAccount"
                  value={form.paymentBankAccount}
                  onChange={onChange}
                  placeholder="VD: 1234567890"
                />
              </label>
              <label className="settings-field">
                <span>Ngân hàng</span>
                <BankSelect
                  value={form.paymentBankCode}
                  onChange={(code) => setForm((f) => ({ ...f, paymentBankCode: code }))}
                />
              </label>
              <label className="settings-field settings-field--full">
                <span>Nội dung chuyển khoản</span>
                <input
                  name="paymentTransferContent"
                  value={form.paymentTransferContent}
                  onChange={onChange}
                  placeholder="VD: Thanh toan dat ban {id}"
                  maxLength={150}
                />
              </label>
              <label className="settings-field">
                <span>Template QR</span>
                <select name="paymentQrTemplate" value={form.paymentQrTemplate} onChange={onChange}>
                  <option value="compact">Compact (có logo ngân hàng)</option>
                  <option value="qronly">QR only (chỉ mã QR)</option>
                  <option value="">Mặc định</option>
                </select>
              </label>
            </div>
          </div>

          {/* ── Nội dung trang chủ ── */}
          <div className="settings-field--full settings-home-section">
            <span className="settings-home-section__label">Nội dung trang chủ</span>
            <p className="settings-home-section__hint">
              Chỉnh sửa các đoạn văn bản hiển thị trên trang chủ. Để trống sẽ dùng giá trị mặc định.
            </p>
            <div className="settings-card__grid" style={{ marginTop: 8 }}>
              <label className="settings-field settings-field--full">
                <span>Tiêu đề phụ (eyebrow)</span>
                <input
                  name="heroEyebrow"
                  value={homeForm.heroEyebrow}
                  onChange={onHomeChange}
                  placeholder="VD: Ẩm thực tinh tế · Đặt bàn trực tuyến"
                  maxLength={120}
                />
              </label>
              <label className="settings-field settings-field--full">
                <span>Đoạn giới thiệu (lead)</span>
                <textarea
                  name="heroLead"
                  value={homeForm.heroLead}
                  onChange={onHomeChange}
                  rows={3}
                  maxLength={400}
                  placeholder="VD: Trải nghiệm đặt bàn hiện đại..."
                  className="settings-textarea"
                />
              </label>
              <label className="settings-field">
                <span>Dòng meta phụ</span>
                <input
                  name="heroMeta"
                  value={homeForm.heroMeta}
                  onChange={onHomeChange}
                  placeholder="VD: Phục vụ tận nơi · không gian ấm cúng"
                  maxLength={120}
                />
              </label>
              <label className="settings-field">
                <span>Tag bảng bên phải</span>
                <input
                  name="heroPanelTag"
                  value={homeForm.heroPanelTag}
                  onChange={onHomeChange}
                  placeholder="VD: Hôm nay còn bàn"
                  maxLength={60}
                />
              </label>
              <label className="settings-field">
                <span>Tiêu đề section &quot;Vì sao chọn&quot;</span>
                <input
                  name="featuresTitle"
                  value={homeForm.featuresTitle}
                  onChange={onHomeChange}
                  placeholder="VD: Vì sao chọn chúng tôi"
                  maxLength={100}
                />
              </label>
              <label className="settings-field">
                <span>Mô tả section &quot;Vì sao chọn&quot;</span>
                <input
                  name="featuresDesc"
                  value={homeForm.featuresDesc}
                  onChange={onHomeChange}
                  placeholder="VD: Giao diện gọn, thao tác nhanh..."
                  maxLength={200}
                />
              </label>
              <label className="settings-field">
                <span>Tiêu đề CTA cuối trang</span>
                <input
                  name="ctaTitle"
                  value={homeForm.ctaTitle}
                  onChange={onHomeChange}
                  placeholder="VD: Sẵn sàng đặt bàn?"
                  maxLength={100}
                />
              </label>
              <label className="settings-field">
                <span>Mô tả CTA cuối trang</span>
                <input
                  name="ctaText"
                  value={homeForm.ctaText}
                  onChange={onHomeChange}
                  placeholder="VD: Chỉ mất vài phút..."
                  maxLength={200}
                />
              </label>
              <label className="settings-field settings-field--full">
                <span>
                  Các thẻ tính năng (JSON) —{' '}
                  <small style={{ color: '#888' }}>
                    Mảng gồm 3 object: <code>{`[{"title":"...","text":"...","icon":"calendar|menu|history"}]`}</code>
                  </small>
                </span>
                <textarea
                  name="featuresJson"
                  value={homeForm.featuresJson}
                  onChange={onHomeChange}
                  rows={8}
                  className="settings-textarea settings-textarea--mono"
                  spellCheck={false}
                />
              </label>
            </div>
          </div>

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

          <div className="settings-logo settings-field--full">
            <span className="settings-logo__label">Banner / Slideshow (Admin)</span>
            <div className="settings-logo__row">
              <label className="settings-logo__upload">
                <input type="file" accept="image/*" multiple onChange={onBannersChange} />
                <span>Tải banner (nhiều ảnh)</span>
              </label>
            </div>
            <div className="settings-bannerControls">
              <label className="settings-check">
                <input type="checkbox" checked={bannerEnabled} onChange={(e) => setBannerEnabled(e.target.checked)} /> Bật banner
              </label>
              <label className="settings-check">
                <input type="checkbox" checked={showOnHome} onChange={(e) => setShowOnHome(e.target.checked)} /> Hiển thị ở trang chủ
              </label>
              <label className="settings-check">
                <input type="checkbox" checked={showOnAuth} onChange={(e) => setShowOnAuth(e.target.checked)} /> Hiển thị ở trang đăng nhập
              </label>
              <label className="settings-select">
                <span>Chế độ</span>
                <select value={bannerMode} onChange={(e) => setBannerMode(e.target.value)}>
                  <option value="SLIDESHOW">Slideshow</option>
                  <option value="SINGLE">Một ảnh (ảnh đầu tiên)</option>
                </select>
              </label>
            </div>
            {bannerUrls.length ? (
              <div className="settings-bannerGrid">
                {bannerUrls.map((u) => (
                  <div key={storagePathFromMediaUrl(u)} className="settings-bannerTile">
                    <img src={u} alt="Banner" />
                    <button type="button" className="settings-bannerRemove" onClick={() => removeBanner(u)}>
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, opacity: 0.8 }}>Chưa có banner. Tải lên để hiển thị slideshow ở trang chủ.</p>
            )}
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
