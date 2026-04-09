import { publicApiFetch } from './api'

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
}

function normalizeBannerUrls(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  const s = String(raw).trim()
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1)
    if (!inner) return []
    return inner
      .split(',')
      .map((x) => x.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"').trim())
      .filter(Boolean)
  }
  if (s.startsWith('[')) {
    try {
      const j = JSON.parse(s) as unknown
      if (Array.isArray(j)) return j.map((x) => String(x).trim()).filter(Boolean)
    } catch {
      /* ignore */
    }
  }
  return s ? [s] : []
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const d = await publicApiFetch<Partial<PublicSettings>>('/settings/public')
  return {
    restaurantName: d?.restaurantName ?? null,
    logoUrl: d?.logoUrl ?? null,
    bannerUrls: normalizeBannerUrls(d?.bannerUrls),
    banner: d?.banner ?? { enabled: true, mode: 'SLIDESHOW', showOnHome: true, showOnAuth: true },
    address: d?.address ?? null,
    phone: d?.phone ?? null,
    email: d?.email ?? null,
    openTime: d?.openTime ?? null,
    closeTime: d?.closeTime ?? null,
  }
}

