// ─── Central API barrel ───────────────────────────────────────────────────────
// Import from here everywhere in the app: import { apiFetch, login, ... } from '../apis'

// Core HTTP utilities (re-exported for backwards compatibility)
export {
  apiFetch,
  publicApiFetch,
  setToken,
  getToken,
  mediaUrl,
  storagePathFromMediaUrl,
  getApiOrigin,
  API_BASE,
} from './base'
export type { ApiError, ApiResponse } from './base'

// Domain modules
export * from './auth.api'
export * from './user.api'
export * from './menu.api'
export * from './table.api'
export * from './reservation.api'
export * from './order.api'
export * from './kitchen.api'
export * from './ingredient.api'
export * from './settings.api'
export * from './report.api'
