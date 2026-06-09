// ─── Settings API ─────────────────────────────────────────────────────────────
import { apiFetch, publicApiFetch, getToken, API_BASE } from './base'

export type AdminSettings = {
  id?: number
  restaurant_name?: string | null
  logo_url?: string | null
  banner_urls?: string[] | null
  banner_enabled?: boolean | null
  banner_mode?: string | null
  banner_show_on_home?: boolean | null
  banner_show_on_auth?: boolean | null
  address?: string | null
  phone?: string | null
  email?: string | null
  open_time?: string | null
  close_time?: string | null
  payment_bank_account?: string | null
  payment_bank_code?: string | null
  payment_transfer_content?: string | null
  payment_qr_template?: string | null
  system_email?: string | null
  system_email_password?: string | null
  reservation_hold_duration?: number | null
  header_cta_label?: string | null
  header_cta_url?: string | null
  footer_tagline?: string | null
  footer_copyright?: string | null
  footer_links?: unknown[] | null
  social_links?: unknown[] | null
  total_tables?: number | null
  hero_eyebrow?: string | null
  hero_lead?: string | null
  hero_meta?: string | null
  hero_panel_tag?: string | null
  home_features_title?: string | null
  home_features_desc?: string | null
  home_cta_title?: string | null
  home_cta_text?: string | null
  home_features_json?: string | null
}

export type PublicSettings = {
  restaurantName: string | null
  logoUrl: string | null
  bannerUrls?: string[]
  banner?: {
    enabled?: boolean
    mode?: string
    showOnHome?: boolean
    showOnAuth?: boolean
  }
  address: string | null
  phone: string | null
  email: string | null
  openTime: string | null
  closeTime: string | null
  socialLinks?: {
    facebook?: string | null
    instagram?: string | null
    zalo?: string | null
  } | null
  footer?: {
    socials?: Array<{ label?: string; url?: string }> | null
  } | null
  home?: {
    heroEyebrow?: string | null
    heroLead?: string | null
    heroMeta?: string | null
    heroPanelTag?: string | null
    featuresTitle?: string | null
    featuresDesc?: string | null
    ctaTitle?: string | null
    ctaText?: string | null
    features?: Array<{ title: string; text: string; icon?: string }> | null
  } | null
}

export async function adminGetSettings(): Promise<AdminSettings> {
  return apiFetch<AdminSettings>('/admin/settings')
}

export async function adminUpdateSettings(payload: Partial<AdminSettings>): Promise<AdminSettings> {
  return apiFetch<AdminSettings>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function uploadSettingsLogo(file: File): Promise<{ logo_url: string }> {
  const token = getToken()
  const base = API_BASE.replace(/\/$/, '')
  const fd = new FormData()
  fd.append('logo', file)
  const res = await fetch(`${base}/settings/logo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = await res.json().catch(() => null)
  if (!json?.success) throw new Error(json?.error?.message || 'Upload lỗi')
  return json.data as { logo_url: string }
}

export async function uploadSettingsBanner(file: File): Promise<{ banner_url: string }> {
  const token = getToken()
  const base = API_BASE.replace(/\/$/, '')
  const fd = new FormData()
  fd.append('banner', file)
  const res = await fetch(`${base}/settings/banners`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const json = await res.json().catch(() => null)
  if (!json?.success) throw new Error(json?.error?.message || 'Upload lỗi')
  return json.data as { banner_url: string }
}

export async function deleteSettingsBanner(url: string): Promise<unknown> {
  return apiFetch<unknown>('/admin/settings/banners/delete', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export async function getPublicSettings(): Promise<PublicSettings> {
  return publicApiFetch<PublicSettings>('/settings/public')
}
