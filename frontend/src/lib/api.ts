/**
 * @deprecated
 * This file is kept for backwards compatibility.
 * All symbols are now defined in src/apis/ and re-exported here.
 * Prefer importing from '../apis' (or '../../apis') going forward.
 */
export {
  // Core HTTP
  apiFetch,
  publicApiFetch,
  setToken,
  getToken,
  mediaUrl,
  storagePathFromMediaUrl,
  getApiOrigin,
  API_BASE,
  // Upload helpers
  uploadFoodImage,
  uploadUserAvatar,
  uploadTableImage,
  analyzeTableLayoutImage,
} from '../apis'

export type { ApiError, ApiResponse } from '../apis'
