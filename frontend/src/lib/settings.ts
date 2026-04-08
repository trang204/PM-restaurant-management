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

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const d = await publicApiFetch<Partial<PublicSettings>>('/settings/public')
  return {
    restaurantName: d?.restaurantName ?? null,
    logoUrl: d?.logoUrl ?? null,
    bannerUrls: Array.isArray(d?.bannerUrls) ? d!.bannerUrls!.filter(Boolean) : [],
    banner: d?.banner ?? { enabled: true, mode: 'SLIDESHOW', showOnHome: true, showOnAuth: true },
    address: d?.address ?? null,
    phone: d?.phone ?? null,
    email: d?.email ?? null,
    openTime: d?.openTime ?? null,
    closeTime: d?.closeTime ?? null,
  }
}

